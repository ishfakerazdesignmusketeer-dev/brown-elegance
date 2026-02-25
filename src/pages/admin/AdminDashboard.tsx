import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatPrice } from "@/lib/format";
import { formatDistanceToNow, format, subDays, startOfDay } from "date-fns";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";

const STATUS_COLORS_HEX: Record<string, string> = {
  pending: "#FCD34D",
  processing: "#A78BFA",
  completed: "#34D399",
  cancelled: "#F87171",
  refunded: "#C084FC",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
};

const STATUS_OPTIONS = ["pending", "processing", "completed", "cancelled", "refunded"] as const;

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  total: number;
  subtotal: number;
  created_at: string;
  order_items: { id: string }[];
}

interface OrderItem {
  product_name: string;
  quantity: number;
  total_price: number;
}

const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-5">
    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{label}</p>
    <p className="text-2xl font-semibold text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const queryClient = useQueryClient();

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

  const { data: orderItems = [] } = useQuery({
    queryKey: ["admin-all-order-items"],
    queryFn: async (): Promise<OrderItem[]> => {
      const { data, error } = await supabase
        .from("order_items")
        .select("product_name, quantity, total_price");
      if (error) throw error;
      return data as OrderItem[];
    },
  });

  const { data: customerCount = 0 } = useQuery({
    queryKey: ["admin-customer-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: lowStockCount = 0 } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: async () => {
      const { count } = await supabase
        .from("product_variants")
        .select("*", { count: "exact", head: true })
        .lte("stock", 5);
      return count ?? 0;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const today = new Date().toDateString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalRevenue = completedOrders.reduce((s, o) => s + o.total, 0);
  const todayRevenue = orders
    .filter((o) => new Date(o.created_at).toDateString() === today && o.status === "completed")
    .reduce((s, o) => s + o.total, 0);
  const monthRevenue = orders
    .filter((o) => o.created_at >= monthStart && o.status === "completed")
    .reduce((s, o) => s + o.total, 0);
  const avgOrderValue = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  // Revenue chart data — last 30 days
  const revenueChartData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = startOfDay(date).toDateString();
    const rev = orders
      .filter((o) => new Date(o.created_at).toDateString() === dateStr && o.status === "completed")
      .reduce((s, o) => s + o.total, 0);
    return { date: format(date, "MMM d"), revenue: rev };
  });

  // Status breakdown
  const statusBreakdown = STATUS_OPTIONS.map((s) => ({
    name: s,
    value: orders.filter((o) => o.status === s).length,
  })).filter((s) => s.value > 0);

  // Top products
  const productMap: Record<string, { units: number; revenue: number }> = {};
  orderItems.forEach((item) => {
    if (!productMap[item.product_name]) productMap[item.product_name] = { units: 0, revenue: 0 };
    productMap[item.product_name].units += item.quantity;
    productMap[item.product_name].revenue += item.total_price;
  });
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].units - a[1].units)
    .slice(0, 5);

  const recentOrders = orders.slice(0, 5);

  const stats1 = [
    { label: "Total Revenue", value: isLoading ? "—" : formatPrice(totalRevenue) },
    { label: "Today's Revenue", value: isLoading ? "—" : formatPrice(todayRevenue) },
    { label: "This Month's Revenue", value: isLoading ? "—" : formatPrice(monthRevenue) },
    { label: "Avg Order Value", value: isLoading ? "—" : formatPrice(avgOrderValue) },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {stats1.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Stat Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Orders" value={isLoading ? "—" : orders.length} />
        <Link to="/admin/orders?status=pending" className="block">
          <div className="bg-white border border-amber-200 rounded-lg p-5 hover:border-amber-400 transition-colors cursor-pointer">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Pending Orders</p>
            <p className="text-2xl font-semibold text-amber-600">{isLoading ? "—" : pendingCount}</p>
          </div>
        </Link>
        <StatCard label="Total Customers" value={isLoading ? "—" : customerCount} />
        <div className={`bg-white border rounded-lg p-5 ${lowStockCount > 0 ? "border-red-200" : "border-gray-200"}`}>
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Low Stock Alert</p>
          <div className="flex items-center gap-2">
            {lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
            <p className={`text-2xl font-semibold ${lowStockCount > 0 ? "text-red-600" : "text-gray-900"}`}>
              {isLoading ? "—" : lowStockCount}
            </p>
          </div>
          {lowStockCount > 0 && <p className="text-xs text-red-400 mt-1">variants ≤ 5 units</p>}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Revenue — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E2319" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2E2319" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6 }}
                formatter={(v: number) => [formatPrice(v), "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2E2319" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Donut */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Order Status</h2>
          {statusBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">No orders yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS_HEX[entry.name] ?? "#9CA3AF"} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span style={{ fontSize: 10, color: "#6B7280", textTransform: "capitalize" }}>{v}</span>} />
                <Tooltip formatter={(v: number, name: string) => [v, name]} contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Products + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Top Products</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Product", "Units", "Revenue"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-sm text-gray-400">No sales data yet</td>
                </tr>
              ) : (
                topProducts.map(([name, data]) => (
                  <tr key={name} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-900 font-medium truncate max-w-[150px]">{name}</td>
                    <td className="px-5 py-3 text-gray-500">{data.units}</td>
                    <td className="px-5 py-3 text-gray-900">{formatPrice(data.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Orders */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs text-gray-500 hover:text-gray-900 underline">View all</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Order #", "Customer", "Total", "Status"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : recentOrders.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">No orders yet</td></tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-900">{order.order_number}</td>
                    <td className="px-5 py-3 text-gray-700 truncate max-w-[100px]">{order.customer_name}</td>
                    <td className="px-5 py-3 text-gray-900">{formatPrice(order.total)}</td>
                    <td className="px-5 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => mutation.mutate({ id: order.id, status: e.target.value })}
                        className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-white text-gray-900">{s}</option>
                        ))}
                      </select>
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
