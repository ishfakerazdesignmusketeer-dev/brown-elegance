import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatPrice } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  status: Status;
  subtotal: number;
  delivery_charge: number;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

const getProjectId = () => import.meta.env.VITE_SUPABASE_PROJECT_ID;

const fetchOrders = async (status: string, search: string): Promise<Order[]> => {
  const projectId = getProjectId();
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  const url = `https://${projectId}.supabase.co/functions/v1/get-orders?${params}`;
  const res = await fetch(url, {
    headers: {
      "x-admin-token": "brown_admin_authenticated",
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  return data.orders ?? [];
};

const updateOrderStatus = async (orderId: string, newStatus: string): Promise<void> => {
  const projectId = getProjectId();
  const params = new URLSearchParams({ updateId: orderId, newStatus });
  const url = `https://${projectId}.supabase.co/functions/v1/get-orders?${params}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "x-admin-token": "brown_admin_authenticated",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Failed to update status");
};

const AdminOrders = () => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders-list", activeTab, debouncedSearch],
    queryFn: () => fetchOrders(activeTab, debouncedSearch),
    refetchInterval: 30000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const tabs = ["all", ...STATUS_OPTIONS];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Orders</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order # or phone..."
            className="pl-8 h-8 text-xs border-gray-200 rounded"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["", "Order #", "Customer", "Phone", "Items", "Total", "Status", "Time"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <>
                    <tr
                      key={order.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <td className="px-4 py-3">
                        {expandedId === order.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 whitespace-nowrap">
                        {order.order_number}
                      </td>
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
                            <option key={s} value={s} className="bg-white text-gray-900">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedId === order.id && (
                      <tr key={`${order.id}-expanded`} className="bg-gray-50">
                        <td colSpan={8} className="px-8 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Delivery Info */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                Delivery Address
                              </p>
                              <p className="text-sm text-gray-700">{order.customer_address}</p>
                              <p className="text-sm text-gray-700">{order.customer_city}</p>
                              {order.notes && (
                                <p className="text-xs text-gray-500 mt-2 italic">Note: {order.notes}</p>
                              )}
                            </div>

                            {/* Order Items */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                Items
                              </p>
                              <div className="space-y-1">
                                {(order.order_items ?? []).map((item) => (
                                  <div key={item.id} className="flex justify-between text-sm text-gray-700">
                                    <span>
                                      {item.product_name} · {item.size} × {item.quantity}
                                    </span>
                                    <span className="text-gray-900 ml-4">{formatPrice(item.total_price)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm font-semibold text-gray-900">
                                <span>Total</span>
                                <span>{formatPrice(order.total)}</span>
                              </div>
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

export default AdminOrders;
