import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { formatDistanceToNow, format } from "date-fns";
import { X, MessageCircle } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  address: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  last_order_at: string | null;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  status: string;
  order_items: { id: string }[];
}

interface CustomerPanelProps {
  customer: Customer | null;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const CustomerPanel = ({ customer, onClose }: CustomerPanelProps) => {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-customer-orders", customer?.id],
    enabled: !!customer?.id,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  if (!customer) return null;

  const avgOrderValue = customer.total_orders > 0
    ? Math.round(customer.total_spent / customer.total_orders)
    : 0;

  const handleWhatsApp = () => {
    const phone = customer.phone.replace(/^0/, "88");
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-[480px] bg-white flex flex-col h-full overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Customer Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Customer Info */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{customer.phone}</p>
                {customer.city && <p className="text-sm text-gray-500">{customer.city}</p>}
                <p className="text-xs text-gray-400 mt-1">Member since {format(new Date(customer.created_at), "MMM yyyy")}</p>
              </div>
              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-semibold text-gray-900">{customer.total_orders}</p>
                <p className="text-xs text-gray-500 mt-0.5">Orders</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-base font-semibold text-gray-900">{formatPrice(customer.total_spent)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Spent</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-base font-semibold text-gray-900">{formatPrice(avgOrderValue)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Avg Order</p>
              </div>
            </div>
          </div>

          {/* Order History */}
          <div className="px-6 py-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order History</h4>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <p className="text-sm text-gray-400">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-mono text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(order.created_at), "dd MMM yyyy")} · {order.order_items?.length ?? 0} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatPrice(order.total)}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPanel;
