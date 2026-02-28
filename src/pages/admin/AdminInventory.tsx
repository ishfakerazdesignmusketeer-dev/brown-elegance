import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, ChevronDown, ChevronRight, Package, Minus, Plus, Pencil, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { SIZE_ORDER } from "@/lib/sizes";

interface Variant {
  id: string;
  size: string;
  stock: number;
  product_id: string;
}

interface GroupedProduct {
  productId: string;
  productName: string;
  productImage: string | null;
  category: string | null;
  sku: string | null;
  variants: Variant[];
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  healthStatus: 'critical' | 'warning' | 'healthy';
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

interface EditingVariant {
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  currentStock: number;
}

type StockFilter = "all" | "low" | "out" | "healthy";
type SortOption = "name_asc" | "name_desc" | "critical" | "stock_asc";

function classifyHealth(variants: Variant[]): 'critical' | 'warning' | 'healthy' {
  if (variants.some(v => v.stock === 0)) return 'critical';
  if (variants.some(v => v.stock >= 1 && v.stock <= 5)) return 'warning';
  return 'healthy';
}

const healthPriority = { critical: 0, warning: 1, healthy: 2 };

const AdminInventory = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState<SortOption>("critical");
  const [expandedIds, setExpandedIds] = useState<Set<string> | 'all'>('all');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<EditingVariant | null>(null);
  const [setStockValue, setSetStockValue] = useState(0);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, images, category, sku, product_variants(id, size, stock, product_id)")
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

  // Group products
  const grouped: GroupedProduct[] = products.map((p: any) => {
    const variants: Variant[] = (p.product_variants || [])
      .map((v: any) => ({ id: v.id, size: v.size, stock: v.stock, product_id: v.product_id }))
      .sort((a: Variant, b: Variant) => {
        const ai = SIZE_ORDER.indexOf(a.size);
        const bi = SIZE_ORDER.indexOf(b.size);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    const totalStock = variants.reduce((s, v) => s + v.stock, 0);
    const lowStockCount = variants.filter(v => v.stock >= 1 && v.stock <= 5).length;
    const outOfStockCount = variants.filter(v => v.stock === 0).length;
    return {
      productId: p.id,
      productName: p.name,
      productImage: p.images?.[0] || null,
      category: p.category,
      sku: p.sku,
      variants,
      totalStock,
      lowStockCount,
      outOfStockCount,
      healthStatus: classifyHealth(variants),
    };
  });

  // Filter
  let filtered = grouped.filter(g => {
    if (search && !g.productName.toLowerCase().includes(search.toLowerCase())) return false;
    if (stockFilter === "low" && g.lowStockCount === 0) return false;
    if (stockFilter === "out" && g.outOfStockCount === 0) return false;
    if (stockFilter === "healthy" && g.healthStatus !== 'healthy') return false;
    if (categoryFilter !== "all" && g.category !== categoryFilter) return false;
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortOption === "name_asc") return a.productName.localeCompare(b.productName);
    if (sortOption === "name_desc") return b.productName.localeCompare(a.productName);
    if (sortOption === "critical") {
      const hp = healthPriority[a.healthStatus] - healthPriority[b.healthStatus];
      return hp !== 0 ? hp : a.totalStock - b.totalStock;
    }
    return a.totalStock - b.totalStock;
  });

  // Summary counts (product-level)
  const totalSKUs = grouped.reduce((s, g) => s + g.variants.length, 0);
  const lowStockProducts = grouped.filter(g => g.lowStockCount > 0 && g.outOfStockCount === 0).length;
  const outOfStockProducts = grouped.filter(g => g.outOfStockCount > 0).length;
  const healthyProducts = grouped.filter(g => g.healthStatus === 'healthy').length;

  const isExpanded = (id: string) => expandedIds === 'all' || expandedIds.has(id);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      if (prev === 'all') {
        const next = new Set(grouped.map(g => g.productId));
        next.delete(id);
        return next;
      }
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds('all');
  const collapseAll = () => setExpandedIds(new Set());

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stock-history"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stock-overview"] });
    queryClient.invalidateQueries({ queryKey: ["product"] });
    queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
    queryClient.invalidateQueries({ queryKey: ["admin-out-of-stock"] });
  }, [queryClient]);

  const stockMutation = useMutation({
    mutationFn: async ({ variantId, delta, productName, size, reason }: {
      variantId: string; delta: number; productName: string; size: string; reason: string;
    }) => {
      const { data: variant } = await supabase.from("product_variants").select("stock, product_id").eq("id", variantId).single();
      if (!variant) throw new Error("Variant not found");
      const newStock = Math.max(0, variant.stock + delta);
      const { error } = await supabase.from("product_variants").update({ stock: newStock }).eq("id", variantId);
      if (error) throw error;
      await supabase.from("stock_history").insert({
        product_id: variant.product_id,
        variant_id: variantId,
        product_name: productName,
        size,
        change_amount: delta,
        reason,
      } as any);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Stock updated");
    },
    onError: () => toast.error("Failed to update stock"),
  });

  const handleSetStock = () => {
    if (!editingVariant) return;
    const delta = setStockValue - editingVariant.currentStock;
    if (delta === 0) { setEditingVariant(null); return; }
    stockMutation.mutate({
      variantId: editingVariant.variantId,
      delta,
      productName: editingVariant.productName,
      size: editingVariant.size,
      reason: 'manual_restock',
    });
    setEditingVariant(null);
  };

  const borderColor = (health: 'critical' | 'warning' | 'healthy') => {
    if (health === 'critical') return 'border-l-red-500';
    if (health === 'warning') return 'border-l-amber-500';
    return 'border-l-green-500';
  };

  const reasonLabel = (reason: string) => {
    if (reason === "order_confirmed") return "Order Confirmed";
    if (reason === "order_cancelled") return "Order Cancelled";
    if (reason === "manual_restock") return "Manual Restock";
    if (reason === "manual_adjustment") return "Manual Adjustment";
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
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Low Stock Products</p>
          <p className="text-2xl font-semibold text-amber-600">{lowStockProducts}</p>
          <p className="text-[10px] text-amber-400">has sizes at 1-5 units</p>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Out of Stock Products</p>
          <p className="text-2xl font-semibold text-red-600">{outOfStockProducts}</p>
          <p className="text-[10px] text-red-400">has sizes at 0 units</p>
        </div>
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Healthy Products</p>
          <p className="text-2xl font-semibold text-green-600">{healthyProducts}</p>
          <p className="text-[10px] text-green-400">all sizes 6+ units</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product name..." className="pl-8 h-8 text-xs" />
        </div>
        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="low">Has Low Stock</SelectItem>
            <SelectItem value="out">Has Out of Stock</SelectItem>
            <SelectItem value="healthy">All Healthy</SelectItem>
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
          <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc">A-Z</SelectItem>
            <SelectItem value="name_desc">Z-A</SelectItem>
            <SelectItem value="critical">Most Critical First</SelectItem>
            <SelectItem value="stock_asc">Total Stock Low→High</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={expandAll}>
            <ChevronsUpDown className="w-3 h-3 mr-1" /> Expand All
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Product Cards */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading inventory...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No products found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(group => {
            const expanded = isExpanded(group.productId);
            return (
              <div
                key={group.productId}
                className={cn(
                  "bg-white border border-gray-200 rounded-lg overflow-hidden border-l-4",
                  borderColor(group.healthStatus)
                )}
              >
                {/* Product Header */}
                <button
                  onClick={() => toggleExpanded(group.productId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  {group.productImage ? (
                    <img src={group.productImage} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{group.productName}</span>
                      {group.category && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{group.category}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Total Stock: {group.totalStock} units
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {group.outOfStockCount > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-[10px] border-0">{group.outOfStockCount} Out of Stock</Badge>
                    )}
                    {group.lowStockCount > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 text-[10px] border-0">{group.lowStockCount} Low Stock</Badge>
                    )}
                    {group.healthStatus === 'healthy' && (
                      <Badge className="bg-green-100 text-green-700 text-[10px] border-0">All Good</Badge>
                    )}
                    {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Variant Rows */}
                {expanded && (
                  <div className="border-t border-gray-100">
                    <div className="grid grid-cols-[80px_80px_120px_1fr] sm:grid-cols-[100px_80px_120px_1fr] px-4 py-2 bg-gray-50 text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                      <span>Size</span>
                      <span>Stock</span>
                      <span>Status</span>
                      <span>Actions</span>
                    </div>
                    {group.variants.map(variant => (
                      <VariantRow
                        key={variant.id}
                        variant={variant}
                        productName={group.productName}
                        onMutate={(delta, reason) => stockMutation.mutate({
                          variantId: variant.id,
                          delta,
                          productName: group.productName,
                          size: variant.size,
                          reason,
                        })}
                        onOpenSetDialog={() => {
                          setEditingVariant({
                            variantId: variant.id,
                            productId: variant.product_id,
                            productName: group.productName,
                            size: variant.size,
                            currentStock: variant.stock,
                          });
                          setSetStockValue(variant.stock);
                        }}
                        isPending={stockMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Set Stock Dialog */}
      <Dialog open={!!editingVariant} onOpenChange={(open) => !open && setEditingVariant(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Set Stock for {editingVariant?.productName} — Size {editingVariant?.size}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs text-gray-500 mb-1 block">New stock quantity</label>
            <Input
              type="number"
              min={0}
              value={setStockValue}
              onChange={e => setSetStockValue(parseInt(e.target.value) || 0)}
              className="text-center text-lg font-semibold"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSetStock()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingVariant(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSetStock} disabled={stockMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

// Inline variant row with local stock editing
function VariantRow({ variant, productName, onMutate, onOpenSetDialog, isPending }: {
  variant: Variant;
  productName: string;
  onMutate: (delta: number, reason: string) => void;
  onOpenSetDialog: () => void;
  isPending: boolean;
}) {
  const [localStock, setLocalStock] = useState(variant.stock);
  const [dirty, setDirty] = useState(false);

  // Sync when server data changes
  if (!dirty && localStock !== variant.stock) {
    setLocalStock(variant.stock);
  }

  const commitChange = () => {
    if (localStock === variant.stock) { setDirty(false); return; }
    const delta = localStock - variant.stock;
    onMutate(delta, 'manual_adjustment');
    setDirty(false);
  };

  const stockColor = variant.stock === 0 ? 'text-red-600' : variant.stock <= 5 ? 'text-amber-600' : 'text-green-600';
  const pillBg = variant.stock === 0 ? 'bg-red-50 text-red-700' : variant.stock <= 5 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-700';

  const statusBadge = variant.stock === 0
    ? <Badge className="bg-red-100 text-red-700 text-[10px] border-0">Out of Stock</Badge>
    : variant.stock <= 5
      ? <Badge className="bg-amber-100 text-amber-700 text-[10px] border-0">Low Stock</Badge>
      : <Badge className="bg-green-100 text-green-700 text-[10px] border-0">In Stock</Badge>;

  return (
    <div className="grid grid-cols-[80px_80px_120px_1fr] sm:grid-cols-[100px_80px_120px_1fr] px-4 py-2 items-center" style={{ backgroundColor: '#FAFAF8' }}>
      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full w-fit", pillBg)}>{variant.size}</span>
      <span className={cn("font-semibold tabular-nums text-sm", stockColor)}>{variant.stock}</span>
      <span>{statusBadge}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={isPending || variant.stock === 0}
          onClick={() => onMutate(-1, 'manual_adjustment')}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <input
          type="number"
          min={0}
          value={dirty ? localStock : variant.stock}
          onChange={e => { setLocalStock(parseInt(e.target.value) || 0); setDirty(true); }}
          onBlur={commitChange}
          onKeyDown={e => e.key === 'Enter' && commitChange()}
          className="w-14 h-7 text-center text-xs font-semibold border border-gray-200 rounded bg-white focus:outline-none focus:border-gray-400"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={isPending}
          onClick={() => onMutate(1, 'manual_adjustment')}
        >
          <Plus className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-1"
          onClick={onOpenSetDialog}
        >
          <Pencil className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default AdminInventory;
