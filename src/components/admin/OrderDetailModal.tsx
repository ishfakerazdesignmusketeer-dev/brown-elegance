import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { format, formatDistanceToNow } from "date-fns";
import { X, Printer, Copy, Check, ClipboardList, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import InvoicePrint from "@/components/admin/InvoicePrint";
import { cn } from "@/lib/utils";

const STATUS_LIST = ["pending", "processing", "confirmed", "completed", "cancelled", "refunded"] as const;
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  confirmed: "bg-cyan-100 text-cyan-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  unpaid: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
};

const SOURCE_COLORS: Record<string, string> = {
  Website: "bg-gray-100 text-gray-700",
  Messenger: "bg-blue-50 text-blue-700",
  Instagram: "bg-pink-50 text-pink-700",
  Phone: "bg-green-50 text-green-700",
  "Walk-in": "bg-amber-50 text-amber-700",
};

interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
}

const CopyCard = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="w-full text-left bg-background border border-border rounded-lg px-3 py-2.5 hover:border-primary/50 transition-colors group"
    >
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground font-medium truncate mr-2">{value || "—"}</span>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0 transition-colors",
          copied ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}>
          {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
        </span>
      </div>
    </button>
  );
};

const OrderDetailModal = ({ orderId, onClose }: OrderDetailModalProps) => {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<string>("");
  const [noteText, setNoteText] = useState("");
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order-detail", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!orderId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["order-notes", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_notes")
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orderId,
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId!);
      if (error) throw error;
      await supabase.from("order_notes").insert({ order_id: orderId!, note: `Status changed to ${status}`, created_by: "admin" } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-notes", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-overview"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ method, status }: { method?: string; status?: string }) => {
      const update: any = {};
      if (method) update.payment_method = method;
      if (status) update.payment_status = status;
      const { error } = await supabase.from("orders").update(update).eq("id", orderId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
      toast.success("Payment updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const noteMutation = useMutation({
    mutationFn: async (note: string) => {
      const { error } = await supabase.from("order_notes").insert({ order_id: orderId!, note, created_by: "admin" } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-notes", orderId] });
      setNoteText("");
      toast.success("Note added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handlePrint = () => {
    setPrintOrder(order);
    setTimeout(() => window.print(), 100);
  };

  const handleWhatsApp = () => {
    if (!order) return;
    const items = order.order_items
      .map((i: any) => `${i.product_name} | ${i.size} × ${i.quantity} | ${formatPrice(i.total_price)}`)
      .join("\n");
    const msg = `🟤 Order Update — BROWN HOUSE\n\nOrder: ${order.order_number}\nCustomer: ${order.customer_name}\n\nItems:\n${items}\n\nTotal: ${formatPrice(order.total)}\nStatus: ${(order.status || "").toUpperCase()}`;
    window.open(`https://wa.me/${order.customer_phone.replace(/^0/, "88")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Edit mode helpers
  const enterEditMode = () => {
    if (!order) return;
    setEditData({
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address,
      customer_city: order.customer_city,
      status: order.status,
      payment_method: order.payment_method || "COD",
      payment_status: order.payment_status || "unpaid",
      advance_amount: order.advance_amount || 0,
      delivery_charge: order.delivery_charge || 0,
      delivery_zone: order.delivery_zone || "inside_dhaka",
      discount_amount: order.discount_amount || 0,
      notes: order.notes || "",
    });
    setEditItems((order.order_items || []).map((i: any) => ({ ...i })));
    setDeletedItemIds([]);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditData(null);
    setEditItems([]);
    setDeletedItemIds([]);
  };

  const editSubtotal = editItems.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);
  const editTotal = editSubtotal + (editData?.delivery_charge || 0) - (editData?.discount_amount || 0);
  const editAmountToCollect = Math.max(0, editTotal - (editData?.advance_amount || 0));

  const updateDeliveryZone = (zone: string) => {
    const charge = zone === "inside_dhaka" ? 100 : zone === "outside_dhaka" ? 130 : 0;
    setEditData((prev: any) => ({ ...prev, delivery_zone: zone, delivery_charge: charge }));
  };

  const saveEdit = async () => {
    if (!order || !editData) return;
    setSaving(true);
    try {
      // Update order
      const { error: orderErr } = await supabase.from("orders").update({
        customer_name: editData.customer_name,
        customer_phone: editData.customer_phone,
        customer_address: editData.customer_address,
        customer_city: editData.customer_city,
        status: editData.status,
        payment_method: editData.payment_method,
        payment_status: editData.payment_status,
        advance_amount: editData.advance_amount,
        delivery_charge: editData.delivery_charge,
        delivery_zone: editData.delivery_zone,
        discount_amount: editData.discount_amount,
        notes: editData.notes || null,
        subtotal: editSubtotal,
        total: editTotal > 0 ? editTotal : 0,
        amount_to_collect: editAmountToCollect,
      }).eq("id", orderId!);
      if (orderErr) throw orderErr;

      // Delete removed items
      if (deletedItemIds.length > 0) {
        const { error: delErr } = await supabase.from("order_items").delete().in("id", deletedItemIds);
        if (delErr) throw delErr;
      }

      // Update remaining items
      for (const item of editItems) {
        const { error: itemErr } = await supabase.from("order_items").update({
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity,
        }).eq("id", item.id);
        if (itemErr) throw itemErr;
      }

      // Add note about edit
      await supabase.from("order_notes").insert({
        order_id: orderId!,
        note: "Order edited by admin",
        created_by: "admin",
      } as any);

      queryClient.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-notes", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-overview"] });
      toast.success("Order updated successfully");
      setEditMode(false);
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!orderId) return null;

  const getItemDescription = () => {
    if (!order?.order_items) return "";
    return order.order_items.map((i: any) => `${i.quantity}x ${i.product_name} Size ${i.size}`).join(", ");
  };

  const getTotalQuantity = () => {
    if (!order?.order_items) return "0";
    return String(order.order_items.reduce((sum: number, i: any) => sum + i.quantity, 0));
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/^\+880/, "0").replace(/^880/, "0");
  };

  const copyAllAsText = () => {
    if (!order) return;
    const text = [
      `Name: ${order.customer_name}`,
      `Phone: ${formatPhone(order.customer_phone)}`,
      `Address: ${order.customer_address}`,
      `City: ${order.customer_city}`,
      `Amount: ${order.total}`,
      `Items: ${getItemDescription()}`,
      `Qty: ${getTotalQuantity()}`,
      `Order ID: ${order.order_number}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("All details copied!");
  };

  return (
    <>
      {printOrder && <InvoicePrint order={printOrder} />}
      <Dialog open={!!orderId} onOpenChange={(open) => { if (!open) { cancelEdit(); onClose(); } }}>
        <DialogContent className="max-w-[900px] w-[95vw] p-0 gap-0 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-semibold">
                Order #{order?.order_number || "..."}
              </DialogTitle>
              {order && !editMode && (
                <Badge className={cn("capitalize text-[11px]", STATUS_COLORS[order.status] || "bg-muted")}>
                  {order.status?.replace(/_/g, " ")}
                </Badge>
              )}
              {editMode && (
                <Badge className="bg-amber-100 text-amber-800 text-[11px]">Editing</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!editMode && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={enterEditMode} disabled={!order}>
                    <Pencil className="w-3.5 h-3.5" /> Edit Order
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint} disabled={!order}>
                    <Printer className="w-3.5 h-3.5" /> Print
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleWhatsApp} disabled={!order}>
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Body */}
          <ScrollArea className="flex-1 overflow-y-auto">
            {isLoading || !order ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
              </div>
            ) : editMode && editData ? (
              /* ═══════════ EDIT MODE ═══════════ */
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div className="bg-background border border-border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Customer Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Full Name</label>
                      <Input value={editData.customer_name} onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Phone</label>
                      <Input value={editData.customer_phone} onChange={(e) => setEditData({ ...editData, customer_phone: e.target.value })} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Address</label>
                    <Textarea value={editData.customer_address} onChange={(e) => setEditData({ ...editData, customer_address: e.target.value })} rows={2} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">City / District</label>
                    <Input value={editData.customer_city} onChange={(e) => setEditData({ ...editData, customer_city: e.target.value })} className="mt-1" />
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-background border border-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3">Order Items</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Product</th>
                        <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground">Size</th>
                        <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                        <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground">Price</th>
                        <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.map((item, idx) => (
                        <tr key={item.id} className="border-b border-border/50">
                          <td className="px-3 py-2 text-foreground">{item.product_name}</td>
                          <td className="px-2 py-2 text-center">
                            <Badge variant="outline" className="text-[10px]">{item.size}</Badge>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...editItems];
                                updated[idx] = { ...updated[idx], quantity: Math.max(1, parseInt(e.target.value) || 1) };
                                setEditItems(updated);
                              }}
                              className="w-16 h-7 text-center text-xs"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              type="number"
                              min={0}
                              value={item.unit_price}
                              onChange={(e) => {
                                const updated = [...editItems];
                                updated[idx] = { ...updated[idx], unit_price: Math.max(0, parseInt(e.target.value) || 0) };
                                setEditItems(updated);
                              }}
                              className="w-20 h-7 text-right text-xs"
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-xs">{formatPrice(item.unit_price * item.quantity)}</td>
                          <td className="px-2 py-2">
                            {editItems.length > 1 && (
                              <button
                                onClick={() => {
                                  setDeletedItemIds([...deletedItemIds, item.id]);
                                  setEditItems(editItems.filter((_, i) => i !== idx));
                                }}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pricing & Delivery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-background border border-border rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-semibold">Delivery Zone</h3>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: "inside_dhaka", label: "📍 Inside Dhaka — ৳100" },
                        { value: "outside_dhaka", label: "🚚 Outside Dhaka — ৳130" },
                        { value: "walk_in", label: "🏪 Walk-in — ৳0" },
                      ]).map((zone) => (
                        <button
                          key={zone.value}
                          onClick={() => updateDeliveryZone(zone.value)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                            editData.delivery_zone === zone.value
                              ? "bg-foreground text-background border-foreground"
                              : "bg-background text-foreground border-border hover:border-foreground/50"
                          )}
                        >
                          {zone.label}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Delivery Charge</label>
                      <Input
                        type="number"
                        value={editData.delivery_charge}
                        onChange={(e) => setEditData({ ...editData, delivery_charge: parseInt(e.target.value) || 0 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Discount</label>
                      <Input
                        type="number"
                        value={editData.discount_amount}
                        onChange={(e) => setEditData({ ...editData, discount_amount: parseInt(e.target.value) || 0 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-background border border-border rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-semibold">Payment</h3>
                    <div>
                      <label className="text-xs text-muted-foreground">Method</label>
                      <Select value={editData.payment_method} onValueChange={(v) => setEditData({ ...editData, payment_method: v })}>
                        <SelectTrigger className="text-sm h-8 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COD">COD</SelectItem>
                          <SelectItem value="bKash">bKash</SelectItem>
                          <SelectItem value="Nagad">Nagad</SelectItem>
                          <SelectItem value="In-Store">In-Store</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Payment Status</label>
                      <Select value={editData.payment_status} onValueChange={(v) => setEditData({ ...editData, payment_status: v })}>
                        <SelectTrigger className="text-sm h-8 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Advance Amount</label>
                      <Input
                        type="number"
                        value={editData.advance_amount}
                        onChange={(e) => setEditData({ ...editData, advance_amount: parseInt(e.target.value) || 0 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Status & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2">Order Status</h3>
                    <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                      <SelectTrigger className="text-sm capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_LIST.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2">Notes</h3>
                    <Textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={3}
                      className="text-sm"
                      placeholder="Order notes..."
                    />
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-1">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span><span>{formatPrice(editSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Delivery</span><span>{formatPrice(editData.delivery_charge)}</span>
                  </div>
                  {editData.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span><span>-{formatPrice(editData.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
                    <span>Total</span><span>{formatPrice(editTotal > 0 ? editTotal : 0)}</span>
                  </div>
                  {editData.advance_amount > 0 && (
                    <div className="flex justify-between text-sm text-amber-600 pt-1">
                      <span>Amount to Collect</span><span>{formatPrice(editAmountToCollect)}</span>
                    </div>
                  )}
                </div>

                {/* Save / Cancel */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                  <Button onClick={saveEdit} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              /* ═══════════ VIEW MODE ═══════════ */
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
                {/* Left Column (60%) */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Quick Copy Section */}
                  <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <ClipboardList className="w-4 h-4" /> Courier Entry — Copy & Paste
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Click any field to copy</p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={copyAllAsText}>
                        <Copy className="w-3 h-3" /> Copy All
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <CopyCard label="Recipient Name" value={order.customer_name} />
                      <CopyCard label="Recipient Phone" value={formatPhone(order.customer_phone)} />
                      <CopyCard label="Recipient Address" value={order.customer_address} />
                      <CopyCard label="City / District" value={order.customer_city} />
                      <CopyCard label="Amount to Collect (COD)" value={String(order.total)} />
                      <CopyCard label="Item Quantity" value={getTotalQuantity()} />
                    </div>
                    <CopyCard label="Item Description" value={getItemDescription()} />
                    <CopyCard label="Merchant Order ID" value={order.order_number || ""} />
                  </div>

                  {/* Order Items */}
                  <div className="bg-background border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-semibold">Order Items</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Product</th>
                          <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground">Size</th>
                          <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground">Price</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.order_items?.map((item: any) => (
                          <tr key={item.id} className="border-b border-border/50">
                            <td className="px-4 py-2.5 text-foreground">{item.product_name}</td>
                            <td className="px-2 py-2.5 text-center">
                              <Badge variant="outline" className="text-[10px]">{item.size}</Badge>
                            </td>
                            <td className="px-2 py-2.5 text-center text-muted-foreground">{item.quantity}</td>
                            <td className="px-2 py-2.5 text-right text-muted-foreground">{formatPrice(item.unit_price)}</td>
                            <td className="px-4 py-2.5 text-right font-medium">{formatPrice(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-3 border-t border-border space-y-1">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Delivery</span><span>{formatPrice(order.delivery_charge ?? 0)}</span>
                      </div>
                      {(order.discount_amount ?? 0) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                          <span>-{formatPrice(order.discount_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
                        <span>Total</span><span>{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Notes */}
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-3">Order Notes</h3>
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                      {notes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No notes yet.</p>
                      ) : (
                        notes.map((note: any) => (
                          <div key={note.id} className="border-l-2 border-border pl-3 py-1">
                            <p className="text-sm text-foreground">{note.note}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })} — by {note.created_by}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note..."
                        className="text-sm min-h-[50px]"
                      />
                      <Button
                        size="sm"
                        className="self-end"
                        disabled={!noteText.trim() || noteMutation.isPending}
                        onClick={() => noteMutation.mutate(noteText.trim())}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Column (40%) */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Order Status */}
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2">Order Status</h3>
                    <div className="flex gap-2">
                      <Select value={newStatus || order.status} onValueChange={setNewStatus}>
                        <SelectTrigger className="text-sm capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_LIST.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={(!newStatus || newStatus === order.status) || statusMutation.isPending}
                        onClick={() => statusMutation.mutate(newStatus)}
                      >
                        Update
                      </Button>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2">Customer Details</h3>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-foreground">{order.customer_name}</p>
                      <p className="text-muted-foreground">{order.customer_phone}</p>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2">Shipping Address</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">{order.customer_address}</p>
                      <p className="text-muted-foreground">{order.customer_city}</p>
                      {order.delivery_zone && (
                        <p className="text-muted-foreground text-xs mt-1">
                          📦 {order.delivery_zone === "outside_dhaka" ? "Outside Dhaka" : order.delivery_zone === "walk_in" ? "Walk-in" : "Inside Dhaka"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-3">Payment Breakdown</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order Total</span>
                        <span className="font-medium">{formatPrice(order.total)}</span>
                      </div>
                      {(order.advance_amount > 0 || order.payment_type === 'advance_cod') && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Advance Paid</span>
                            <span className="text-green-600 font-medium">✓ {formatPrice(order.advance_amount || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">To Collect</span>
                            <span className="text-amber-600 font-medium">⚠️ {formatPrice(order.amount_to_collect || (order.total - (order.advance_amount || 0)))}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between pt-1 border-t border-border">
                        <span className="text-muted-foreground">Method</span>
                        <span>{order.payment_method || "COD"}{order.payment_type === 'advance_cod' ? ' + COD' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className={cn("text-[10px] capitalize", PAYMENT_STATUS_COLORS[order.payment_status || "unpaid"])}>
                          {order.payment_status || "unpaid"}
                        </Badge>
                      </div>
                    </div>
                    {(order.payment_status === 'partial' || order.payment_status === 'unpaid') && (
                      <Button
                        size="sm"
                        className="w-full mt-3 text-xs"
                        onClick={() => {
                          paymentMutation.mutate({ status: 'paid' });
                          supabase.from("orders").update({
                            payment_status: 'paid',
                            advance_amount: order.total,
                            amount_to_collect: 0,
                          }).eq("id", orderId!).then(() => {
                            queryClient.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
                            queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
                          });
                        }}
                      >
                        Mark as Fully Paid
                      </Button>
                    )}
                  </div>

                  {/* Payment Method/Status Edit */}
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2">Edit Payment</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Method</label>
                        <Select
                          value={paymentMethod || order.payment_method || "COD"}
                          onValueChange={(v) => {
                            setPaymentMethod(v);
                            paymentMutation.mutate({ method: v });
                          }}
                        >
                          <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COD">COD</SelectItem>
                            <SelectItem value="bKash">bKash</SelectItem>
                            <SelectItem value="Nagad">Nagad</SelectItem>
                            <SelectItem value="In-Store">In-Store</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Status</label>
                        <Select
                          value={paymentStatus || order.payment_status || "unpaid"}
                          onValueChange={(v) => {
                            setPaymentStatus(v);
                            paymentMutation.mutate({ status: v });
                          }}
                        >
                          <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unpaid">Unpaid</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Order Meta */}
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2">Order Info</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order #</span>
                        <span className="font-mono font-medium">{order.order_number}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Source</span>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", SOURCE_COLORS[order.source ?? "Website"] || "bg-muted")}>
                          {order.source ?? "Website"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="text-xs">{format(new Date(order.created_at), "PPpp")}</span>
                      </div>
                      {order.delivery_note && (
                        <div>
                          <span className="text-muted-foreground block text-xs">Delivery Note</span>
                          <p className="text-foreground mt-0.5 text-xs">{order.delivery_note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrderDetailModal;
