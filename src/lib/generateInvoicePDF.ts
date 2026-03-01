import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatPrice } from "@/lib/format";

export const generateInvoicePDF = (order: any) => {
  const doc = new jsPDF();

  // Brand header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("BROWN HOUSE", 20, 25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("brownhouse.global", 20, 32);
  doc.text("Premium Bengali Ethnic Wear", 20, 38);

  // Invoice title + order info (right side)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 150, 25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const orderNumber = order.order_number || "N/A";
  doc.text(`Order #: ${orderNumber}`, 150, 35);
  doc.text(
    `Date: ${new Date(order.created_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`,
    150,
    42
  );
  doc.text(`Payment: ${order.payment_method || "COD"}`, 150, 49);

  // Divider
  doc.setLineWidth(0.5);
  doc.line(20, 55, 190, 55);

  // Bill to
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 20, 65);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(order.customer_name || "", 20, 73);
  doc.text(`Phone: ${order.customer_phone || ""}`, 20, 80);
  doc.text(order.customer_address || "", 20, 87);
  if (order.customer_city) {
    doc.text(order.customer_city, 20, 94);
  }

  // Items table
  const items = order.order_items || order.items || [];

  autoTable(doc, {
    startY: 105,
    head: [["Product", "Size", "Qty", "Unit Price", "Total"]],
    body: items.map((item: any) => [
      item.product_name || item.name,
      item.size || "-",
      String(item.quantity),
      formatPrice(Number(item.unit_price || item.price || 0)),
      formatPrice(
        Number(item.unit_price || item.price || 0) * Number(item.quantity)
      ),
    ]),
    headStyles: {
      fillColor: [44, 24, 16],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [250, 248, 245],
    },
    styles: { fontSize: 10 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 130, finalY);
  doc.text(formatPrice(Number(order.subtotal || 0)), 190, finalY, {
    align: "right",
  });

  doc.text("Delivery:", 130, finalY + 7);
  doc.text(
    formatPrice(Number(order.delivery_charge ?? 0)),
    190,
    finalY + 7,
    { align: "right" }
  );

  let offset = 14;
  if ((order.discount_amount ?? 0) > 0) {
    doc.text(
      `Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}:`,
      130,
      finalY + offset
    );
    doc.text(
      `-${formatPrice(Number(order.discount_amount))}`,
      190,
      finalY + offset,
      { align: "right" }
    );
    offset += 7;
  }

  // Total line
  doc.setLineWidth(0.3);
  doc.line(130, finalY + offset, 190, finalY + offset);
  offset += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", 130, finalY + offset);
  doc.text(formatPrice(Number(order.total || 0)), 190, finalY + offset, {
    align: "right",
  });

  // Payment status
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Payment Status: ${(order.payment_status || "Unpaid").toUpperCase()}`,
    20,
    finalY + offset
  );

  if ((order.advance_amount ?? 0) > 0) {
    doc.text(
      `Advance Paid: ${formatPrice(Number(order.advance_amount))}`,
      20,
      finalY + offset + 7
    );
    doc.text(
      `Amount to Collect: ${formatPrice(Number(order.amount_to_collect ?? 0))}`,
      20,
      finalY + offset + 14
    );
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text("Thank you for shopping with Brown House!", 105, pageHeight - 20, {
    align: "center",
  });
  doc.text("brownhouse.global", 105, pageHeight - 14, { align: "center" });

  // Download
  doc.save(`BrownHouse-Invoice-${orderNumber}.pdf`);
};
