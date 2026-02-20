import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { Info } from "lucide-react";
import { toast } from "sonner";

interface PaymentOrder {
  id: string;
  order_number: string | null;
  customer_name: string;
  total: number;
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const AdminPayments = () => {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-payments-orders"],
    queryFn: async (): Promise<PaymentOrder[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total, status, payment_status, payment_method")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PaymentOrder[];
    },
    refetchInterval: 30000,
  });

  const codPending = orders.filter((o) => (o.payment_status === "unpaid" || !o.payment_status) && o.payment_method === "COD").length;
  const deliveredTotal = orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + o.total, 0);

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("orders").update({ payment_status: "paid" }).eq("id", id);
    if (error) toast.error("Failed to update payment status");
    else {
      toast.success("Marked as paid");
      queryClient.invalidateQueries({ queryKey: ["admin-payments-orders"] });
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Payments</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">COD Pending Collection</p>
          <p className="text-2xl font-semibold text-amber-600">{codPending}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Revenue from Delivered Orders</p>
          <p className="text-2xl font-semibold text-green-700">{formatPrice(deliveredTotal)}</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          <strong>bKash & Nagad manual verification coming in next update.</strong>{" "}
          All current orders are Cash on Delivery.
        </p>
      </div>

      {/* COD Orders Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Order #", "Customer", "Total", "Order Status", "Payment Status", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No orders found</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isPaid = order.payment_status === "paid";
                  return (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 whitespace-nowrap">{order.order_number ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{order.customer_name}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status ?? "pending"] ?? "bg-gray-100 text-gray-600"}`}>
                          {order.status ?? "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!isPaid ? (
                          <button
                            onClick={() => markPaid(order.id)}
                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors font-medium"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">✓ Collected</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPayments;
