import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Printer, Trash2, MessageCircle, Package, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import InvoicePrint from "@/components/admin/InvoicePrint";
import { cn } from "@/lib/utils";

const STATUS_LIST = ["pending", "processing", "completed", "cancelled", "refunded"] as const;
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
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

const BOOKING_STATUS_OPTIONS = ["pending", "booked", "picked", "delivered", "failed"] as const;
const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  booked: "bg-blue-100 text-blue-700",
  picked: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const AdminOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [newStatus, setNewStatus] = useState<string>("");
  const [noteText, setNoteText] = useState("");
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [weightInput, setWeightInput] = useState("0.5");
  const [courierNotes, setCourierNotes] = useState("");

  // Fetch order
  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Fetch notes
  const { data: notes = [] } = useQuery({
    queryKey: ["order-notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_notes")
        .select("*")
        .eq("order_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  // Fetch courier booking
  const { data: booking } = useQuery({
    queryKey: ["courier-booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_bookings")
        .select("*")
        .eq("order_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Status update
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id!);
      if (error) throw error;
      await supabase.from("order_notes").insert({ order_id: id!, note: `Status changed to ${status}`, created_by: "admin" } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["order-notes", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Add note
  const noteMutation = useMutation({
    mutationFn: async (note: string) => {
      const { error } = await supabase.from("order_notes").insert({ order_id: id!, note, created_by: "admin" } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-notes", id] });
      setNoteText("");
      toast.success("Note added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete order
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order deleted");
      navigate("/admin/orders");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Save courier tracking
  const saveCourier = async () => {
    if (!trackingInput.trim()) { toast.error("Enter a tracking number"); return; }
    try {
      const { data: newBooking, error } = await supabase
        .from("courier_bookings")
        .insert({
          order_id: id!,
          courier_service: "manual",
          tracking_number: trackingInput.trim(),
          cod_amount: order.total,
          weight: parseFloat(weightInput) || 0.5,
          notes: courierNotes || null,
          consignee_name: order.customer_name,
          consignee_phone: order.customer_phone,
          consignee_address: `${order.customer_address}, ${order.customer_city}`,
          booked_at: new Date().toISOString(),
          booking_status: "booked",
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("orders").update({ courier_booking_id: newBooking.id }).eq("id", id!);
      toast.success("Tracking saved");
      queryClient.invalidateQueries({ queryKey: ["courier-booking", id] });
    } catch {
      toast.error("Failed to save tracking");
    }
  };

  const updateBookingStatus = async (status: string) => {
    if (!booking) return;
    const { error } = await supabase.from("courier_bookings").update({ booking_status: status }).eq("id", booking.id);
    if (error) toast.error("Failed");
    else {
      toast.success("Courier status updated");
      queryClient.invalidateQueries({ queryKey: ["courier-booking", id] });
    }
  };

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

  if (isLoading || !order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  return (
    <div>
      {printOrder && <InvoicePrint order={printOrder} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orders")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Order #{order.order_number}</h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(order.created_at), "PPpp")}
          </p>
        </div>
        <Badge className={cn("ml-2 capitalize", STATUS_COLORS[order.status] || "bg-muted")}>
          {order.status}
        </Badge>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column - 3/5 */}
        <div className="lg:col-span-3 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">Product</th>
                    <th className="text-center py-2 text-xs font-medium text-muted-foreground">Size</th>
                    <th className="text-center py-2 text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground">Price</th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item: any) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-3 text-foreground">{item.product_name}</td>
                      <td className="py-3 text-center">
                        <Badge variant="outline" className="text-[10px]">{item.size}</Badge>
                      </td>
                      <td className="py-3 text-center text-muted-foreground">{item.quantity}</td>
                      <td className="py-3 text-right text-muted-foreground">{formatPrice(item.unit_price)}</td>
                      <td className="py-3 text-right font-medium">{formatPrice(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-border mt-2 pt-3 space-y-1">
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
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Order Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
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
                  className="text-sm min-h-[60px]"
                />
                <Button
                  size="sm"
                  className="self-end"
                  disabled={!noteText.trim() || noteMutation.isPending}
                  onClick={() => noteMutation.mutate(noteText.trim())}
                >
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - 2/5 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Select value={newStatus || order.status} onValueChange={setNewStatus}>
                  <SelectTrigger className="text-sm capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
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
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5" /> Print Invoice
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleWhatsApp}>
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Order
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this order?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate()}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-foreground">{order.customer_name}</p>
              <p className="text-muted-foreground">{order.customer_phone}</p>
              <p className="text-muted-foreground">{order.customer_address}</p>
              <p className="text-muted-foreground">{order.customer_city}</p>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{order.payment_method || "COD"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge className={cn("text-[10px] capitalize", PAYMENT_STATUS_COLORS[order.payment_status] || "bg-muted")}>
                  {order.payment_status || "unpaid"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Order Meta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Order Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
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
                <span>{format(new Date(order.created_at), "PPpp")}</span>
              </div>
              {order.delivery_note && (
                <div>
                  <span className="text-muted-foreground block text-xs">Delivery Note</span>
                  <p className="text-foreground mt-0.5">{order.delivery_note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Courier */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Courier
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{booking.courier_service}</span>
                    <Badge className={cn("text-[10px] capitalize", BOOKING_STATUS_COLORS[booking.booking_status ?? ""] || "bg-muted")}>
                      {booking.booking_status}
                    </Badge>
                  </div>
                  {booking.tracking_number && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{booking.tracking_number}</span>
                      <button onClick={() => { navigator.clipboard.writeText(booking.tracking_number!); toast.success("Copied"); }}>
                        <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  )}
                  {booking.booked_at && (
                    <p className="text-xs text-muted-foreground">Booked: {format(new Date(booking.booked_at), "MMM d, HH:mm")}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <select
                      value={booking.booking_status ?? "pending"}
                      onChange={(e) => updateBookingStatus(e.target.value)}
                      className="text-xs border border-border rounded px-2 py-1"
                    >
                      {BOOKING_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Tracking Number *</label>
                    <Input value={trackingInput} onChange={(e) => setTrackingInput(e.target.value)} placeholder="e.g. STF123456" className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Weight (kg)</label>
                    <Input type="number" step="0.1" min="0.1" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                    <Textarea value={courierNotes} onChange={(e) => setCourierNotes(e.target.value)} rows={2} placeholder="Optional..." className="text-xs" />
                  </div>
                  <Button size="sm" onClick={saveCourier} className="w-full">Save Tracking</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
