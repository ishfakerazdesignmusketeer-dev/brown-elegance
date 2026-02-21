import { forwardRef } from "react";
import { formatPrice } from "@/lib/format";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoiceOrder {
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  subtotal: number;
  delivery_charge: number;
  discount_amount?: number;
  coupon_code?: string;
  total: number;
  payment_method?: string;
  notes?: string | null;
  delivery_note?: string | null;
  order_items: OrderItem[];
}

interface InvoicePrintProps {
  order: InvoiceOrder;
}

const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(({ order }, ref) => {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
          #invoice-print-area { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; }
        }
      `}</style>
      <div id="invoice-print-area" ref={ref} className="hidden print:block bg-white p-10 max-w-2xl mx-auto font-sans text-gray-900">
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-widest text-gray-900">BROWN HOUSE</h1>
              <p className="text-xs text-gray-500 mt-1">Premium Bengali Menswear</p>
              <p className="text-xs text-gray-400">www.brownhouse.com</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Invoice</p>
              <p className="text-sm font-mono text-gray-900 mt-1">{order.order_number}</p>
              <p className="text-xs text-gray-500 mt-1">
                {format(new Date(order.created_at), "dd/MM/yyyy")}
              </p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2">Bill To</p>
          <p className="text-sm font-semibold text-gray-900">{order.customer_name}</p>
          <p className="text-sm text-gray-600">{order.customer_phone}</p>
          <p className="text-sm text-gray-600">{order.customer_address}</p>
          <p className="text-sm text-gray-600">{order.customer_city}</p>
        </div>

        {/* Items Table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-xs uppercase tracking-widest text-gray-500 font-semibold">Item</th>
              <th className="text-center py-2 text-xs uppercase tracking-widest text-gray-500 font-semibold">Size</th>
              <th className="text-center py-2 text-xs uppercase tracking-widest text-gray-500 font-semibold">Qty</th>
              <th className="text-right py-2 text-xs uppercase tracking-widest text-gray-500 font-semibold">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3 text-gray-900">{item.product_name}</td>
                <td className="py-3 text-center text-gray-600">{item.size}</td>
                <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                <td className="py-3 text-right text-gray-900">{formatPrice(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Delivery</span>
            <span>{formatPrice(order.delivery_charge ?? 0)}</span>
          </div>
          {(order.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
              <span>-{formatPrice(order.discount_amount ?? 0)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-900 pt-3 mt-2">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 mt-6 pt-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Payment:</span> {order.payment_method === "COD" ? "Cash on Delivery" : order.payment_method}
          </p>
          {order.delivery_note && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold">Delivery Note:</span> {order.delivery_note}
            </p>
          )}
          {order.notes && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold">Order Note:</span> {order.notes}
            </p>
          )}
          <p className="text-center text-xs text-gray-400 mt-6">Thank you for your order! 🤎</p>
        </div>
      </div>
    </>
  );
});

InvoicePrint.displayName = "InvoicePrint";

export default InvoicePrint;
