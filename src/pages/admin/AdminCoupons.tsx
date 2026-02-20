import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { format } from "date-fns";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const AdminCoupons = () => {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async (): Promise<Coupon[]> => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon updated");
    },
    onError: () => toast.error("Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  const handleCreate = async () => {
    if (!code.trim() || !discountValue) {
      toast.error("Code and discount value are required");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("coupons").insert({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: parseInt(discountValue),
        min_order_amount: parseInt(minOrder) || 0,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon created");
      setCode(""); setDiscountValue(""); setMinOrder(""); setMaxUses(""); setExpiresAt("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Coupons</h1>

      {/* Create Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Create New Coupon</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-gray-500 block mb-1">Code *</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SAVE20"
              className="h-9 text-sm font-mono uppercase"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Type</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
              className="w-full h-9 text-sm border border-gray-200 rounded-md px-2 focus:outline-none focus:border-gray-400"
            >
              <option value="percentage">Percentage %</option>
              <option value="fixed">Fixed ৳</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Value *</label>
            <Input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percentage" ? "20" : "200"}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Min Order (৳)</label>
            <Input
              type="number"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              placeholder="0"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Max Uses</label>
            <Input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="∞"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Expires</label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="mt-4 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {creating ? "Creating..." : "Create Coupon"}
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Code", "Type", "Value", "Min Order", "Used / Max", "Expires", "Active", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">Loading...</td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">No coupons yet — create your first one above</td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono font-semibold text-gray-900">{coupon.code}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${coupon.discount_type === "percentage" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
                        {coupon.discount_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-900 font-medium">
                      {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : formatPrice(coupon.discount_value)}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {coupon.min_order_amount > 0 ? formatPrice(coupon.min_order_amount) : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {coupon.used_count} / {coupon.max_uses ?? "∞"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {coupon.expires_at ? format(new Date(coupon.expires_at), "dd/MM/yyyy") : "Never"}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleMutation.mutate({ id: coupon.id, is_active: !coupon.is_active })}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        {coupon.is_active
                          ? <ToggleRight className="w-5 h-5 text-green-500" />
                          : <ToggleLeft className="w-5 h-5" />
                        }
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => {
                          if (confirm("Delete this coupon?")) deleteMutation.mutate(coupon.id);
                        }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

export default AdminCoupons;
