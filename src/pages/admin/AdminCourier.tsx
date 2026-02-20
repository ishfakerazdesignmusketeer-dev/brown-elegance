import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatPrice } from "@/lib/format";
import { Copy, ChevronDown, ChevronUp, Info } from "lucide-react";
import { toast } from "sonner";

interface CourierOrder {
  order_number: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  total: number;
}

interface CourierBooking {
  id: string;
  order_id: string | null;
  courier_service: string;
  tracking_number: string | null;
  booking_status: string;
  consignee_name: string | null;
  consignee_phone: string | null;
  consignee_address: string | null;
  cod_amount: number | null;
  weight: number | null;
  notes: string | null;
  booked_at: string | null;
  created_at: string;
  orders: CourierOrder | null;
}

type StatusFilter = "all" | "pending" | "booked" | "picked" | "delivered" | "failed";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  booked: "bg-blue-100 text-blue-700",
  picked: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const BOOKING_STATUS_OPTIONS = ["pending", "booked", "picked", "delivered", "failed"] as const;

const AdminCourier = () => {
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-courier-bookings", activeTab],
    queryFn: async (): Promise<CourierBooking[]> => {
      let query = supabase
        .from("courier_bookings")
        .select("*, orders(order_number, customer_name, customer_phone, customer_address, customer_city, total)")
        .order("created_at", { ascending: false });
      if (activeTab !== "all") query = query.eq("booking_status", activeTab);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CourierBooking[];
    },
    refetchInterval: 60000,
  });

  const updateStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase
      .from("courier_bookings")
      .update({ booking_status: status })
      .eq("id", bookingId);
    if (error) toast.error("Failed to update status");
    else {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-courier-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-courier-today"] });
    }
  };

  const copyTracking = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber).then(() => toast.success("Tracking number copied"));
  };

  const tabs: StatusFilter[] = ["all", "pending", "booked", "picked", "delivered", "failed"];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Courier Bookings</h1>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          <strong>Pathao & Steadfast API integration coming soon.</strong>{" "}
          Use manual tracking entry from the Orders page in the meantime.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
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

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-6 px-4 py-3"></th>
                {["Order #", "Customer", "Address", "COD", "Service", "Tracking #", "Status", "Booked At"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">No courier bookings found</td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <>
                    <tr
                      key={booking.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                    >
                      <td className="px-4 py-3">
                        {expandedId === booking.id
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 whitespace-nowrap">
                        {booking.orders?.order_number ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{booking.orders?.customer_name ?? booking.consignee_name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {booking.orders
                          ? `${booking.orders.customer_address}, ${booking.orders.customer_city}`
                          : booking.consignee_address ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                        {booking.cod_amount ? formatPrice(booking.cod_amount) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{booking.courier_service}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {booking.tracking_number ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-gray-700">{booking.tracking_number}</span>
                            <button
                              onClick={() => copyTracking(booking.tracking_number!)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy tracking number"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[booking.booking_status] ?? "bg-gray-100 text-gray-600"}`}>
                          {booking.booking_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {booking.booked_at ? format(new Date(booking.booked_at), "MMM d, HH:mm") : "—"}
                      </td>
                    </tr>

                    {expandedId === booking.id && (
                      <tr key={`${booking.id}-expanded`} className="bg-gray-50/80">
                        <td colSpan={9} className="px-8 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Full Address</p>
                              <p className="text-sm text-gray-900">{booking.orders?.customer_name ?? booking.consignee_name}</p>
                              <p className="text-sm text-gray-600">{booking.orders?.customer_phone ?? booking.consignee_phone}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {booking.orders
                                  ? `${booking.orders.customer_address}, ${booking.orders.customer_city}`
                                  : `${booking.consignee_address}`}
                              </p>
                              {booking.notes && (
                                <p className="text-xs text-gray-500 mt-2 italic">{booking.notes}</p>
                              )}
                              <div className="mt-3 text-sm text-gray-600">
                                <span className="text-xs text-gray-400">Weight: </span>{booking.weight ?? 0.5} kg
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Update Status</p>
                              <select
                                value={booking.booking_status}
                                onChange={(e) => updateStatus(booking.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm border border-gray-200 rounded px-3 py-2 text-gray-700 w-full max-w-xs"
                              >
                                {BOOKING_STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s} className="capitalize">{s}</option>
                                ))}
                              </select>
                              {booking.tracking_number && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tracking Number</p>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-gray-700 bg-white border border-gray-200 rounded px-2 py-1">{booking.tracking_number}</span>
                                    <button
                                      onClick={() => copyTracking(booking.tracking_number!)}
                                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded flex items-center gap-1"
                                    >
                                      <Copy className="w-3 h-3" /> Copy
                                    </button>
                                  </div>
                                </div>
                              )}
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
    </div>
  );
};

export default AdminCourier;
