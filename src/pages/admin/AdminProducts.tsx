import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import ProductPanel from "@/components/admin/ProductPanel";
import StockOverview from "@/components/admin/StockOverview";

interface Variant {
  id: string;
  size: string;
  stock: number;
  product_id: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  category_id: string | null;
  price: number;
  description: string | null;
  images: string[] | null;
  is_active: boolean | null;
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
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(is_active ? "Product activated" : "Product hidden");
    },
    onError: () => toast.error("Failed to update product"),
  });

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setPanelOpen(true);
  };

  const handleAdd = () => {
    setEditProduct(null);
    setPanelOpen(true);
  };

  const lowestStock = (product: Product): number => {
    if (!product.product_variants.length) return 0;
    return Math.min(...product.product_variants.map((v) => v.stock));
  };

  const totalStock = (product: Product): number =>
    product.product_variants.reduce((s, v) => s + v.stock, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="aspect-square bg-gray-100 rounded-md mb-3" />
              <div className="h-4 bg-gray-100 rounded mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center mb-8">
          <p className="text-sm text-gray-400 mb-3">No products yet</p>
          <button onClick={handleAdd} className="text-sm text-gray-900 underline">Add your first product</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {products.map((product) => {
            const minStock = lowestStock(product);
            const isLowStock = minStock <= 5;
            return (
              <div
                key={product.id}
                className={`bg-white border rounded-lg overflow-hidden group ${!product.is_active ? "opacity-60" : ""} ${isLowStock && product.is_active ? "border-amber-200" : "border-gray-200"}`}
              >
                {/* Image */}
                <div
                  className="aspect-square bg-gray-100 relative cursor-pointer overflow-hidden"
                  onClick={() => handleEdit(product)}
                >
                  {product.images?.[0] ? (
                    <img
                      src={getOptimizedImageUrl(product.images[0], 200, 70)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.currentTarget.src = product.images![0]; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white rounded-full p-2">
                      <Pencil className="w-3.5 h-3.5 text-gray-700" />
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {product.category && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[product.category] ?? "bg-gray-100 text-gray-600"}`}>
                        {product.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mt-1.5">{formatPrice(product.price)}</p>

                  {/* Stock summary */}
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[10px] ${isLowStock ? "text-amber-600 font-semibold" : "text-gray-500"}`}>
                      {isLowStock && minStock === 0 ? "Out of stock" : isLowStock ? `Low stock (min: ${minStock})` : `Stock: ${totalStock(product)}`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActiveMutation.mutate({ id: product.id, is_active: !product.is_active });
                      }}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {product.is_active
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock Overview */}
      <StockOverview />

      {/* Product Panel */}
      <ProductPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        product={editProduct}
      />
    </div>
  );
};

export default AdminProducts;
