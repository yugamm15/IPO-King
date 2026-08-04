import { jsPDF } from 'jspdf';

/**
 * Generates a clean, professional PDF for business reports
 */
export function generateReportPdf({ title, subtitle, columns, rows, summaryStats, period = 'Current Period' }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Banner
  doc.setFillColor(37, 99, 235); // Corporate Blue #2563EB
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('IPO KING — Financial & Compliance Statement', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}   |   Period: ${period}`, 14, 21);

  // Report Title Section
  let currentY = 36;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, currentY);

  currentY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle || 'Official system generated ledger record', 14, currentY);

  currentY += 8;

  // Optional Summary Stats Bar
  if (summaryStats && summaryStats.length > 0) {
    const boxHeight = 16;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, pageWidth - 28, boxHeight, 2, 2, 'FD');

    const colWidth = (pageWidth - 28) / summaryStats.length;
    summaryStats.forEach((stat, idx) => {
      const xPos = 14 + idx * colWidth + 4;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(stat.label.toUpperCase(), xPos, currentY + 6);

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(String(stat.value), xPos, currentY + 12);
    });

    currentY += boxHeight + 8;
  }

  // Draw Data Table
  const marginX = 14;
  const tableWidth = pageWidth - marginX * 2;
  const colWidths = columns.map(c => (c.width ? (tableWidth * c.width) / 100 : tableWidth / columns.length));

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, currentY, tableWidth, 8, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  let currentX = marginX;
  columns.forEach((col, i) => {
    doc.text(col.header.toUpperCase(), currentX + 3, currentY + 5.5);
    currentX += colWidths[i];
  });

  currentY += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  rows.forEach((row, rowIndex) => {
    // Page overflow check
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 20;

      // Re-draw Header on new page
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, currentY, tableWidth, 8, 'FD');
      doc.setFont('helvetica', 'bold');
      let reX = marginX;
      columns.forEach((col, i) => {
        doc.text(col.header.toUpperCase(), reX + 3, currentY + 5.5);
        reX += colWidths[i];
      });
      currentY += 8;
      doc.setFont('helvetica', 'normal');
    }

    // Alternating Row Color
    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, tableWidth, 7, 'F');
    }

    doc.setTextColor(51, 65, 85);
    let rowX = marginX;
    columns.forEach((col, colIndex) => {
      const rawVal = row[col.key];
      const textVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : '—';
      const truncated = textVal.length > 28 ? textVal.substring(0, 26) + '...' : textVal;
      doc.text(truncated, rowX + 3, currentY + 4.8);
      rowX += colWidths[colIndex];
    });

    // Row Bottom Border Line
    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, currentY + 7, marginX + tableWidth, currentY + 7);

    currentY += 7;
  });

  // Footer Page Numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}  •  IPO KING Enterprise Security Audit Record`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  const cleanFilename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_report.pdf`;
  doc.save(cleanFilename);
}

/**
 * Generates and triggers download of Excel / CSV format with UTF-8 BOM
 */
export function generateReportCsv({ title, columns, rows }) {
  const headersStr = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',');
  const rowsStr = rows.map(r => {
    return columns.map(c => {
      const val = r[c.key] !== undefined && r[c.key] !== null ? String(r[c.key]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  }).join('\n');

  const csvContent = '\uFEFF' + headersStr + '\n' + rowsStr;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanFilename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
