import { jsPDF } from 'jspdf';

const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') {
      resolve(null);
      return;
    }
    if (url.startsWith('data:image')) {
      resolve(url);
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
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (_) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export async function downloadCustomerPdf(customer) {
  const customerName = (customer.full_name || customer.name || 'Customer').trim();
  const cleanFileName = `${customerName.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;

  // Gather documents
  let docsMap = {};
  if (customer.documents && typeof customer.documents === 'object') {
    docsMap = { ...customer.documents };
  }
  if (customer.customer_documents && Array.isArray(customer.customer_documents)) {
    customer.customer_documents.forEach(d => {
      if (d.file_path) docsMap[d.document_type || 'document'] = d.file_path;
    });
  }

  const entries = Object.entries(docsMap).filter(([_, url]) => url && typeof url === 'string' && url.trim() !== '');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Header Banner
  pdf.setFillColor(37, 99, 235); // #2563EB
  pdf.rect(0, 0, pageWidth, 22, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text('IPO KING — Customer Document Dossier', 14, 14);

  // Customer Summary
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Customer Name: ${customerName}`, 14, 32);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Customer No: ${customer.customer_no || '—'}   |   Code: ${customer.code || '—'}   |   PAN: ${customer.pan_number || '—'}`, 14, 39);
  pdf.text(`Bank: ${customer.bank_name || '—'}   |   A/C: ${customer.bank_account_no || '—'}   |   DPID: ${customer.dpid || '—'}   |   Mobile: ${customer.mobile_number || '—'}`, 14, 45);

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(14, 49, pageWidth - 14, 49);

  if (entries.length === 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(148, 163, 184);
    pdf.text('No document images uploaded for this customer.', 14, 62);
    pdf.save(cleanFileName);
    return;
  }

  let isFirstPage = true;

  for (let index = 0; index < entries.length; index++) {
    const [docType, url] = entries[index];
    const formatLabel = docType.replace(/_/g, ' ').toUpperCase();

    if (!isFirstPage) {
      pdf.addPage();
    }
    isFirstPage = false;

    const startY = isFirstPage ? 55 : 20;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(37, 99, 235);
    pdf.text(`Document ${index + 1}: ${formatLabel}`, 14, startY);

    const base64Img = await loadImageAsBase64(url);

    if (base64Img) {
      try {
        const imgProps = pdf.getImageProperties(base64Img);
        const maxW = pageWidth - 28;
        const maxH = pageHeight - startY - 20;

        let w = imgProps.width;
        let h = imgProps.height;

        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = w * ratio;
        h = h * ratio;

        pdf.addImage(base64Img, 'JPEG', 14, startY + 6, w, h);
      } catch (_) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text(`[Image File Attached: ${url}]`, 14, startY + 12);
      }
    } else {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(`[File Path / Link: ${url}]`, 14, startY + 12);
    }
  }

  pdf.save(cleanFileName);
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
    { label: 'Customer Profit Share (40%)', value: row.profit_40 },
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
