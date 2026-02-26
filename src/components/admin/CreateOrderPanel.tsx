import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Plus, Minus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderLineItem {
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

interface ProductVariant {
  id: string;
  size: string;
  stock: number;
  product_id: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[] | null;
  product_variants: ProductVariant[];
}

interface CreateOrderPanelProps {
  open: boolean;
  onClose: () => void;
}

const SOURCES = [
  { label: "💬 Messenger", value: "Messenger" },
  { label: "📸 Instagram", value: "Instagram" },
  { label: "📞 Phone", value: "Phone" },
  { label: "🚶 Walk-in", value: "Walk-in" },
  { label: "🌐 Website", value: "Website" },
];

const PAYMENT_METHODS = [
  { label: "💵 COD", value: "COD" },
  { label: "📱 bKash", value: "bKash" },
  { label: "📱 Nagad", value: "Nagad" },
];

const DISTRICTS = [
  "Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh",
  "Comilla", "Gazipur", "Narayanganj", "Tongi", "Bogra", "Cox's Bazar", "Jessore", "Dinajpur",
  "Brahmanbaria", "Savar", "Tangail", "Narsingdi", "Faridpur", "Manikganj", "Munshiganj",
  "Narail", "Kushtia", "Madaripur", "Gopalganj", "Shariatpur", "Kishoreganj", "Habiganj",
  "Moulvibazar", "Sunamganj", "Netrokona", "Jamalpur", "Sherpur",
];

const CreateOrderPanel = ({ open, onClose }: CreateOrderPanelProps) => {
  const queryClient = useQueryClient();

  const [source, setSource] = useState("Phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [delivery, setDelivery] = useState(80);
  const [discount, setDiscount] = useState(0);

  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState<OrderLineItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-for-order"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: open,
  });

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = subtotal + delivery - discount;

  const selectedVariant = selectedProduct?.product_variants.find((v) => v.size === selectedSize);
  const maxQty = selectedVariant?.stock ?? 0;

  const addItem = () => {
    if (!selectedProduct || !selectedSize || qty < 1) return;
    const existing = items.findIndex(
      (i) => i.productId === selectedProduct.id && i.size === selectedSize
    );
    if (existing >= 0) {
      const updated = [...items];
      updated[existing].quantity += qty;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          size: selectedSize,
          quantity: qty,
          unitPrice: selectedProduct.price,
        },
      ]);
    }
    setSelectedProduct(null);
    setSelectedSize("");
    setQty(1);
    setProductSearch("");
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const resetForm = () => {
    setSource("Phone"); setName(""); setPhone(""); setAddress(""); setDistrict("");
    setNotes(""); setPaymentMethod("COD"); setPaymentStatus("unpaid"); setDelivery(80);
    setDiscount(0); setItems([]); setSelectedProduct(null); setSelectedSize("");
    setQty(1); setProductSearch(""); setErrors({});
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!phone.trim()) e.phone = "Phone is required";
    if (!address.trim()) e.address = "Address is required";
    if (items.length === 0) e.items = "Add at least one item";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_address: address.trim(),
          customer_city: district.trim() || "N/A",
          notes: notes.trim() || null,
          source,
          status: "pending",
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          subtotal,
          delivery_charge: delivery,
          discount_amount: discount,
          total: total > 0 ? total : 0,
        })
        .select("id, order_number")
        .single();
      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      await supabase.from("order_notes").insert({
        order_id: order.id,
        note: `Order created manually via ${source}`,
        created_by: "admin",
      } as any);

      return order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-order-items"] });
      queryClient.invalidateQueries({ queryKey: ["admin-customer-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
      toast.success(`Order ${order.order_number} created successfully`);
      resetForm();
      onClose();
    },
    onError: (err: any) => toast.error("Failed to create order: " + err.message),
  });

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-[720px] w-[95vw] p-0 gap-0 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Create New Order</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Fill in customer and order details below
          </DialogDescription>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
            {/* Section 1: Order Source */}
            <div>
              <Label className="text-xs text-muted-foreground">Where is this order from?</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SOURCES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSource(s.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      source === s.value
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-foreground border-border hover:border-foreground/50"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Section 2: Customer Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Customer Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" className="mt-1" />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label className="text-xs">Phone Number *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="mt-1" />
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>
              </div>
              <div>
                <Label className="text-xs">Address *</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" rows={2} className="mt-1" />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">District</Label>
                  <Select value={district} onValueChange={setDistrict}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Order Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions..." rows={2} className="mt-1" />
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Section 3: Products */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Add Products to Order</h3>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProduct(null);
                    setSelectedSize("");
                  }}
                  placeholder="Search products..."
                  className="pl-8"
                />
              </div>

              {productSearch && !selectedProduct && filteredProducts.length > 0 && (
                <div className="border border-border rounded-md max-h-40 overflow-y-auto bg-background">
                  {filteredProducts.slice(0, 10).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setProductSearch(p.name);
                        setSelectedSize("");
                        setQty(1);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-3"
                    >
                      {p.images?.[0] && (
                        <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      )}
                      <span className="flex-1">{p.name}</span>
                      <span className="text-muted-foreground">{formatPrice(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedProduct && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                  <p className="text-xs font-medium">{selectedProduct.name} — {formatPrice(selectedProduct.price)}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.product_variants.map((v) => (
                      <button
                        key={v.id}
                        disabled={v.stock === 0}
                        onClick={() => { setSelectedSize(v.size); setQty(1); }}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-md border transition-colors",
                          v.stock === 0
                            ? "opacity-40 line-through cursor-not-allowed border-border text-muted-foreground"
                            : selectedSize === v.size
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary"
                        )}
                      >
                        {v.size} ({v.stock})
                      </button>
                    ))}
                  </div>
                  {selectedSize && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(Math.max(1, qty - 1))}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number" min={1} max={maxQty} value={qty}
                        onChange={(e) => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-16 h-8 text-center text-sm"
                      />
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(Math.min(maxQty, qty + 1))}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button size="sm" className="h-8 ml-2" onClick={addItem}>Add to Order</Button>
                    </div>
                  )}
                </div>
              )}

              {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}

              {items.length > 0 && (
                <>
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-3 py-2 font-medium">Product</th>
                          <th className="px-2 py-2 font-medium">Size</th>
                          <th className="px-2 py-2 font-medium">Qty</th>
                          <th className="px-2 py-2 font-medium text-right">Total</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2">{item.productName}</td>
                            <td className="px-2 py-2 text-center">{item.size}</td>
                            <td className="px-2 py-2 text-center">{item.quantity}</td>
                            <td className="px-2 py-2 text-right">{formatPrice(item.unitPrice * item.quantity)}</td>
                            <td className="px-2 py-2">
                              <button onClick={() => removeItem(i)} className="text-destructive hover:text-destructive/80">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Delivery</span>
                      <Input type="number" value={delivery} onChange={(e) => setDelivery(parseInt(e.target.value) || 0)} className="w-24 h-7 text-right text-xs" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Discount</span>
                      <Input type="number" value={discount} onChange={(e) => setDiscount(parseInt(e.target.value) || 0)} className="w-24 h-7 text-right text-xs" />
                    </div>
                    <div className="flex justify-between font-semibold border-t border-border pt-2">
                      <span>Total</span>
                      <span>{formatPrice(total > 0 ? total : 0)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Section 4: Payment */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Payment</h3>
              <div>
                <Label className="text-xs text-muted-foreground">Payment Method</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        paymentMethod === m.value
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background text-foreground border-border hover:border-foreground/50"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Payment Status</Label>
                <div className="flex gap-2 mt-1.5">
                  {[
                    { label: "⏳ Unpaid", value: "unpaid" },
                    { label: "✅ Paid", value: "paid" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setPaymentStatus(s.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        paymentStatus === s.value
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background text-foreground border-border hover:border-foreground/50"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-sm font-semibold">
            Total: {formatPrice(total > 0 ? total : 0)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Order →"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderPanel;
