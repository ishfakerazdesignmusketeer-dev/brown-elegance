import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { formatDistanceToNow, format } from "date-fns";
import { ChevronDown, ChevronUp, Search, Printer, MessageCircle, CheckSquare, Square, Copy, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import InvoicePrint from "@/components/admin/InvoicePrint";

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const STATUS_COLORS: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

interface OrderItem {
  id: string;
  product_name: string;
  product_id: string | null;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  notes: string | null;
  delivery_note: string | null;
  coupon_code: string | null;
  discount_amount: number | null;
  status: Status;
  subtotal: number;
  delivery_charge: number;
  total: number;
  payment_method: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const BULK_STATUS_OPTIONS = ["confirmed", "processing", "shipped", "cancelled"] as const;

const BOOKING_STATUS_OPTIONS = ["pending", "booked", "picked", "delivered", "failed"] as const;

interface CourierBooking {
  id: string;
  courier_service: string;
  tracking_number: string | null;
  booking_status: string;
  booked_at: string | null;
  cod_amount: number | null;
  weight: number | null;
  notes: string | null;
}

const CourierSection = ({ order }: { order: Order }) => {
  const [trackingInput, setTrackingInput] = useState("");
  const [weightInput, setWeightInput] = useState("0.5");
  const [notesInput, setNotesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["courier-booking", order.id],
    queryFn: async (): Promise<CourierBooking | null> => {
      const { data, error } = await supabase
        .from("courier_bookings")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();
      if (error) throw error;
      return data as CourierBooking | null;
    },
  });

  const saveTracking = async () => {
    if (!trackingInput.trim()) { toast.error("Enter a tracking number"); return; }
    setSaving(true);
    try {
      const { data: newBooking, error: bookingError } = await supabase
        .from("courier_bookings")
        .insert({
          order_id: order.id,
          courier_service: "manual",
          tracking_number: trackingInput.trim(),
          cod_amount: order.total,
          weight: parseFloat(weightInput) || 0.5,
          notes: notesInput || null,
          consignee_name: order.customer_name,
          consignee_phone: order.customer_phone,
          consignee_address: `${order.customer_address}, ${order.customer_city}`,
          booked_at: new Date().toISOString(),
          booking_status: "booked",
        })
        .select("id")
        .single();
      if (bookingError || !newBooking) throw bookingError;
      await supabase.from("orders").update({ courier_booking_id: newBooking.id }).eq("id", order.id);
      toast.success("Tracking number saved");
      queryClient.invalidateQueries({ queryKey: ["courier-booking", order.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-courier-today"] });
    } catch {
      toast.error("Failed to save tracking");
    } finally {
      setSaving(false);
    }
  };

  const updateBookingStatus = async (status: string) => {
    if (!booking) return;
    const { error } = await supabase.from("courier_bookings").update({ booking_status: status }).eq("id", booking.id);
    if (error) toast.error("Failed to update status");
    else {
      toast.success("Courier status updated");
      queryClient.invalidateQueries({ queryKey: ["courier-booking", order.id] });
    }
  };

  const BOOKING_STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    booked: "bg-blue-100 text-blue-700",
    picked: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  if (isLoading) return <div className="h-4 bg-gray-100 rounded animate-pulse w-32" />;

  return (
    <div className="border-t border-gray-200 mt-4 pt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5" /> Courier
      </p>
      {booking ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900 capitalize">{booking.courier_service}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${BOOKING_STATUS_COLORS[booking.booking_status] ?? "bg-gray-100 text-gray-600"}`}>
              {booking.booking_status}
            </span>
          </div>
          {booking.tracking_number && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-700">{booking.tracking_number}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(booking.tracking_number!); toast.success("Copied"); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {booking.booked_at && (
            <p className="text-xs text-gray-400">Booked: {format(new Date(booking.booked_at), "MMM d, HH:mm")}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs text-gray-500">Update Status:</label>
            <select
              value={booking.booking_status}
              onChange={(e) => updateBookingStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700"
            >
              {BOOKING_STATUS_OPTIONS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Manual Tracking Entry</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Tracking Number *</label>
              <Input
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="e.g. STF123456"
                className="h-8 text-xs border-gray-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Weight (kg)</label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="h-8 text-xs border-gray-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">COD Amount (auto)</label>
            <div className="h-8 text-xs border border-gray-100 rounded px-3 flex items-center text-gray-500 bg-white">
              {formatPrice(order.total)}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notes</label>
            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              rows={2}
              placeholder="Optional courier notes..."
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-gray-700 resize-none focus:outline-none focus:border-gray-400"
            />
          </div>
          <button
            onClick={saveTracking}
            disabled={saving}
            className="text-xs bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? "Saving..." : "Save Tracking Number"}
          </button>
          <div className="border-t border-gray-200 pt-2 mt-1">
            <p className="text-xs text-gray-400 italic">Pathao & Steadfast API booking coming soon.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminOrders = () => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("confirmed");
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders-list", activeTab, debouncedSearch],
    queryFn: async (): Promise<Order[]> => {
      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (activeTab !== "all") query = query.eq("status", activeTab);
      if (debouncedSearch) {
        query = query.or(
          `order_number.ilike.%${debouncedSearch}%,customer_phone.ilike.%${debouncedSearch}%,customer_name.ilike.%${debouncedSearch}%`
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
    refetchInterval: 30000,
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-count"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deliveryNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase.from("orders").update({ delivery_note: note }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      toast.success("Delivery note saved");
    },
    onError: () => toast.error("Failed to save note"),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-count"] });
      setSelectedIds(new Set());
      toast.success(`${ids.length} orders updated to ${bulkStatus}`);
    },
    onError: () => toast.error("Bulk update failed"),
  });

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(orders.map((o) => o.id)));
  };

  const handlePrint = (order: Order) => {
    setPrintOrder(order);
    setTimeout(() => window.print(), 100);
  };

  const handleWhatsApp = (order: Order) => {
    const items = order.order_items
      .map((i) => `${i.product_name} | ${i.size} × ${i.quantity} | ${formatPrice(i.total_price)}`)
      .join("\n");
    const msg = `🟤 Order Update — BROWN HOUSE\n\nOrder: ${order.order_number}\nCustomer: ${order.customer_name}\nPhone: ${order.customer_phone}\nAddress: ${order.customer_address}, ${order.customer_city}\n\nItems:\n${items}\n\nTotal: ${formatPrice(order.total)}\nStatus: ${order.status.toUpperCase()}`;
    window.open(`https://wa.me/${order.customer_phone.replace(/^0/, "88")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const tabs = ["all", ...STATUS_OPTIONS];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Orders</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                activeTab === tab ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order #, name, or phone..."
            className="pl-8 h-8 text-xs border-gray-200 rounded"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-gray-900 text-white px-4 py-3 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="text-xs bg-gray-700 text-white border-0 rounded px-2 py-1.5 cursor-pointer"
          >
            {BULK_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => bulkMutation.mutate({ ids: Array.from(selectedIds), status: bulkStatus })}
            disabled={bulkMutation.isPending}
            className="text-xs bg-white text-gray-900 font-semibold px-3 py-1.5 rounded hover:bg-gray-100 transition-colors"
          >
            Apply
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 w-8">
                  <button onClick={toggleAll} className="flex items-center text-gray-400">
                    {allSelected ? <CheckSquare className="w-4 h-4 text-gray-700" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="w-6 px-1 py-3"></th>
                {["Order #", "Customer", "Phone", "Items", "Total", "Status", "Time"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">No orders found</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <>
                    <tr
                      key={order.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.has(order.id) ? "bg-blue-50" : ""}`}
                      onClick={() => toggleExpand(order.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(order.id); }}>
                        {selectedIds.has(order.id)
                          ? <CheckSquare className="w-4 h-4 text-gray-700" />
                          : <Square className="w-4 h-4 text-gray-300" />
                        }
                      </td>
                      <td className="px-1 py-3">
                        {expandedId === order.id
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 whitespace-nowrap">{order.order_number}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{order.customer_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{order.customer_phone}</td>
                      <td className="px-4 py-3 text-gray-500">{order.order_items?.length ?? 0}</td>
                      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status}
                          onChange={(e) => mutation.mutate({ id: order.id, status: e.target.value })}
                          className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer ${STATUS_COLORS[order.status]}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} className="bg-white text-gray-900">{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </td>
                    </tr>

                    {expandedId === order.id && (
                      <tr key={`${order.id}-expanded`} className="bg-gray-50/80">
                        <td colSpan={9} className="px-8 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Customer Info */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</p>
                              <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                              <p className="text-sm text-gray-600">{order.customer_phone}</p>
                              <p className="text-sm text-gray-600 mt-1">{order.customer_address}</p>
                              <p className="text-sm text-gray-600">{order.customer_city}</p>
                              {order.notes && (
                                <p className="text-xs text-gray-500 mt-2 italic bg-amber-50 border border-amber-100 rounded px-2 py-1">
                                  Note: {order.notes}
                                </p>
                              )}
                              {/* Delivery Note */}
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Delivery Note</p>
                                <textarea
                                  rows={2}
                                  defaultValue={order.delivery_note ?? ""}
                                  placeholder="Add delivery note..."
                                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-gray-700 resize-none focus:outline-none focus:border-gray-400"
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    if (val !== (order.delivery_note ?? "")) {
                                      deliveryNoteMutation.mutate({ id: order.id, note: val });
                                    }
                                  }}
                                />
                              </div>
                            </div>

                            {/* Items */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                              <div className="space-y-2">
                                {(order.order_items ?? []).map((item) => (
                                  <div key={item.id} className="flex items-center justify-between text-sm">
                                    <div>
                                      <span className="text-gray-900 font-medium">{item.product_name}</span>
                                      <span className="text-gray-500 ml-2 text-xs">{item.size} × {item.quantity}</span>
                                    </div>
                                    <span className="text-gray-900 font-medium">{formatPrice(item.total_price)}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Totals breakdown */}
                              <div className="border-t border-gray-200 mt-3 pt-3 space-y-1.5">
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Delivery</span><span>{formatPrice(order.delivery_charge ?? 0)}</span>
                                </div>
                                {(order.discount_amount ?? 0) > 0 && (
                                  <div className="flex justify-between text-xs text-green-600">
                                    <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                                    <span>-{formatPrice(order.discount_amount ?? 0)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-200 pt-2">
                                  <span>Total</span><span>{formatPrice(order.total)}</span>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={() => handlePrint(order)}
                                  className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  Print Invoice
                                </button>
                                <button
                                  onClick={() => handleWhatsApp(order)}
                                  className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  WhatsApp
                                </button>
                              </div>
                            </div>

                            {/* Courier Section — spans full width */}
                            <div className="md:col-span-2">
                              <CourierSection order={order} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Invoice Print Area */}
      {printOrder && <InvoicePrint order={printOrder} />}
    </div>
  );
};

export default AdminOrders;
