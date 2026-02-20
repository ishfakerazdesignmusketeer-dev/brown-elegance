import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SIZES = ["S", "M", "L", "XL", "XXL"];

interface Variant {
  id: string;
  product_id: string;
  size: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  product_variants: Variant[];
}

const stockColor = (stock: number) => {
  if (stock === 0) return "bg-red-50 text-red-700 font-semibold";
  if (stock <= 5) return "bg-amber-50 text-amber-700 font-semibold";
  return "bg-green-50 text-green-700";
};

const StockOverview = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Record<string, number>>({});

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-stock-overview"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, product_variants(*)")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ variantId, stock }: { variantId: string; stock: number }) => {
      const { error } = await supabase
        .from("product_variants")
        .update({ stock })
        .eq("id", variantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stock-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Stock updated");
    },
    onError: () => toast.error("Failed to update stock"),
  });

  const getVariant = (product: Product, size: string) =>
    product.product_variants.find((v) => v.size === size);

  const getStock = (product: Product, size: string): number => {
    const variantId = getVariant(product, size)?.id;
    if (variantId && variantId in editing) return editing[variantId];
    return getVariant(product, size)?.stock ?? 0;
  };

  const handleChange = (variantId: string, val: number) => {
    setEditing((prev) => ({ ...prev, [variantId]: val }));
  };

  const handleSaveRow = (product: Product) => {
    SIZES.forEach((size) => {
      const variant = getVariant(product, size);
      if (!variant) return;
      if (variant.id in editing) {
        mutation.mutate({ variantId: variant.id, stock: editing[variant.id] });
      }
    });
    setEditing((prev) => {
      const next = { ...prev };
      SIZES.forEach((size) => {
        const variant = getVariant(product, size);
        if (variant) delete next[variant.id];
      });
      return next;
    });
  };

  const totalStock = (product: Product) =>
    product.product_variants.reduce((s, v) => s + v.stock, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Stock Overview</h2>
        <p className="text-xs text-gray-500 mt-0.5">Click any cell to edit stock inline</p>
      </div>

      {isLoading ? (
        <div className="px-5 py-8 text-sm text-gray-400 text-center">Loading stock data...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Product
                </th>
                {SIZES.map((s) => (
                  <th key={s} className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-16">
                    {s}
                  </th>
                ))}
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total
                </th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const hasEdits = SIZES.some((size) => {
                  const v = getVariant(product, size);
                  return v && v.id in editing;
                });
                return (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-900 font-medium max-w-[200px] truncate">
                      {product.name}
                    </td>
                    {SIZES.map((size) => {
                      const variant = getVariant(product, size);
                      const stock = getStock(product, size);
                      return (
                        <td key={size} className="px-3 py-3 text-center">
                          {variant ? (
                            <input
                              type="number"
                              min={0}
                              value={stock}
                              onChange={(e) =>
                                handleChange(variant.id, parseInt(e.target.value) || 0)
                              }
                              className={`w-14 text-center text-xs rounded px-1 py-1 border border-transparent hover:border-gray-300 focus:border-gray-400 focus:outline-none transition-colors ${stockColor(stock)}`}
                            />
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center text-xs text-gray-600">
                      {totalStock(product)}
                    </td>
                    <td className="px-3 py-3">
                      {hasEdits && (
                        <button
                          onClick={() => handleSaveRow(product)}
                          className="text-xs bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors whitespace-nowrap"
                        >
                          Save
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockOverview;
