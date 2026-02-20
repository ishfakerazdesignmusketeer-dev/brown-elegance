import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import CustomerPanel from "@/components/admin/CustomerPanel";

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

const AdminCustomers = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers", debouncedSearch],
    queryFn: async (): Promise<Customer[]> => {
      let query = supabase
        .from("customers")
        .select("*")
        .order("total_spent", { ascending: false });

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
        <span className="text-sm text-gray-500">{customers.length} total</span>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-72 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="pl-8 h-9 text-sm border-gray-200"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Name", "Phone", "City", "Orders", "Total Spent", "Last Order"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    {debouncedSearch ? "No customers match your search" : "No customers yet — they'll appear automatically after first order"}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelected(customer)}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{customer.name}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs font-mono">{customer.phone}</td>
                    <td className="px-5 py-3 text-gray-500">{customer.city ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-700">{customer.total_orders}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium">{formatPrice(customer.total_spent)}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {customer.last_order_at
                        ? formatDistanceToNow(new Date(customer.last_order_at), { addSuffix: true })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerPanel customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default AdminCustomers;
