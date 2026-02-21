import { useState, useEffect } from "react";
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
import { Loader2, Tag, X } from "lucide-react";

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

interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
}

const Checkout = () => {
  const { items, subtotal, clearCart, sessionId } = useCart();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [paymentNumbers, setPaymentNumbers] = useState({ bkash: "01XXXXXXXXX", nagad: "01XXXXXXXXX" });

  useEffect(() => {
    supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["bkash_number", "nagad_number"])
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((row) => { if (row.key && row.value) map[row.key] = row.value; });
          setPaymentNumbers({
            bkash: map["bkash_number"] ?? "01XXXXXXXXX",
            nagad: map["nagad_number"] ?? "01XXXXXXXXX",
          });
        }
      });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const discountAmount = appliedCoupon?.discount_amount ?? 0;
  const total = subtotal + DELIVERY_CHARGE - discountAmount;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponInput.trim().toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        setCouponError("Invalid or inactive coupon code.");
        return;
      }

      // Validate expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCouponError("This coupon has expired.");
        return;
      }

      // Validate usage limit
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        setCouponError("This coupon has reached its usage limit.");
        return;
      }

      // Validate min order
      if (subtotal < (data.min_order_amount ?? 0)) {
        setCouponError(`Minimum order of ${formatPrice(data.min_order_amount)} required.`);
        return;
      }

      // Compute discount
      let discAmt = 0;
      if (data.discount_type === "percentage") {
        discAmt = Math.round((subtotal * data.discount_value) / 100);
      } else {
        discAmt = data.discount_value;
      }
      discAmt = Math.min(discAmt, subtotal);

      setAppliedCoupon({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        discount_amount: discAmt,
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

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
          discount_amount: discountAmount,
          coupon_code: appliedCoupon?.code ?? null,
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

      // 3. Increment coupon used_count if applied
      if (appliedCoupon) {
        const { data: currentCoupon } = await supabase
          .from("coupons")
          .select("used_count")
          .eq("id", appliedCoupon.id)
          .single();
        if (currentCoupon) {
          await supabase
            .from("coupons")
            .update({ used_count: (currentCoupon.used_count ?? 0) + 1 })
            .eq("id", appliedCoupon.id);
        }
      }

      // 4. Build WhatsApp message
      const waNumber = "8801883132020";
      const itemsText = items
        .map((i) => `${i.name} | Size: ${i.size} | Qty: ${i.quantity} | ${formatPrice(i.unit_price * i.quantity)}`)
        .join("\n");

      const discountLine = discountAmount > 0 ? `\nDiscount (${appliedCoupon?.code}): -${formatPrice(discountAmount)}` : "";
      const message = `🟤 New Order — BROWN HOUSE\n\nOrder: ${order.order_number}\nCustomer: ${data.customer_name}\nPhone: ${data.customer_phone}\nAddress: ${data.customer_address}, ${data.customer_city}\n\nItems:\n${itemsText}\n\nSubtotal: ${formatPrice(subtotal)}\nDelivery: ${formatPrice(DELIVERY_CHARGE)}${discountLine}\nTotal: ${formatPrice(total)}\n\nPayment: Cash on Delivery`;

      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank");

      // 5. Mark abandoned cart as converted
      supabase
        .from("abandoned_carts")
        .update({ converted: true, converted_order_id: order.id })
        .eq("session_id", sessionId)
        .then(() => {});

      // 6. Clear cart & navigate
      clearCart();
      navigate(`/order-confirmation/${order.id}`, {
        state: {
          order_number: order.order_number,
          customer_name: data.customer_name,
          items,
          subtotal,
          delivery_charge: DELIVERY_CHARGE,
          discount_amount: discountAmount,
          coupon_code: appliedCoupon?.code,
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
                {...register("customer_phone", {
                  onBlur: (e) => {
                    const phone = e.target.value;
                    if (/^01[3-9]\d{8}$/.test(phone)) {
                      // Fire-and-forget: update abandoned cart with phone
                      const nameEl = document.querySelector<HTMLInputElement>('input[name="customer_name"]');
                      supabase
                        .from("abandoned_carts")
                        .update({ customer_phone: phone, customer_name: nameEl?.value ?? null })
                        .eq("session_id", sessionId)
                        .then(() => {});
                    }
                  },
                })}
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
            <div className="border border-border p-4 space-y-3">
              <p className="font-body text-xs uppercase tracking-[1.5px] text-foreground">Payment Method</p>

              {/* COD — only selectable */}
              <div className="flex items-start gap-3 cursor-pointer">
                <div className="w-4 h-4 rounded-full border-2 border-foreground flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-foreground" />
                </div>
                <div>
                  <span className="font-body text-sm text-foreground font-medium">Cash on Delivery (COD)</span>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">Pay when you receive your order</p>
                </div>
              </div>

              {/* bKash — coming soon */}
              <div className="flex items-start gap-3 opacity-50 cursor-not-allowed">
                <div className="w-4 h-4 rounded-full border-2 border-muted flex items-center justify-center mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-body text-sm text-muted-foreground font-medium">bKash</span>
                    <span className="text-[10px] italic text-muted-foreground border border-muted rounded px-1.5 py-0.5">Coming Soon</span>
                  </div>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">Send to: {paymentNumbers.bkash}</p>
                </div>
              </div>

              {/* Nagad — coming soon */}
              <div className="flex items-start gap-3 opacity-50 cursor-not-allowed">
                <div className="w-4 h-4 rounded-full border-2 border-muted flex items-center justify-center mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-body text-sm text-muted-foreground font-medium">Nagad</span>
                    <span className="text-[10px] italic text-muted-foreground border border-muted rounded px-1.5 py-0.5">Coming Soon</span>
                  </div>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">Send to: {paymentNumbers.nagad}</p>
                </div>
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

              {/* Coupon Field */}
              <div className="border-t border-border pt-4 mb-4">
                <p className="font-body text-xs uppercase tracking-[1.5px] text-foreground mb-2">Coupon Code</p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-green-600" />
                      <span className="font-mono text-sm font-semibold text-green-700">{appliedCoupon.code}</span>
                      <span className="text-xs text-green-600">
                        -{appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : formatPrice(appliedCoupon.discount_value)}
                      </span>
                    </div>
                    <button onClick={removeCoupon} className="text-green-500 hover:text-green-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                      placeholder="Enter coupon code"
                      className="bg-transparent border-border rounded-none font-mono text-sm h-9 flex-1 focus-visible:ring-foreground uppercase"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="font-body text-xs uppercase tracking-[1px] border border-foreground px-3 py-2 hover:bg-foreground hover:text-background transition-colors disabled:opacity-40 whitespace-nowrap"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="font-body text-xs text-destructive mt-1.5">{couponError}</p>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between font-body text-sm text-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between font-body text-sm text-muted-foreground">
                  <span>Delivery</span>
                  <span>{formatPrice(DELIVERY_CHARGE)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between font-body text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
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
