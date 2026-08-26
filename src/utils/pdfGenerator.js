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

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Customer ID: #${customer.customer_no || '—'}   |   Code: ${customer.code || '—'}   |   PAN: ${customer.pan_number || '—'}   |   DPID: ${customer.dpid || '—'}`, marginX, 39);
  doc.text(`Bank: ${customer.bank_name || '—'}   |   A/C: ${customer.bank_account_no || '—'}   |   Available Balance: Rs. ${Number(customer.balance || 0).toLocaleString('en-IN')}`, marginX, 45);

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
  doc.text(`Client 40% Share: Rs. ${totalClient40.toLocaleString('en-IN')}`, marginX + 175, currentY + 8.5);
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
  doc.text('40% SHARE', marginX + 215, currentY + 5.5);
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

