import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { getImageUrl } from "@/lib/image";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductForModal {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
}

interface Variant {
  size: string;
  stock: number;
}

const SIZES_ORDER = ["S", "M", "L", "XL", "XXL"];

interface AddToCartModalProps {
  product: ProductForModal | null;
  open: boolean;
  onClose: () => void;
}

const AddToCartModal = ({ product, open, onClose }: AddToCartModalProps) => {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: variants = [] } = useQuery({
    queryKey: ["product-variants", product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("size, stock")
        .eq("product_id", product!.id);
      if (error) throw error;
      return data as Variant[];
    },
    enabled: !!product?.id && open,
  });

  const sortedVariants = SIZES_ORDER
    .map((s) => variants.find((v) => v.size === s))
    .filter(Boolean) as Variant[];

  const selectedVariant = sortedVariants.find((v) => v.size === selectedSize);
  const maxQty = selectedVariant?.stock ?? 0;

  useEffect(() => {
    if (!open) {
      setSelectedSize(null);
      setQuantity(1);
    }
  }, [open]);

  const handleAdd = () => {
    if (!product || !selectedSize) return;
    addItem(
      { id: product.id, name: product.name, slug: product.slug, image: product.images?.[0] ?? "", price: product.price },
      selectedSize,
      quantity
    );
    onClose();
  };

  if (!open || !product) return null;

  const image = product.images?.[0] ?? "/placeholder.svg";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-foreground/70 hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 pb-8 pt-2">
          {/* Product preview */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-24 bg-[#F8F5E9] overflow-hidden rounded-md shrink-0">
              <img
                src={getImageUrl(image, 200)}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = image; }}
              />
            </div>
            <div>
              <h3 className="font-heading text-lg text-foreground leading-tight">{product.name}</h3>
              <p className="font-body text-sm text-muted-foreground mt-1">{formatPrice(product.price)} BDT</p>
            </div>
          </div>

          {/* Size selection */}
          <div className="mb-6">
            <span className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-3">
              Select Size <span className="text-destructive">*</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {sortedVariants.length > 0 ? sortedVariants.map((variant) => {
                const outOfStock = variant.stock === 0;
                const isSelected = selectedSize === variant.size;
                return (
                  <button
                    key={variant.size}
                    disabled={outOfStock}
                    onClick={() => { setSelectedSize(variant.size); setQuantity(1); }}
                    className={`w-14 h-14 font-body text-sm border transition-all rounded-md flex flex-col items-center justify-center ${
                      outOfStock
                        ? "border-border text-muted-foreground line-through cursor-not-allowed opacity-40"
                        : isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:border-foreground"
                    }`}
                  >
                    <span>{variant.size}</span>
                    {!outOfStock && variant.stock > 5 && (
                      <span className="text-[9px] text-muted-foreground leading-none">{variant.stock} left</span>
                    )}
                    {!outOfStock && variant.stock <= 5 && (
                      <span className="text-[9px] text-destructive font-semibold leading-none">Low stock</span>
                    )}
                  </button>
                );
              }) : (
                <p className="font-body text-sm text-muted-foreground">Loading sizes...</p>
              )}
            </div>
          </div>

          {/* Quantity */}
          {selectedSize && maxQty > 0 && (
            <div className="mb-6">
              <span className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-3">Quantity</span>
              <div className="flex items-center border border-border w-fit rounded-md">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-body text-sm text-foreground">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  className="w-10 h-10 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Add button */}
          <Button
            onClick={handleAdd}
            disabled={!selectedSize || maxQty === 0}
            className="w-full bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] py-7 rounded-none disabled:opacity-50"
          >
            {!selectedSize ? "Select a Size" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default AddToCartModal;
