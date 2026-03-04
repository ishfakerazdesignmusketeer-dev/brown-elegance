import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoicePDF = (order: any) => {
  const doc = new jsPDF();

  // ── Safe field extraction ──────────
  const orderNumber = order.order_number
    || order.id?.toString().slice(0,8).toUpperCase()
    || 'N/A';

  const orderDate = order.created_at
    ? new Date(order.created_at)
        .toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

  const customerName = order.customer_name
    || order.name || 'N/A';

  const customerPhone = order.customer_phone
    || order.phone || 'N/A';

  const customerAddress = order.customer_address
    || order.address || 'N/A';

  const thana = order.thana
    || order.customer_thana || '';

  const district = order.district
    || order.customer_district || '';

  const location = [thana, district]
    .filter(Boolean).join(', ');

  const paymentMethod = order.payment_method
    || order.payment_type || 'COD';

  const paymentStatus = order.payment_status
    || 'Unpaid';

  const deliveryZone = order.delivery_zone
    === 'outside_dhaka'
    ? 'Outside Dhaka'
    : 'Inside Dhaka';

  const items = order.order_items
    || order.items || [];

  const subtotal = Number(
    order.subtotal
    || order.sub_total
    || 0
  );

  const deliveryCharge = Number(
    order.delivery_charge
    || order.delivery_fee
    || 60
  );

  const discount = Number(
    order.discount_amount
    || order.discount
    || 0
  );

  const total = Number(
    order.total_amount
    || order.total
    || (subtotal + deliveryCharge - discount)
  );

  const advanceAmount = Number(
    order.advance_amount || 0
  );

  const amountToCollect = Number(
    order.amount_to_collect
    || (total - advanceAmount)
    || 0
  );

  const source = order.order_source
    || order.source || '';

  // ── Page setup ────────────────────
  const pageW = doc.internal.pageSize.width;

  // ── Header background bar ─────────
  doc.setFillColor(44, 24, 16);
  doc.rect(0, 0, pageW, 38, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('BROWN HOUSE', 20, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(212, 165, 116);
  doc.text('brownhouse.global', 20, 26);
  doc.text('Premium Bengali Ethnic Wear', 20, 33);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageW - 20, 22,
    { align: 'right' });

  // ── Order info below header ───────
  doc.setTextColor(80, 60, 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Order #: ${orderNumber}`, 20, 50);
  doc.text(`Date: ${orderDate}`, 20, 58);
  doc.text(`Payment: ${paymentMethod}`, 20, 66);
  if (source) {
    doc.text(`Source: ${source}`, 20, 74);
  }

  doc.text(`Delivery: ${deliveryZone}`,
    pageW - 20, 50, { align: 'right' });
  doc.text(`Charge: BDT ${deliveryCharge}`,
    pageW - 20, 58, { align: 'right' });

  // ── Divider ───────────────────────
  doc.setDrawColor(212, 165, 116);
  doc.setLineWidth(0.3);
  doc.line(20, 80, pageW - 20, 80);

  // ── Bill To ───────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 140, 100);
  doc.text('BILL TO', 20, 90);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(44, 24, 16);
  doc.text(customerName, 20, 98);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 60, 50);
  doc.text(`Phone: ${customerPhone}`, 20, 106);
  doc.text(customerAddress, 20, 113);
  if (location) {
    doc.text(location, 20, 120);
  }

  // ── Items table ───────────────────
  const itemRows = items.length > 0
    ? items.map((item: any) => {
        const name = item.product_name
          || item.name || 'Product';
        const size = item.size || '-';
        const qty = Number(
          item.quantity || item.qty || 1
        );
        const price = Number(
          item.price
          || item.unit_price
          || item.product_price
          || 0
        );
        return [
          name,
          size,
          String(qty),
          `BDT ${price.toLocaleString()}`,
          `BDT ${(price * qty).toLocaleString()}`
        ];
      })
    : [['No items', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: 130,
    head: [[
      'Product', 'Size', 'Qty',
      'Unit Price', 'Total'
    ]],
    body: itemRows,
    headStyles: {
      fillColor: [44, 24, 16],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [60, 40, 30]
    },
    alternateRowStyles: {
      fillColor: [250, 246, 240]
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // ── Totals ────────────────────────
  const tableEnd =
    (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(250, 246, 240);
  doc.rect(pageW - 90, tableEnd,
    70, discount > 0 ? 42 : 35, 'F');

  doc.setFontSize(9);
  doc.setTextColor(80, 60, 50);
  doc.setFont('helvetica', 'normal');

  let ty = tableEnd + 8;

  doc.text('Subtotal:', pageW - 88, ty);
  doc.text(`BDT ${subtotal.toLocaleString()}`,
    pageW - 22, ty, { align: 'right' });
  ty += 7;

  doc.text('Delivery:', pageW - 88, ty);
  doc.text(`BDT ${deliveryCharge.toLocaleString()}`,
    pageW - 22, ty, { align: 'right' });
  ty += 7;

  if (discount > 0) {
    doc.text('Discount:', pageW - 88, ty);
    doc.text(`-BDT ${discount.toLocaleString()}`,
      pageW - 22, ty, { align: 'right' });
    ty += 7;
  }

  doc.setDrawColor(180, 140, 100);
  doc.line(pageW - 88, ty, pageW - 22, ty);
  ty += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(44, 24, 16);
  doc.text('TOTAL:', pageW - 88, ty);
  doc.text(`BDT ${total.toLocaleString()}`,
    pageW - 22, ty, { align: 'right' });

  // ── Payment status ────────────────
  const psY = tableEnd + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 140, 100);
  doc.text('PAYMENT STATUS', 20, psY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 60, 50);
  doc.text(paymentStatus.toUpperCase(),
    20, psY + 8);

  if (advanceAmount > 0) {
    doc.text(
      `Advance Paid: BDT ${advanceAmount
        .toLocaleString()}`,
      20, psY + 16
    );
    doc.text(
      `Amount to Collect: BDT ${amountToCollect
        .toLocaleString()}`,
      20, psY + 24
    );
  }

  // ── Footer ────────────────────────
  const pageH = doc.internal.pageSize.height;

  doc.setFillColor(44, 24, 16);
  doc.rect(0, pageH - 20, pageW, 20, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(212, 165, 116);
  doc.text(
    'Thank you for shopping with Brown House!',
    pageW / 2, pageH - 12,
    { align: 'center' }
  );
  doc.text(
    'brownhouse.global',
    pageW / 2, pageH - 6,
    { align: 'center' }
  );

  // ── Save ──────────────────────────
  doc.save(
    `BrownHouse-Invoice-${orderNumber}.pdf`
  );
};
