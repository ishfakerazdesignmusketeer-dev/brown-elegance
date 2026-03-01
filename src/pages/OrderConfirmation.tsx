import { useLocation, Link } from "react-router-dom";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download } from "lucide-react";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import type { CartItem } from "@/contexts/CartContext";

interface OrderState {
  order_number: string;
  customer_name: string;
  items: CartItem[];
  subtotal: number;
  delivery_charge: number;
  total: number;
}

const OrderConfirmation = () => {
  const { state } = useLocation() as { state: OrderState | null };

  if (!state) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-6 px-6">
        <p className="font-heading text-3xl text-foreground text-center">
          Order not found
        </p>
        <Button asChild className="bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] px-8 py-5 rounded-none">
          <Link to="/">Return to Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center py-16 px-6">
      <div className="max-w-lg w-full text-center">
        {/* Checkmark */}
        <div className="flex justify-center mb-6">
          <CheckCircle
            className="w-20 h-20 text-foreground"
            style={{ animation: "scaleIn 0.4s ease-out" }}
          />
        </div>

        <style>{`
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            80% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* Thank You */}
        <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-3">
          Thank You, {state.customer_name.split(" ")[0]}!
        </h1>

        {/* Order Number */}
        <div className="inline-block bg-foreground text-background font-body text-sm uppercase tracking-[2px] px-6 py-3 mb-8">
          {state.order_number}
        </div>

        {/* WhatsApp note */}
        <p className="font-body text-sm text-muted-foreground mb-10 leading-relaxed">
          Your order has been placed successfully. Our team will confirm via WhatsApp shortly.
        </p>

        {/* Order Summary */}
        <div className="border border-border p-6 mb-8 text-left">
          <h2 className="font-heading text-xl text-foreground mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {state.items.map((item) => (
              <div key={`${item.id}-${item.size}`} className="flex justify-between font-body text-sm text-foreground">
                <span>{item.name} · {item.size} × {item.quantity}</span>
                <span>{formatPrice(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-1">
            <div className="flex justify-between font-body text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(state.subtotal)}</span>
            </div>
            <div className="flex justify-between font-body text-xs text-muted-foreground">
              <span>Delivery</span>
              <span>{formatPrice(state.delivery_charge)}</span>
            </div>
            <div className="flex justify-between font-heading text-lg text-foreground border-t border-border pt-2 mt-2">
              <span>Total</span>
              <span>{formatPrice(state.total)}</span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="font-body text-[12px] uppercase tracking-[1.5px] px-10 py-6 rounded-none border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors gap-2"
          onClick={() =>
            generateInvoicePDF({
              order_number: state.order_number,
              customer_name: state.customer_name,
              created_at: new Date().toISOString(),
              order_items: state.items.map((i) => ({
                product_name: i.name,
                size: i.size,
                quantity: i.quantity,
                unit_price: i.unit_price,
              })),
              subtotal: state.subtotal,
              delivery_charge: state.delivery_charge,
              total: state.total,
            })
          }
        >
          <Download className="w-4 h-4" />
          Download Invoice
        </Button>

        <Button
          asChild
          className="bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] px-10 py-6 rounded-none"
        >
          <Link to="/">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
};

export default OrderConfirmation;
