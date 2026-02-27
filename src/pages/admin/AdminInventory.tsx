import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Plus, ChevronDown, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InventoryRow {
  variantId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  category: string | null;
  size: string;
  sku: string | null;
  stock: number;
}

interface StockHistoryEntry {
  id: string;
  product_name: string;
  size: string;
  change_amount: number;
  reason: string;
  order_id: string | null;
  created_at: string;
  orders?: { order_number: string } | null;
}

type StockFilter = "all" | "low" | "out" | "healthy";
type SortOption = "stock_asc" | "stock_desc" | "name_asc";

const AdminInventory = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState<SortOption>("stock_asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addStockValue, setAddStockValue] = useState(0);
  const [bulkAddValue, setBulkAddValue] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, images, category, sku, product_variants(id, size, stock)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name").eq("is_active", true).order("name");
      return (data ?? []).map((c: any) => c.name);
    },
  });

  const { data: stockHistory = [] } = useQuery({
    queryKey: ["admin-stock-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_history")
        .select("*, orders(order_number)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as StockHistoryEntry[];
    },
  });

  // Flatten products into inventory rows
  const rows: InventoryRow[] = products.flatMap((p: any) =>
    (p.product_variants || []).map((v: any) => ({
      variantId: v.id,
      productId: p.id,
      productName: p.name,
      productImage: p.images?.[0] || null,
      category: p.category,
      size: v.size,
      sku: p.sku,
      stock: v.stock,
    }))
  );

  // Filter
  let filtered = rows.filter((r) => {
    if (search && !r.productName.toLowerCase().includes(search.toLowerCase())) return false;
    if (stockFilter === "low" && !(r.stock > 0 && r.stock <= 5)) return false;
    if (stockFilter === "out" && r.stock !== 0) return false;
    if (stockFilter === "healthy" && r.stock <= 5) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortOption === "stock_asc") return a.stock - b.stock;
    if (sortOption === "stock_desc") return b.stock - a.stock;
    return a.productName.localeCompare(b.productName);
  });

  // Summary counts
  const totalSKUs = rows.length;
  const lowStock = rows.filter((r) => r.stock > 0 && r.stock <= 5).length;
  const outOfStock = rows.filter((r) => r.stock === 0).length;
  const healthy = rows.filter((r) => r.stock > 5).length;

  const addStockMutation = useMutation({
    mutationFn: async ({ variantId, amount, productName, size }: { variantId: string; amount: number; productName: string; size: string }) => {
      const { data: variant } = await supabase.from("product_variants").select("stock, product_id").eq("id", variantId).single();
      if (!variant) throw new Error("Variant not found");
      const newStock = variant.stock + amount;
      const { error } = await supabase.from("product_variants").update({ stock: newStock }).eq("id", variantId);
      if (error) throw error;
      // Log to stock_history
      await supabase.from("stock_history").insert({
        product_id: variant.product_id,
        variant_id: variantId,
        product_name: productName,
        size,
        change_amount: amount,
        reason: "manual_restock",
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-overview"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["admin-out-of-stock"] });
      setEditingId(null);
      setAddStockValue(0);
      toast.success("Stock updated");
    },
    onError: () => toast.error("Failed to update stock"),
  });

  const bulkAddMutation = useMutation({
    mutationFn: async ({ ids, amount }: { ids: string[]; amount: number }) => {
      for (const id of ids) {
        const row = rows.find((r) => r.variantId === id);
        if (!row) continue;
        const { error } = await supabase.from("product_variants").update({ stock: row.stock + amount }).eq("id", id);
        if (error) throw error;
        await supabase.from("stock_history").insert({
          product_id: row.productId,
          variant_id: id,
          product_name: row.productName,
          size: row.size,
          change_amount: amount,
          reason: "manual_restock",
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-history"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      setSelectedIds(new Set());
      setBulkAddValue(0);
      toast.success("Bulk stock updated");
    },
    onError: () => toast.error("Bulk update failed"),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.variantId));

  const getStatusBadge = (stock: number) => {
    if (stock === 0) return <Badge className="bg-red-100 text-red-700 text-[10px]">Out of Stock</Badge>;
    if (stock <= 5) return <Badge className="bg-amber-100 text-amber-700 text-[10px]">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-700 text-[10px]">In Stock</Badge>;
  };

  const reasonLabel = (reason: string) => {
    if (reason === "order_confirmed") return "Order Confirmed";
    if (reason === "order_cancelled") return "Order Cancelled";
    if (reason === "manual_restock") return "Manual Restock";
    return reason;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Inventory Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time stock across all products and sizes</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total SKUs</p>
          <p className="text-2xl font-semibold text-gray-900">{totalSKUs}</p>
        </div>
        <div className="bg-white border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Low Stock</p>
          <p className="text-2xl font-semibold text-amber-600">{lowStock}</p>
          <p className="text-[10px] text-amber-400">1-5 units</p>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Out of Stock</p>
          <p className="text-2xl font-semibold text-red-600">{outOfStock}</p>
          <p className="text-[10px] text-red-400">0 units</p>
        </div>
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Healthy</p>
          <p className="text-2xl font-semibold text-green-600">{healthy}</p>
          <p className="text-[10px] text-green-400">6+ units</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product name..." className="pl-8 h-8 text-xs" />
        </div>
        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="stock_asc">Stock Low→High</SelectItem>
            <SelectItem value="stock_desc">Stock High→Low</SelectItem>
            <SelectItem value="name_asc">A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-xs font-medium text-blue-700">{selectedIds.size} selected</span>
          <Input
            type="number"
            min={1}
            value={bulkAddValue}
            onChange={(e) => setBulkAddValue(parseInt(e.target.value) || 0)}
            placeholder="Add qty"
            className="w-20 h-7 text-xs"
          />
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={bulkAddValue <= 0 || bulkAddMutation.isPending}
            onClick={() => bulkAddMutation.mutate({ ids: Array.from(selectedIds), amount: bulkAddValue })}
          >
            + Add Stock to Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => {
                      if (allSelected) setSelectedIds(new Set());
                      else setSelectedIds(new Set(filtered.map((r) => r.variantId)));
                    }}
                  />
                </th>
                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Size</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">SKU</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">Loading inventory...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No items found</td></tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.variantId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <Checkbox checked={selectedIds.has(row.variantId)} onCheckedChange={() => toggleSelect(row.variantId)} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {row.productImage && (
                          <img src={row.productImage} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        )}
                        <span className="text-gray-900 font-medium truncate max-w-[160px]">{row.productName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{row.category || "—"}</td>
                    <td className="px-3 py-2.5 text-center font-medium">{row.size}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-400 font-mono">{row.sku || "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn(
                        "font-semibold tabular-nums",
                        row.stock === 0 ? "text-red-600" : row.stock <= 5 ? "text-amber-600" : "text-green-600"
                      )}>
                        {row.stock}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">{getStatusBadge(row.stock)}</td>
                    <td className="px-3 py-2.5">
                      {editingId === row.variantId ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            value={addStockValue}
                            onChange={(e) => setAddStockValue(parseInt(e.target.value) || 0)}
                            className="w-16 h-7 text-xs text-center"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2"
                            disabled={addStockValue <= 0}
                            onClick={() => addStockMutation.mutate({
                              variantId: row.variantId,
                              amount: addStockValue,
                              productName: row.productName,
                              size: row.size,
                            })}
                          >
                            ✓
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => { setEditingId(null); setAddStockValue(0); }}>✗</Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { setEditingId(row.variantId); setAddStockValue(1); }}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Stock
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock History */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="mt-6">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
          <ChevronDown className={cn("w-4 h-4 transition-transform", historyOpen && "rotate-180")} />
          Recent Stock Changes
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Time", "Product", "Size", "Change", "Reason", "Order #"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockHistory.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-sm">No stock changes yet</td></tr>
                ) : (
                  stockHistory.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-500">{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</td>
                      <td className="px-4 py-2 text-gray-900 font-medium">{entry.product_name}</td>
                      <td className="px-4 py-2 text-center">{entry.size}</td>
                      <td className="px-4 py-2">
                        <span className={cn("font-semibold", entry.change_amount > 0 ? "text-green-600" : "text-red-600")}>
                          {entry.change_amount > 0 ? `+${entry.change_amount}` : entry.change_amount}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">{reasonLabel(entry.reason)}</td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-400">{entry.orders?.order_number || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default AdminInventory;
