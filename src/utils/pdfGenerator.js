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
  pdf.text(`Mobile: ${customer.mobile_number || '—'}   |   Email: ${customer.email || '—'}   |   DPID: ${customer.dpid || '—'}`, 14, 45);

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
