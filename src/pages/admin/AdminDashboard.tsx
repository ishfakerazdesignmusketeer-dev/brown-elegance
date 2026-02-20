import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  total: number;
  created_at: string;
  order_items: { id: string }[];
}

const AdminDashboard = () => {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    refetchInterval: 30000,
  });

  const today = new Date().toDateString();

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const todayRevenue = orders
    .filter((o) => new Date(o.created_at).toDateString() === today)
    .reduce((s, o) => s + o.total, 0);
  const totalRevenue = orders
    .filter((o) => ["confirmed", "shipped", "delivered"].includes(o.status))
    .reduce((s, o) => s + o.total, 0);

  const recentOrders = [...orders].slice(0, 10);

  const stats = [
    { label: "Total Orders", value: totalOrders },
    { label: "Pending Orders", value: pendingOrders },
    { label: "Today's Revenue", value: formatPrice(todayRevenue) },
    { label: "Total Revenue", value: formatPrice(totalRevenue) },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{isLoading ? "—" : stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs text-gray-500 hover:text-gray-900 underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Order #", "Customer", "Items", "Total", "Status", "Time", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                    No orders yet
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-900">{order.order_number}</td>
                    <td className="px-5 py-3 text-gray-700">{order.customer_name}</td>
                    <td className="px-5 py-3 text-gray-500">{order.order_items?.length ?? 0}</td>
                    <td className="px-5 py-3 text-gray-900">{formatPrice(order.total)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-5 py-3">
                      <Link to="/admin/orders" className="text-xs text-gray-500 hover:text-gray-900 underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
