import { jsPDF } from 'jspdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getSecureDocumentUrl } from '../services/db';

function base64ToUint8Array(base64Data) {
  if (!base64Data || typeof base64Data !== 'string') return new Uint8Array(0);
  const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const cleanBase64 = base64.replace(/\s/g, '');
  const binaryString = window.atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function fetchBytesFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith('data:')) {
    return base64ToUint8Array(cleanUrl);
  }
  try {
    const resp = await fetch(cleanUrl);
    if (!resp.ok) {
      console.warn(`[PDF Dossier] Fetch failed with status ${resp.status} for ${cleanUrl}`);
      return null;
    }
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  } catch (err) {
    console.warn('[PDF Dossier] Fetch network error:', err);
    return null;
  }
}

function isPdfBytes(bytes, url = '') {
  if (bytes && bytes.length >= 4) {
    // Magic bytes '%PDF': 0x25, 0x50, 0x44, 0x46
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return true;
    }
  }
  const clean = (url || '').toLowerCase();
  return clean.startsWith('data:application/pdf') || clean.split('?')[0].endsWith('.pdf');
}

function convertImageToJpegBytes(urlOrData) {
  return new Promise((resolve) => {
    if (!urlOrData || typeof urlOrData !== 'string') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        resolve(base64ToUint8Array(dataUrl));
      } catch (err) {
        console.warn('[PDF Dossier] Canvas error converting image:', err);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn('[PDF Dossier] Image failed to load via Image element:', urlOrData.slice(0, 60));
      resolve(null);
    };
    img.src = urlOrData;
  });
}

const DOC_TYPE_LABELS = {
  pancard: 'PAN Card Proof',
  pan_card: 'PAN Card Proof',
  aadhaar_front: 'Aadhaar Card (Front Side)',
  aadhar_front: 'Aadhaar Card (Front Side)',
  aadhaar_back: 'Aadhaar Card (Back Side)',
  aadhar_back: 'Aadhaar Card (Back Side)',
  cheque: 'Bank Cheque / Passbook Copy',
  cancelled_cheque: 'Cancelled Cheque Copy',
  cancel_cheque: 'Cancelled Cheque Copy',
  client_master: 'Client Master List (CML)',
  cml_copy: 'Client Master List (CML)',
  signature: 'Client Signature Specimen',
  kyc_form: 'Signed KYC Application Form',
  nominee_doc: 'Nominee Identification Proof',
  demat_proof: 'Demat Holding / Account Statement',
  other_doc_1: 'Supporting Document 1',
  other_doc_2: 'Supporting Document 2'
};

function formatDocumentLabel(key) {
  if (DOC_TYPE_LABELS[key]) return DOC_TYPE_LABELS[key];
  return key
    .replace(/^doc_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function downloadCustomerPdf(customer) {
  const customerName = (customer.full_name || customer.name || 'Customer').trim();
  const safeName = customerName.replace(/[/\\?%*:|"<>]/g, '_');
  const cleanFileName = `${safeName}_Dossier.pdf`;

  // 1. Gather all attached documents
  let docsMap = {};
  if (customer.documents && typeof customer.documents === 'object') {
    docsMap = { ...customer.documents };
  }
  if (customer.customer_documents && Array.isArray(customer.customer_documents)) {
    customer.customer_documents.forEach((d) => {
      if (d.file_path) docsMap[d.document_type || 'document'] = d.file_path;
    });
  }
  let parsedAddress = null;
  if (customer.address && typeof customer.address === 'string' && customer.address.trim().startsWith('{')) {
    try {
      parsedAddress = JSON.parse(customer.address);
      if (parsedAddress && typeof parsedAddress === 'object') {
        Object.entries(parsedAddress).forEach(([k, v]) => {
          if (!k.startsWith('__') && v && typeof v === 'string' && v.trim() !== '') {
            if (!docsMap[k]) docsMap[k] = v;
          }
        });
      }
    } catch (_) {}
  }

  // 2. Resolve profit share percentage accurately (handles 0% without fallback to 40)
  let profitShare = 40;
  if (customer.profit_share_percentage !== undefined && customer.profit_share_percentage !== null && customer.profit_share_percentage !== '') {
    profitShare = Number(customer.profit_share_percentage);
  } else if (parsedAddress?.__meta?.profit_share_percentage !== undefined && parsedAddress.__meta.profit_share_percentage !== null && parsedAddress.__meta.profit_share_percentage !== '') {
    profitShare = Number(parsedAddress.__meta.profit_share_percentage);
  }

  // Filter valid entries
  const docEntries = Object.entries(docsMap).filter(
    ([k, v]) => !k.startsWith('__') && v && typeof v === 'string' && v.trim() !== ''
  );

  // 3. Build Cover Page using jsPDF
  const coverDoc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = coverDoc.internal.pageSize.getWidth();
  const pageHeight = coverDoc.internal.pageSize.getHeight();

  // Header Banner
  coverDoc.setFillColor(4, 47, 46); // #042F2E Dark Teal
  coverDoc.rect(0, 0, pageWidth, 26, 'F');

  // Gold accent stripe
  coverDoc.setFillColor(234, 179, 8); // #EAB308 Gold
  coverDoc.rect(0, 26, pageWidth, 1.5, 'F');

  coverDoc.setTextColor(255, 255, 255);
  coverDoc.setFontSize(16);
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.text('IPO KING — CLIENT DOSSIER & KYC RECORD', 14, 16);

  coverDoc.setFontSize(8.5);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(204, 251, 241);
  coverDoc.text(`CONFIDENTIAL CLIENT ARCHIVE  •  EXPORTED ON: ${new Date().toLocaleString('en-IN')}`, 14, 22);

  // Profile Card Container
  coverDoc.setDrawColor(203, 213, 225); // #CBD5E1
  coverDoc.setFillColor(248, 250, 252); // #F8FAFC
  coverDoc.roundedRect(14, 34, pageWidth - 28, 90, 3, 3, 'FD');

  coverDoc.setTextColor(15, 23, 42);
  coverDoc.setFontSize(14);
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.text(customerName, 20, 44);

  coverDoc.setFontSize(9);
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(15, 118, 110);
  coverDoc.text(`Customer No: #${customer.customer_no || 'N/A'}    |    Client Code: ${customer.code || 'N/A'}    |    Status: ${customer.kyc_status || 'Verified KYC'}`, 20, 50);

  // Divider
  coverDoc.setDrawColor(226, 232, 240);
  coverDoc.line(20, 54, pageWidth - 20, 54);

  // Profile Info Details (3 Columns)
  coverDoc.setFontSize(8.5);
  const col1X = 20;
  const col2X = 82;
  const col3X = 144;

  const aadhaarDisplay = customer.aadhaar_number
    ? customer.aadhaar_number.replace(/(\d{4})(?=\d)/g, '$1 ')
    : (customer.aadhar_number || customer.aadhar_card_number || '—');
  const dobDisplay = customer.birthdate
    ? new Date(customer.birthdate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (customer.dob || customer.date_of_birth || '—');

  // Col 1
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('PAN Number:', col1X, 61);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.text(customer.pan_number || '—', col1X + 24, 61);

  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('Aadhaar No:', col1X, 68);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.text(aadhaarDisplay, col1X + 24, 68);

  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('Birthdate:', col1X, 75);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.text(dobDisplay, col1X + 24, 75);

  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('DPID / BO:', col1X, 82);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.text(customer.dpid || '—', col1X + 24, 82);

  // Col 2
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('Bank Name:', col2X, 61);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.text(customer.bank_name || '—', col2X + 22, 61);

  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('Account No:', col2X, 68);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.text(customer.bank_account_no || '—', col2X + 22, 68);

  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('Mobile No:', col2X, 75);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.text(customer.mobile_number || '—', col2X + 22, 75);

  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('Email / Alt:', col2X, 82);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.text(customer.email || customer.phone_alternate || '—', col2X + 22, 82);

  // Col 3
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('Balance (₹):', col3X, 61);
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(16, 185, 129); // Green
  coverDoc.text(`₹ ${Number(customer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3X + 24, 61);

  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('Profit Share:', col3X, 68);
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(15, 118, 110);
  coverDoc.text(`${profitShare}% (Treasury: ${Math.max(0, 100 - profitShare)}%)`, col3X + 24, 68);

  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('Login ID:', col3X, 75);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.text(customer.login_id || '—', col3X + 24, 75);

  // Beneficiary Section in Card
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text('Beneficiary Account(s):', col1X, 94);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.text(customer.beneficiary_name || 'Primary Applicant Only', col1X + 40, 94);

  // Document Inventory Table Section
  coverDoc.setTextColor(15, 23, 42);
  coverDoc.setFontSize(11);
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.text('ATTACHED DOCUMENTS INVENTORY', 14, 134);

  coverDoc.setFontSize(8.5);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(100, 116, 139);
  coverDoc.text(`Total Attached Files: ${docEntries.length}`, pageWidth - 50, 134);

  // Table header
  coverDoc.setFillColor(241, 245, 249); // #F1F5F9
  coverDoc.rect(14, 138, pageWidth - 28, 8, 'F');
  coverDoc.setFont('helvetica', 'bold');
  coverDoc.setTextColor(51, 65, 85);
  coverDoc.text('#', 18, 143.5);
  coverDoc.text('DOCUMENT TYPE', 28, 143.5);
  coverDoc.text('STATUS & FORMAT', pageWidth - 54, 143.5);

  let currentY = 146;
  if (docEntries.length === 0) {
    coverDoc.setFont('helvetica', 'normal');
    coverDoc.setTextColor(148, 163, 184);
    coverDoc.text('No documents uploaded for this client profile.', 28, currentY + 10);
  } else {
    docEntries.forEach(([key, url], idx) => {
      coverDoc.setFont('helvetica', 'normal');
      coverDoc.setTextColor(15, 23, 42);
      coverDoc.text(String(idx + 1), 18, currentY + 5.5);

      const label = formatDocumentLabel(key);
      coverDoc.text(label, 28, currentY + 5.5);

      const isPdf = String(url).toLowerCase().includes('.pdf') || String(url).startsWith('data:application/pdf');
      coverDoc.setFont('helvetica', 'bold');
      coverDoc.setTextColor(isPdf ? 15 : 16, isPdf ? 118 : 149, isPdf ? 110 : 193);
      coverDoc.text(isPdf ? 'PDF Attachment' : 'Image Attachment', pageWidth - 54, currentY + 5.5);

      coverDoc.setDrawColor(241, 245, 249);
      coverDoc.line(14, currentY + 8, pageWidth - 14, currentY + 8);
      currentY += 8;
    });
  }

  // Footer Disclaimer
  coverDoc.setFontSize(8);
  coverDoc.setFont('helvetica', 'normal');
  coverDoc.setTextColor(148, 163, 184);
  coverDoc.text('This PDF dossier contains official KYC documents and application proofs. IPO King Portal Secure Archive.', 14, pageHeight - 12);

  // 4. Load Cover Page into master pdf-lib Document
  const masterPdf = await PDFDocument.create();
  const fontRegular = await masterPdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await masterPdf.embedFont(StandardFonts.HelveticaBold);

  const coverBuffer = coverDoc.output('arraybuffer');
  const coverLoaded = await PDFDocument.load(coverBuffer);
  const coverPages = await masterPdf.copyPages(coverLoaded, coverLoaded.getPageIndices());
  coverPages.forEach((p) => masterPdf.addPage(p));

  // 5. Merge all attached document pages (PDF pages copied 1:1, Images converted & embedded)
  for (let i = 0; i < docEntries.length; i++) {
    const [key, rawUrl] = docEntries[i];
    const docLabel = formatDocumentLabel(key);

    let resolvedUrl = rawUrl;
    try {
      resolvedUrl = await getSecureDocumentUrl(rawUrl, 3600);
    } catch (_) {}

    const bytes = await fetchBytesFromUrl(resolvedUrl);

    if (bytes && isPdfBytes(bytes, resolvedUrl)) {
      // It is a PDF Document! Copy all pages directly
      try {
        const attachedPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pageIndices = attachedPdf.getPageIndices();
        const copiedPages = await masterPdf.copyPages(attachedPdf, pageIndices);
        copiedPages.forEach((cp) => masterPdf.addPage(cp));
      } catch (pdfErr) {
        console.error(`[PDF Dossier] Error loading attached PDF for ${docLabel}:`, pdfErr);
        // Fallback page
        const page = masterPdf.addPage([595.28, 841.89]);
        page.drawRectangle({
          x: 0,
          y: 841.89 - 42,
          width: 595.28,
          height: 42,
          color: rgb(0.02, 0.25, 0.24)
        });
        page.drawText(`IPO KING — ${docLabel.toUpperCase()}`, {
          x: 24,
          y: 841.89 - 28,
          size: 13,
          font: fontBold,
          color: rgb(1, 1, 1)
        });
        page.drawText(`[Attached PDF Document: ${resolvedUrl.slice(0, 90)}]`, {
          x: 24,
          y: 740,
          size: 10,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.3)
        });
      }
    } else {
      // It is an Image or Data URL
      let imgJpegBytes = null;
      if (bytes && bytes[0] === 0xFF && bytes[1] === 0xD8) {
        imgJpegBytes = bytes;
      } else {
        imgJpegBytes = await convertImageToJpegBytes(resolvedUrl);
      }

      if (imgJpegBytes) {
        try {
          const embeddedImg = await masterPdf.embedJpg(imgJpegBytes);
          const page = masterPdf.addPage([595.28, 841.89]); // A4 in points
          const pWidth = 595.28;
          const pHeight = 841.89;

          // Header Banner
          page.drawRectangle({
            x: 0,
            y: pHeight - 44,
            width: pWidth,
            height: 44,
            color: rgb(0.02, 0.25, 0.24)
          });
          page.drawText(`IPO KING — ${docLabel.toUpperCase()}`, {
            x: 24,
            y: pHeight - 28,
            size: 13,
            font: fontBold,
            color: rgb(1, 1, 1)
          });
          page.drawText(`Client: ${customerName} (#${customer.customer_no || 'N/A'})`, {
            x: pWidth - 220,
            y: pHeight - 28,
            size: 10,
            font: fontRegular,
            color: rgb(0.9, 0.9, 0.9)
          });

          // Scale and center image
          const maxW = pWidth - 48;
          const maxH = pHeight - 74;
          const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height, 1);
          const finalW = embeddedImg.width * scale;
          const finalH = embeddedImg.height * scale;
          const xPos = (pWidth - finalW) / 2;
          const yPos = 20 + (maxH - finalH) / 2;

          page.drawImage(embeddedImg, {
            x: xPos,
            y: yPos,
            width: finalW,
            height: finalH
          });
        } catch (imgErr) {
          console.error(`[PDF Dossier] Error embedding image for ${docLabel}:`, imgErr);
        }
      } else {
        // Fallback page if image could not be loaded
        const page = masterPdf.addPage([595.28, 841.89]);
        page.drawRectangle({
          x: 0,
          y: 841.89 - 42,
          width: 595.28,
          height: 42,
          color: rgb(0.02, 0.25, 0.24)
        });
        page.drawText(`IPO KING — ${docLabel.toUpperCase()}`, {
          x: 24,
          y: 841.89 - 28,
          size: 13,
          font: fontBold,
          color: rgb(1, 1, 1)
        });
        page.drawText(`Attached File Reference:`, {
          x: 24,
          y: 750,
          size: 11,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2)
        });
        page.drawText(String(rawUrl).slice(0, 80), {
          x: 24,
          y: 730,
          size: 9,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4)
        });
      }
    }
  }

  // 6. Save and Download
  const finalPdfBytes = await masterPdf.save();
  const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = cleanFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

export function downloadPayoutVoucherPdf(row) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Banner
  doc.setFillColor(37, 99, 235); // #2563EB
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('IPO KING — Profit Distribution & Payout Voucher', 14, 15);

  // Subtitle & Timestamp
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Voucher Ref: ${row.txn_id}`, 14, 34);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}   |   Status: ${row.status || 'Verified & Settled'}`, 14, 40);

  // Table
  const items = [
    { label: 'Transaction Reference ID', value: row.txn_id },
    { label: 'Customer Name', value: row.customer },
    { label: 'Beneficiary Account', value: row.beneficiary },
    { label: 'Distribution Type', value: row.txn_type },
    { label: 'Gross Realized Gain', value: row.gross_amount },
    { label: `Customer Profit Share${row.client_profit_pct ? ` (${row.client_profit_pct}%)` : ''}`, value: row.profit_40 },
    { label: '10% TDS Withheld', value: row.tds_10 },
    { label: 'Net Settled Payout (₹)', value: row.net_payout },
    { label: 'Audit Status', value: 'Verified & Tax Compliant' }
  ];

  let currentY = 48;
  const marginX = 14;
  const tableWidth = pageWidth - marginX * 2;

  // Header Row
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, tableWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('PARAMETER', marginX + 4, currentY + 5.5);
  doc.text('SETTLEMENT DETAILS / AMOUNT', marginX + 80, currentY + 5.5);

  currentY += 8;

  items.forEach((item, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, tableWidth, 8, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(item.label, marginX + 4, currentY + 5.5);

    doc.setFont('helvetica', idx >= 4 ? 'bold' : 'normal');
    doc.setTextColor(idx === 7 ? 37 : 15, idx === 7 ? 99 : 23, idx === 7 ? 235 : 42);
    doc.text(String(item.value), marginX + 80, currentY + 5.5);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY + 8, marginX + tableWidth, currentY + 8);

    currentY += 8;
  });

  // Footer Note
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated voucher valid for audit and financial records.', pageWidth / 2, pageHeight - 12, { align: 'center' });

  const cleanFileName = `voucher_${row.txn_id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
  doc.save(cleanFileName);
}

export function downloadCustomerPassbookPdf(customer, entries = []) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const tableWidth = pageWidth - marginX * 2;

  // Header Banner
  doc.setFillColor(4, 47, 46); // Hero-11 Deep Teal
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(250, 247, 242);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('IPO KING — Customer Statement & Passbook Ledger', marginX, 15);

  // Customer Summary Card
  const custName = (customer.full_name || customer.name || 'Customer').trim();
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Account Holder: ${custName}`, marginX, 33);

  const aadhaarDisplay = customer.aadhaar_number ? customer.aadhaar_number.replace(/(\d{4})(?=\d)/g, '$1 ') : (customer.aadhar_number || '—');
  const dobDisplay = customer.birthdate ? new Date(customer.birthdate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (customer.dob || '—');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Customer ID: #${customer.customer_no || '—'}   |   Code: ${customer.code || '—'}   |   PAN: ${customer.pan_number || '—'}   |   Aadhaar: ${aadhaarDisplay}   |   DOB: ${dobDisplay}`, marginX, 39);
  doc.text(`Bank: ${customer.bank_name || '—'}   |   A/C: ${customer.bank_account_no || '—'}   |   DPID: ${customer.dpid || '—'}   |   Available Balance: Rs. ${Number(customer.balance || 0).toLocaleString('en-IN')}`, marginX, 45);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(marginX, 49, marginX + tableWidth, 49);

  let currentY = 54;

  // Table Headers
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, tableWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text('DATE', marginX + 3, currentY + 5.5);
  doc.text('IPO / TRANSACTION DETAILS', marginX + 28, currentY + 5.5);
  doc.text('TYPE', marginX + 90, currentY + 5.5);
  doc.text('CREDIT (RS)', marginX + 135, currentY + 5.5);
  doc.text('DEBIT (RS)', marginX + 162, currentY + 5.5);

  currentY += 8;

  if (!entries || entries.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('No historical transaction records found for this account.', marginX + 4, currentY + 10);
  } else {
    entries.forEach((item, idx) => {
      if (currentY > pageHeight - 25) {
        doc.addPage();
        currentY = 20;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, currentY, tableWidth, 7, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      const dStr = item.date ? new Date(item.date).toLocaleDateString('en-IN') : '—';
      doc.text(dStr, marginX + 3, currentY + 4.8);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(item.scrip || 'IPO Offering').substring(0, 32), marginX + 28, currentY + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(String(item.type || '—').substring(0, 24), marginX + 90, currentY + 4.8);

      // Credit (Green)
      doc.setFont('helvetica', 'bold');
      if (item.credit > 0) {
        doc.setTextColor(16, 185, 129);
        doc.text(`+Rs. ${item.credit.toLocaleString('en-IN')}`, marginX + 135, currentY + 4.8);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', marginX + 135, currentY + 4.8);
      }

      // Debit (Red)
      if (item.debit > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`-Rs. ${item.debit.toLocaleString('en-IN')}`, marginX + 162, currentY + 4.8);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', marginX + 162, currentY + 4.8);
      }

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(marginX, currentY + 7, marginX + tableWidth, currentY + 7);

      currentY += 7;
    });
  }

  // Footer Note
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Computer-generated passbook statement. Valid for tax audit and banking reconciliation.', pageWidth / 2, pageHeight - 10, { align: 'center' });

  const cleanFileName = `passbook_${custName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
  doc.save(cleanFileName);
}

export function downloadJainamStcgPdf(stcgRows = [], summary = {}) {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape format for wide financial table
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const tableWidth = pageWidth - marginX * 2;

  // Header Banner
  doc.setFillColor(4, 47, 46); // #042F2E Deep Imperial Teal
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(250, 247, 242);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('IPO KING — Short-Term Capital Gains (STCG) P&L Statement', marginX, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(204, 251, 241);
  doc.text(`Jainam Format Tax & Audit Report   |   Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - marginX, 14, { align: 'right' });

  // Summary Metrics Banner
  let currentY = 28;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, currentY, tableWidth, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, currentY, tableWidth, 14, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const totalBuy = summary.totalBuyValue || 0;
  const totalSell = summary.totalSellTurnover || 0;
  const totalGrossStcg = summary.totalGrossStcg || 0;
  const totalClient40 = summary.totalClientProfit || 0;
  const totalTds10 = summary.totalTds || 0;
  const totalNet = summary.totalNetPayout || 0;

  doc.text(`Total Buy Value: Rs. ${totalBuy.toLocaleString('en-IN')}`, marginX + 6, currentY + 8.5);
  doc.text(`Total Sell Turnover: Rs. ${totalSell.toLocaleString('en-IN')}`, marginX + 55, currentY + 8.5);
  doc.text(`Gross STCG Gain: Rs. ${totalGrossStcg.toLocaleString('en-IN')}`, marginX + 115, currentY + 8.5);
  doc.text(`Client Share: Rs. ${totalClient40.toLocaleString('en-IN')}`, marginX + 175, currentY + 8.5);
  doc.text(`10% TDS: Rs. ${totalTds10.toLocaleString('en-IN')}`, marginX + 225, currentY + 8.5);

  currentY += 18;

  // Table Headers
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, tableWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  doc.text('CLIENT NAME', marginX + 3, currentY + 5.5);
  doc.text('PAN', marginX + 42, currentY + 5.5);
  doc.text('IPO SCRIP', marginX + 66, currentY + 5.5);
  doc.text('QTY', marginX + 115, currentY + 5.5);
  doc.text('BUY VAL', marginX + 128, currentY + 5.5);
  doc.text('SELL VAL', marginX + 155, currentY + 5.5);
  doc.text('GROSS STCG', marginX + 185, currentY + 5.5);
  doc.text('CLIENT SHARE', marginX + 215, currentY + 5.5);
  doc.text('10% TDS', marginX + 242, currentY + 5.5);
  doc.text('NET PAYOUT', marginX + 264, currentY + 5.5);

  currentY += 8;

  stcgRows.forEach((row, idx) => {
    if (currentY > pageHeight - 20) {
      doc.addPage('l', 'a4');
      currentY = 16;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, tableWidth, 6.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    doc.text(String(row.client_name || 'Customer').substring(0, 24), marginX + 3, currentY + 4.5);
    doc.text(String(row.pan || '—'), marginX + 42, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text(String(row.scrip || 'IPO Offering').substring(0, 28), marginX + 66, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.text(String(row.qty || 1), marginX + 115, currentY + 4.5);
    doc.text(`Rs. ${(row.buy_value || 0).toLocaleString('en-IN')}`, marginX + 128, currentY + 4.5);
    doc.text(`Rs. ${(row.sell_turnover || 0).toLocaleString('en-IN')}`, marginX + 155, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${(row.gross_stcg || 0).toLocaleString('en-IN')}`, marginX + 185, currentY + 4.5);

    doc.setTextColor(217, 119, 6);
    doc.text(`Rs. ${(row.client_40 || 0).toLocaleString('en-IN')}`, marginX + 215, currentY + 4.5);

    doc.setTextColor(220, 38, 38);
    doc.text(`Rs. ${(row.tds_10 || 0).toLocaleString('en-IN')}`, marginX + 242, currentY + 4.5);

    doc.setTextColor(13, 148, 136);
    doc.text(`Rs. ${(row.net_payout || 0).toLocaleString('en-IN')}`, marginX + 264, currentY + 4.5);

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY + 6.5, marginX + tableWidth, currentY + 6.5);

    currentY += 6.5;
  });

  // Footer Note
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Jainam Format Short-Term Capital Gains (STCG) Tax Computation Report. Verified & Audited.', pageWidth / 2, pageHeight - 8, { align: 'center' });

  const cleanFileName = `jainam_stcg_report_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(cleanFileName);
}

export function downloadCustomerJainamStcgPdf(customerInfo = {}, allStcgRows = []) {
  const custName = customerInfo.customer || customerInfo.client_name || customerInfo.full_name || 'Customer';
  const custPan = customerInfo.pan || customerInfo.pan_number || '—';
  const custBank = customerInfo.bank_name || '—';
  const custAccount = customerInfo.bank_account || customerInfo.bank_account_no || '—';
  const custSharePct = !isNaN(Number(customerInfo.client_profit_pct ?? customerInfo.profit_share_percentage)) ? Number(customerInfo.client_profit_pct ?? customerInfo.profit_share_percentage) : 40;

  // Filter all records for this specific customer
  const targetRows = allStcgRows.filter(r => {
    if (custPan && custPan !== '—' && r.pan && r.pan.toUpperCase() === custPan.toUpperCase()) return true;
    if (r.client_name && r.client_name.toLowerCase().trim() === custName.toLowerCase().trim()) return true;
    if (customerInfo.customer_id && String(r.customer_id) === String(customerInfo.customer_id)) return true;
    return false;
  });

  const rowsToUse = targetRows.length > 0 ? targetRows : [customerInfo];

  const totalBuy = rowsToUse.reduce((sum, r) => sum + (Number(r.buy_value) || 0), 0);
  const totalSell = rowsToUse.reduce((sum, r) => sum + (Number(r.sell_turnover) || 0), 0);
  const totalGrossStcg = rowsToUse.reduce((sum, r) => {
    if (r.gross_stcg !== undefined) return sum + (Number(r.gross_stcg) || 0);
    const num = parseFloat(String(r.gross_amount || 0).replace(/[^0-9.-]/g, '')) || 0;
    return sum + num;
  }, 0);
  const totalClientShare = rowsToUse.reduce((sum, r) => {
    if (r.client_40 !== undefined) return sum + (Number(r.client_40) || 0);
    const num = parseFloat(String(r.profit_40 || 0).replace(/[^0-9.-]/g, '')) || 0;
    return sum + num;
  }, 0);
  const totalTds10 = rowsToUse.reduce((sum, r) => {
    if (typeof r.tds_10 === 'number') return sum + r.tds_10;
    const num = parseFloat(String(r.tds_10 || 0).replace(/[^0-9.-]/g, '')) || 0;
    return sum + num;
  }, 0);
  const totalNet = rowsToUse.reduce((sum, r) => {
    if (typeof r.net_payout === 'number') return sum + r.net_payout;
    const num = parseFloat(String(r.net_payout || 0).replace(/[^0-9.-]/g, '')) || 0;
    return sum + num;
  }, 0);

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const tableWidth = pageWidth - marginX * 2;

  // Header Banner (Deep Imperial Teal)
  doc.setFillColor(4, 47, 46);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(250, 247, 242);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`IPO KING — Customer P&L & STCG Statement (Jainam Style)`, marginX, 14);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(204, 251, 241);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}   |   Tax Audit Compliant`, pageWidth - marginX, 14, { align: 'right' });

  // Customer Profile Card
  let currentY = 26;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, currentY, tableWidth, 16, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, currentY, tableWidth, 16, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`CLIENT: ${custName.toUpperCase()}`, marginX + 5, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`PAN: ${custPan}   |   Bank: ${custBank}   |   A/C: ${custAccount}`, marginX + 5, currentY + 12);
  doc.text(`Agreed Profit Share: ${custSharePct}% Client   |   Total IPO Deals: ${rowsToUse.length}`, pageWidth - marginX - 5, currentY + 6.5, { align: 'right' });
  doc.text(`Status: Verified & Tax Audited`, pageWidth - marginX - 5, currentY + 12, { align: 'right' });

  // Financial Summary Strip
  currentY += 19;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, currentY, tableWidth, 12, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text(`Total Buy: Rs. ${totalBuy.toLocaleString('en-IN')}`, marginX + 5, currentY + 7.5);
  doc.text(`Total Turnover: Rs. ${totalSell.toLocaleString('en-IN')}`, marginX + 52, currentY + 7.5);
  doc.text(`Gross STCG Gain: Rs. ${totalGrossStcg.toLocaleString('en-IN')}`, marginX + 112, currentY + 7.5);
  doc.text(`Client Share (${custSharePct}%): Rs. ${totalClientShare.toLocaleString('en-IN')}`, marginX + 172, currentY + 7.5);
  doc.text(`10% TDS: Rs. ${totalTds10.toLocaleString('en-IN')}`, marginX + 228, currentY + 7.5);

  currentY += 16;

  // Table Headers
  doc.setFillColor(4, 47, 46);
  doc.rect(marginX, currentY, tableWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  doc.text('SR', marginX + 3, currentY + 5.5);
  doc.text('IPO SCRIP / OFFERING', marginX + 12, currentY + 5.5);
  doc.text('QTY (LOTS)', marginX + 75, currentY + 5.5);
  doc.text('BUY VAL', marginX + 105, currentY + 5.5);
  doc.text('SELL VAL', marginX + 135, currentY + 5.5);
  doc.text('GROSS STCG', marginX + 168, currentY + 5.5);
  doc.text('CLIENT SHARE', marginX + 198, currentY + 5.5);
  doc.text('10% TDS', marginX + 228, currentY + 5.5);
  doc.text('NET PAYOUT', marginX + 252, currentY + 5.5);

  currentY += 8;

  rowsToUse.forEach((row, idx) => {
    if (currentY > pageHeight - 20) {
      doc.addPage('l', 'a4');
      currentY = 16;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, tableWidth, 7, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    doc.text(String(idx + 1), marginX + 3, currentY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(String(row.scrip || row.ipo_name || row.txn_type || 'IPO Offering').substring(0, 34), marginX + 12, currentY + 5);

    doc.setFont('helvetica', 'normal');
    const lotsText = row.lots ? `${row.qty} sh (${row.lots}L)` : `${row.qty || '—'}`;
    doc.text(String(lotsText), marginX + 75, currentY + 5);
    doc.text(`Rs. ${(row.buy_value || 0).toLocaleString('en-IN')}`, marginX + 105, currentY + 5);
    doc.text(`Rs. ${(row.sell_turnover || 0).toLocaleString('en-IN')}`, marginX + 135, currentY + 5);

    const grossNum = row.gross_stcg !== undefined ? row.gross_stcg : (parseFloat(String(row.gross_amount || 0).replace(/[^0-9.-]/g, '')) || 0);
    const clientNum = row.client_40 !== undefined ? row.client_40 : (parseFloat(String(row.profit_40 || 0).replace(/[^0-9.-]/g, '')) || 0);
    const tdsNum = row.tds_10 !== undefined ? (typeof row.tds_10 === 'number' ? row.tds_10 : parseFloat(String(row.tds_10).replace(/[^0-9.-]/g, '')) || 0) : 0;
    const netNum = row.net_payout !== undefined ? (typeof row.net_payout === 'number' ? row.net_payout : parseFloat(String(row.net_payout).replace(/[^0-9.-]/g, '')) || 0) : 0;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${grossNum.toLocaleString('en-IN')}`, marginX + 168, currentY + 5);

    doc.setTextColor(217, 119, 6);
    doc.text(`Rs. ${clientNum.toLocaleString('en-IN')}`, marginX + 198, currentY + 5);

    doc.setTextColor(220, 38, 38);
    doc.text(`Rs. ${tdsNum.toLocaleString('en-IN')}`, marginX + 228, currentY + 5);

    doc.setTextColor(13, 148, 136);
    doc.text(`Rs. ${netNum.toLocaleString('en-IN')}`, marginX + 252, currentY + 5);

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY + 7, marginX + tableWidth, currentY + 7);

    currentY += 7;
  });

  // Table Total Summary Row
  if (rowsToUse.length > 0) {
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, currentY, tableWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text('TOTAL AUDITED SETTLEMENT', marginX + 12, currentY + 5.5);
    doc.text(`Rs. ${totalBuy.toLocaleString('en-IN')}`, marginX + 105, currentY + 5.5);
    doc.text(`Rs. ${totalSell.toLocaleString('en-IN')}`, marginX + 135, currentY + 5.5);
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${totalGrossStcg.toLocaleString('en-IN')}`, marginX + 168, currentY + 5.5);
    doc.setTextColor(217, 119, 6);
    doc.text(`Rs. ${totalClientShare.toLocaleString('en-IN')}`, marginX + 198, currentY + 5.5);
    doc.setTextColor(220, 38, 38);
    doc.text(`Rs. ${totalTds10.toLocaleString('en-IN')}`, marginX + 228, currentY + 5.5);
    doc.setTextColor(13, 148, 136);
    doc.text(`Rs. ${totalNet.toLocaleString('en-IN')}`, marginX + 252, currentY + 5.5);
  }

  // Footer Note
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Jainam Format Short-Term Capital Gains (STCG) P&L Statement. Verified, Audited & Digitally Generated by IPO KING.', pageWidth / 2, pageHeight - 7, { align: 'center' });

  const cleanName = custName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cleanFileName = `jainam_stcg_statement_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(cleanFileName);
}

/**
 * Generates an official Cash Withdrawal Payment Voucher PDF
 */
export function downloadCashWithdrawalReceiptPdf(customer = {}, withdrawal = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const customerName = customer.full_name || customer.name || 'Valued Customer';
  const panNo = customer.pan_number || 'N/A';
  const customerNo = customer.customer_no || customer.code || 'N/A';
  const mobile = customer.mobile_number || 'N/A';
  const refNo = withdrawal.reference_no || `CW-${Date.now().toString().slice(-6)}`;
  const dateStr = withdrawal.withdrawal_date || new Date().toISOString().slice(0, 10);
  const amount = Number(withdrawal.amount) || 0;
  const prevBal = Number(withdrawal.previous_balance) || 0;
  const newBal = Number(withdrawal.new_balance) !== undefined ? Number(withdrawal.new_balance) : Math.max(0, prevBal - amount);
  const remarks = withdrawal.remarks || 'Cash withdrawal payout against customer balance';

  // Header Banner - Forest / Teal Enterprise Theme
  doc.setFillColor(15, 118, 110); // #0F766E
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('IPO KING — Cash Payment & Withdrawal Voucher', 14, 15);

  // Subtitle & Metadata
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Voucher Ref: ${refNo}`, 14, 34);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date of Withdrawal: ${dateStr}   |   Mode: Cash   |   Status: Paid & Settled`, 14, 40);

  // Table items
  const items = [
    { label: 'Customer Full Name', value: customerName },
    { label: 'Customer ID / No.', value: customerNo },
    { label: 'PAN Card Number', value: panNo },
    { label: 'Contact Mobile', value: mobile },
    { label: 'Bank Name & A/c', value: `${customer.bank_name || 'Bank'} - ${customer.bank_account_no || 'N/A'}` },
    { label: 'Previous Available Balance', value: `Rs. ${prevBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { label: 'Cash Amount Withdrawn / Paid', value: `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, highlight: true },
    { label: 'Closing Available Balance', value: `Rs. ${newBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { label: 'Remarks / Purpose', value: remarks },
    { label: 'Audit Verification', value: 'Digitally Recorded & Verified via IPO KING' }
  ];

  let currentY = 48;
  const marginX = 14;
  const tableWidth = pageWidth - marginX * 2;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, tableWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('TRANSACTION PARTICULARS', marginX + 4, currentY + 5.5);
  doc.text('SETTLEMENT DETAILS / AMOUNT', marginX + 80, currentY + 5.5);

  currentY += 8;

  items.forEach((item, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, tableWidth, 8, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(item.label, marginX + 4, currentY + 5.5);

    if (item.highlight) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 118, 110); // Emerald Green
    } else if (idx === 7) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    }

    doc.text(String(item.value), marginX + 80, currentY + 5.5);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY + 8, marginX + tableWidth, currentY + 8);

    currentY += 8;
  });

  // Receipt Acknowledgement Declaration
  currentY += 12;
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, currentY, tableWidth, 18, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, currentY, tableWidth, 18, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Received in cash the sum of Rs. ${amount.toLocaleString('en-IN')} (Rupees ${amount.toLocaleString('en-IN')} only) towards`,
    marginX + 4,
    currentY + 6
  );
  doc.text(
    `customer balance withdrawal. All demat ledger accounts and balances stand adjusted accordingly.`,
    marginX + 4,
    currentY + 12
  );

  // Signature Blocks
  currentY += 34;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  // Left: Customer Signature
  doc.line(marginX + 10, currentY, marginX + 70, currentY);
  doc.text('Customer / Recipient Signature', marginX + 12, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`(${customerName})`, marginX + 12, currentY + 9);

  // Right: Cashier Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.line(pageWidth - marginX - 70, currentY, pageWidth - marginX - 10, currentY);
  doc.text('Authorized Cashier / Manager', pageWidth - marginX - 68, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('(IPO KING Cash Operations)', pageWidth - marginX - 68, currentY + 9);

  // Footer Note
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is an official payment voucher generated by IPO KING. Retain for tax & demat accounting records.',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  const cleanCust = customerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `cash_withdrawal_${cleanCust}_${refNo}.pdf`;
  doc.save(fileName);
}


