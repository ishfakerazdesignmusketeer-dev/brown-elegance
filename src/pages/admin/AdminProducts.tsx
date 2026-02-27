import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { getImageUrl } from "@/lib/image";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import ProductPanel from "@/components/admin/ProductPanel";
import StockOverview from "@/components/admin/StockOverview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";

interface Variant {
  id: string;
  size: string;
  stock: number;
  product_id: string;
  is_available: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  category_id: string | null;
  price: number;
  offer_price: number | null;
  sku: string | null;
  weight: number | null;
  description: string | null;
  images: string[] | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  is_preorder: boolean | null;
  is_studio_exclusive: boolean | null;
  is_coming_soon: boolean | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string | null;
  product_variants: Variant[];
}

const CATEGORY_COLORS: Record<string, string> = {
  formal: "bg-blue-100 text-blue-700",
  everyday: "bg-green-100 text-green-700",
  festive: "bg-amber-100 text-amber-700",
  casual: "bg-gray-100 text-gray-700",
};

const AdminProducts = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map(p => ({
        ...p,
        product_variants: (p.product_variants ?? []).map((v: any) => ({
          ...v,
          is_available: v.is_available ?? true,
        })),
      })) as Product[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase.from("products").update({ [field]: value } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { field, value }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      const labels: Record<string, [string, string]> = {
        is_active: ["Product activated", "Product hidden"],
        is_featured: ["Featured enabled", "Featured disabled"],
        is_preorder: ["Pre-order enabled", "Pre-order disabled"],
        is_studio_exclusive: ["Studio exclusive enabled", "Studio exclusive disabled"],
        is_coming_soon: ["Coming soon enabled", "Coming soon disabled"],
      };
      const [on, off] = labels[field] ?? ["Updated", "Updated"];
      toast.success(value ? on : off);
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: oiErr } = await supabase.from("order_items").update({ product_id: null }).eq("product_id", id);
      if (oiErr) throw oiErr;
      const { error: varErr } = await supabase.from("product_variants").delete().eq("product_id", id);
      if (varErr) throw varErr;
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-overview"] });
      toast.success("Product deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setPanelOpen(true);
  };

  const handleAdd = () => {
    setEditProduct(null);
    setPanelOpen(true);
  };

  const totalStock = (p: Product): number =>
    p.product_variants.reduce((s, v) => s + v.stock, 0);

  const stockWarnings = (p: Product) => {
    const warnings: { size: string; stock: number; level: "out" | "low" }[] = [];
    p.product_variants.forEach((v) => {
      if (v.stock === 0) warnings.push({ size: v.size, stock: v.stock, level: "out" });
      else if (v.stock <= 5) warnings.push({ size: v.size, stock: v.stock, level: "low" });
    });
    return warnings;
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Product Management</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Product
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU..."
          className="pl-9 h-10 text-sm"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-xs font-medium min-w-[200px]">Product</TableHead>
                <TableHead className="text-xs font-medium">Category</TableHead>
                <TableHead className="text-xs font-medium">Price</TableHead>
                <TableHead className="text-xs font-medium min-w-[150px]">Stock</TableHead>
                <TableHead className="text-xs font-medium text-center">Pre-Order</TableHead>
                <TableHead className="text-xs font-medium text-center">Studio</TableHead>
                <TableHead className="text-xs font-medium text-center">Featured</TableHead>
                <TableHead className="text-xs font-medium text-center">Active</TableHead>
                <TableHead className="text-xs font-medium text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-sm text-gray-400">Loading products...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={9} className="text-center py-12 text-sm text-gray-400">
                    {search ? "No products match your search" : "No products yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((product, idx) => {
                  const warnings = stockWarnings(product);
                  return (
                    <TableRow
                      key={product.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? "bg-[#F9F9F9]" : "bg-white"}`}
                    >
                      {/* Product */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 shrink-0">
                            {product.images?.[0] ? (
                              <img
                                src={getImageUrl(product.images[0], 80)}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = product.images![0]; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-[9px]">No img</div>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{product.name}</span>
                          {(product as any).is_coming_soon && (
                            <span className="text-[9px] font-bold bg-gray-900 text-white px-1.5 py-0.5 rounded ml-1.5 shrink-0">CS</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        {product.category ? (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[product.category] ?? "bg-gray-100 text-gray-600"}`}>
                            {product.category}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </TableCell>

                      {/* Price */}
                      <TableCell>
                        {product.offer_price ? (
                          <div>
                            <span className="text-sm font-semibold text-gray-900">{formatPrice(product.offer_price)}</span>
                            <br />
                            <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-gray-900">{formatPrice(product.price)}</span>
                        )}
                      </TableCell>

                      {/* Stock */}
                      <TableCell>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {totalStock(product)}
                        </span>
                        {warnings.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {warnings.map((w) => (
                              <div key={w.size} className={`text-[10px] ${w.level === "out" ? "text-red-600" : "text-amber-600"}`}>
                                {w.level === "out" ? "🔴" : "⚠️"} {w.size}: {w.level === "out" ? "Out of stock" : `${w.stock} left`}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>

                      {/* Pre-Order */}
                      <TableCell className="text-center">
                        <Switch
                          checked={!!product.is_preorder}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: product.id, field: "is_preorder", value: v })}
                          className={product.is_preorder ? "data-[state=checked]:bg-amber-500" : ""}
                        />
                      </TableCell>

                      {/* Studio */}
                      <TableCell className="text-center">
                        <Switch
                          checked={!!product.is_studio_exclusive}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: product.id, field: "is_studio_exclusive", value: v })}
                          className={product.is_studio_exclusive ? "data-[state=checked]:bg-indigo-600" : ""}
                        />
                      </TableCell>

                      {/* Featured */}
                      <TableCell className="text-center">
                        <Switch
                          checked={!!product.is_featured}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: product.id, field: "is_featured", value: v })}
                          className={product.is_featured ? "data-[state=checked]:bg-red-500" : ""}
                        />
                      </TableCell>

                      {/* Active */}
                      <TableCell className="text-center">
                        <Switch
                          checked={!!product.is_active}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: product.id, field: "is_active", value: v })}
                          className={product.is_active ? "data-[state=checked]:bg-red-500" : ""}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-gray-400 hover:text-gray-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(product)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <StockOverview />

      <ProductPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        product={editProduct}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product and all its variants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProducts;
