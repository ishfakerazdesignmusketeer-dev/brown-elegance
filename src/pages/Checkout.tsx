import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/layout/Navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";

import { Loader2 } from "lucide-react";

const DELIVERY_CHARGE = 80;

const schema = z.object({
  customer_name: z.string().trim().min(2, "Name is required").max(100),
  customer_phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "Enter a valid BD phone number (e.g. 01712345678)")
    .max(20),
  customer_address: z.string().trim().min(5, "Address is required").max(500),
  customer_city: z.string().trim().min(2, "City is required").max(100),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

const Checkout = () => {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const total = subtotal + DELIVERY_CHARGE;

  const onSubmit = async (data: FormData) => {
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Insert order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_address: data.customer_address,
          customer_city: data.customer_city,
          notes: data.notes || null,
          subtotal,
          delivery_charge: DELIVERY_CHARGE,
          total,
          payment_method: "COD",
          status: "pending",
        })
        .select("id, order_number")
        .single();

      if (orderError || !order) throw new Error(orderError?.message ?? "Failed to create order");

      // 2. Insert order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw new Error(itemsError.message);

      // 3. Build WhatsApp message (WhatsApp number stored as env constant)
      const waNumber = "8801XXXXXXXXX"; // Update this in admin_settings


      const itemsText = items
        .map((i) => `${i.name} | Size: ${i.size} | Qty: ${i.quantity} | ${formatPrice(i.unit_price * i.quantity)}`)
        .join("\n");

      const message = `🟤 New Order — BROWN\n\nOrder: ${order.order_number}\nCustomer: ${data.customer_name}\nPhone: ${data.customer_phone}\nAddress: ${data.customer_address}, ${data.customer_city}\n\nItems:\n${itemsText}\n\nSubtotal: ${formatPrice(subtotal)}\nDelivery: ${formatPrice(DELIVERY_CHARGE)}\nTotal: ${formatPrice(total)}\n\nPayment: Cash on Delivery`;

      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank");

      // 4. Clear cart & navigate
      clearCart();
      navigate(`/order-confirmation/${order.id}`, {
        state: {
          order_number: order.order_number,
          customer_name: data.customer_name,
          items,
          subtotal,
          delivery_charge: DELIVERY_CHARGE,
          total,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cream">
        <AnnouncementBar />
        <Navigation />


        <div className="flex flex-col items-center justify-center py-32 gap-6 px-6">
          <p className="font-heading text-3xl text-foreground text-center">Your cart is empty</p>
          <Button asChild className="bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] px-8 py-5 rounded-none">
            <Link to="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <AnnouncementBar />
      <Navigation />
      

      <main className="px-6 lg:px-12 py-10 max-w-6xl mx-auto">
        <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-10">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left: Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-3 space-y-6">
            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">
                Full Name *
              </label>
              <Input
                {...register("customer_name")}
                placeholder="Your full name"
                className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
              />
              {errors.customer_name && (
                <p className="font-body text-xs text-destructive mt-1">{errors.customer_name.message}</p>
              )}
            </div>

            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">
                Phone Number *
              </label>
              <Input
                {...register("customer_phone")}
                placeholder="017XXXXXXXX"
                className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
              />
              {errors.customer_phone && (
                <p className="font-body text-xs text-destructive mt-1">{errors.customer_phone.message}</p>
              )}
            </div>

            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">
                Delivery Address *
              </label>
              <Textarea
                {...register("customer_address")}
                placeholder="House no., road, area..."
                rows={3}
                className="bg-transparent border-border rounded-none font-body text-sm resize-none focus-visible:ring-foreground"
              />
              {errors.customer_address && (
                <p className="font-body text-xs text-destructive mt-1">{errors.customer_address.message}</p>
              )}
            </div>

            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">
                City / District *
              </label>
              <Input
                {...register("customer_city")}
                placeholder="e.g. Dhaka"
                className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
              />
              {errors.customer_city && (
                <p className="font-body text-xs text-destructive mt-1">{errors.customer_city.message}</p>
              )}
            </div>

            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">
                Order Notes <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                {...register("notes")}
                placeholder="Any special instructions..."
                rows={2}
                className="bg-transparent border-border rounded-none font-body text-sm resize-none focus-visible:ring-foreground"
              />
            </div>

            {/* Payment method */}
            <div className="border border-border p-4">
              <p className="font-body text-xs uppercase tracking-[1.5px] text-foreground mb-2">Payment Method</p>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-foreground flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-foreground" />
                </div>
                <span className="font-body text-sm text-foreground">Cash on Delivery (COD)</span>
              </div>
            </div>

            {error && (
              <p className="font-body text-sm text-destructive bg-destructive/10 p-3">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] py-7 rounded-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                "Place Order"
              )}
            </Button>
          </form>

          {/* Right: Order Summary */}
          <div className="lg:col-span-2">
            <div className="border border-border p-6 sticky top-20">
              <h2 className="font-heading text-2xl text-foreground mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="flex gap-3">
                    <div className="w-14 h-16 bg-muted overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-heading text-sm text-foreground leading-tight">{item.name}</p>
                      <p className="font-body text-xs text-muted-foreground">Size: {item.size} · Qty: {item.quantity}</p>
                      <p className="font-body text-sm text-foreground mt-1">
                        {formatPrice(item.unit_price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between font-body text-sm text-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between font-body text-sm text-muted-foreground">
                  <span>Delivery</span>
                  <span>{formatPrice(DELIVERY_CHARGE)}</span>
                </div>
                <div className="flex justify-between font-heading text-xl text-foreground border-t border-border pt-3">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
