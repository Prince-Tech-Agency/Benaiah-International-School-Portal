import { jsPDF } from 'jspdf';
import { formatNaira, formatDate } from './helpers';

export function downloadReceipt(payment) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const green = [31, 92, 63];
  const sand = [200, 155, 92];
  const charcoal = [34, 40, 31];
  const softGrey = [91, 99, 85];
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 56;

  // Header band
  doc.setFillColor(...green);
  doc.rect(0, 0, pageWidth, 92, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.text('Benaiah International School', margin, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Courage, Initiative and Success', margin, 62);

  doc.setTextColor(...charcoal);
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text('Payment Receipt', margin, 128);

  doc.setDrawColor(...sand);
  doc.setLineWidth(1.2);
  doc.line(margin, 138, pageWidth - margin, 138);

  const student = payment.students || {};
  const rows = [
    ['Receipt No.', payment.receipt_number || payment.reference],
    ['Date paid', formatDate(payment.paid_at || payment.created_at)],
    ['Student', `${student.first_name || ''} ${student.surname || ''}`.trim()],
    ['Class', student.class || ''],
    ['Payment reference', payment.reference],
  ];

  let y = 168;
  doc.setFontSize(11);
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...softGrey);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...charcoal);
    doc.text(String(value || '—'), margin + 160, y);
    y += 22;
  });

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...softGrey);
  doc.text('ITEM', margin, y);
  doc.text('AMOUNT', pageWidth - margin - 80, y);
  y += 8;
  doc.setDrawColor(...charcoal);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...charcoal);
  (payment.payment_items || []).forEach((item) => {
    doc.text(item.category_name, margin, y);
    doc.text(formatNaira(item.amount), pageWidth - margin - 80, y);
    y += 20;
  });

  y += 6;
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text('Total Paid', margin, y);
  doc.setTextColor(...green);
  doc.text(formatNaira(payment.amount), pageWidth - margin - 80, y);

  y += 60;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...softGrey);
  doc.text('This receipt was generated automatically upon confirmation of payment via Paystack.', margin, y);
  doc.text('Benaiah International School · Parent Payment Portal', margin, y + 14);

  doc.save(`Receipt-${payment.receipt_number || payment.reference}.pdf`);
}
