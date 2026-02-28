import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { getImageUrl } from "@/lib/image";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSizes } from "@/lib/sizes";

interface ProductForModal {
  id: string;
  name: string;
  slug: string;
  price: number;
  offer_price?: number | null;
  is_preorder?: boolean | null;
  is_studio_exclusive?: boolean | null;
  is_coming_soon?: boolean | null;
  images: string[] | null;
  category?: string | null;
}

interface Variant {
  size: string;
  stock: number;
  is_available: boolean;
}

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
        .select("size, stock, is_available")
        .eq("product_id", product!.id);
      if (error) throw error;
      return data as unknown as Variant[];
    },
    enabled: !!product?.id && open,
  });

  const SIZES_ORDER = getSizes(product?.category);
  const sortedVariants = SIZES_ORDER
    .map((s) => variants.find((v) => v.size === s))
    .filter(Boolean) as Variant[];

  const selectedVariant = sortedVariants.find((v) => v.size === selectedSize);
  const maxQty = selectedVariant?.stock ?? 0;

  const isPreorder = !!product?.is_preorder;
  const hasOfferPrice = product?.offer_price != null && product.offer_price < product.price;
  const displayPrice = hasOfferPrice ? product!.offer_price! : product?.price ?? 0;

  useEffect(() => {
    if (!open) {
      setSelectedSize(null);
      setQuantity(1);
    }
  }, [open]);

  const isSizeDisabled = (v: Variant) => v.stock === 0 || !(v.is_available ?? true);

  const handleAdd = () => {
    if (!product || !selectedSize) return;
    const variant = sortedVariants.find(v => v.size === selectedSize);
    if (!variant || variant.stock === 0) {
      toast.error("This size is out of stock");
      return;
    }
    if (variant.stock < quantity) {
      toast.error(`Only ${variant.stock} left in size ${selectedSize}`);
      return;
    }
    addItem(
      { id: product.id, name: product.name, slug: product.slug, image: product.images?.[0] ?? "", price: displayPrice },
      selectedSize,
      quantity
    );
    onClose();
  };

  if (!open || !product) return null;

  const image = product.images?.[0] ?? "/placeholder.svg";
  const isStudioExclusive = !!product.is_studio_exclusive;
  const isComingSoon = !!product.is_coming_soon;

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
              {hasOfferPrice ? (
                <div className="mt-1">
                  <span className="font-body text-sm font-bold text-foreground">{formatPrice(product.offer_price!)} BDT</span>
                  <span className="font-body text-xs text-muted-foreground line-through ml-2">{formatPrice(product.price)}</span>
                </div>
              ) : (
                <p className="font-body text-sm text-muted-foreground mt-1">{formatPrice(product.price)} BDT</p>
              )}
            </div>
          </div>

          {isComingSoon ? (
            <div className="border-l-4 border-gray-900 bg-gray-50 rounded-r-lg p-4 mb-6">
              <p className="font-body text-[10px] uppercase tracking-[2px] text-gray-800 font-bold mb-2">
                🔮 Coming Soon
              </p>
              <p className="font-body text-xs text-gray-600">
                This product is not available yet. Stay tuned for the launch!
              </p>
            </div>
          ) : isStudioExclusive ? (
            <div className="border-l-4 border-indigo-600 bg-[#F5F3FF] rounded-r-lg p-4 mb-6">
              <p className="font-body text-[10px] uppercase tracking-[2px] text-indigo-700 font-bold mb-2">
                🏛️ Studio Exclusive
              </p>
              <p className="font-body text-xs text-gray-600">
                This product is only available at our physical studio and cannot be ordered online.
              </p>
            </div>
          ) : (
            <>
              {/* Size selection */}
              <div className="mb-6">
                <span className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-3">
                  Select Size <span className="text-destructive">*</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {sortedVariants.length > 0 ? sortedVariants.map((variant) => {
                    const disabled = isSizeDisabled(variant);
                    const isSelected = selectedSize === variant.size;
                    const isLowStock = !disabled && variant.stock > 0 && variant.stock <= 5;
                    return (
                      <div key={variant.size} className="flex flex-col items-center gap-1">
                        <div className="relative">
                          <button
                            disabled={disabled}
                            onClick={() => { setSelectedSize(variant.size); setQuantity(1); }}
                            className={`w-14 h-12 font-body text-sm border transition-all rounded-md ${
                              disabled
                                ? "border-border text-muted-foreground line-through cursor-not-allowed opacity-40"
                                : isSelected
                                ? "border-foreground bg-foreground text-background"
                                : "border-border text-foreground hover:border-foreground"
                            }`}
                          >
                            {variant.size}
                          </button>
                          {isLowStock && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />
                          )}
                        </div>
                        {isLowStock && (
                          <span className="font-body text-[10px] text-amber-600 font-semibold">Only {variant.stock} left!</span>
                        )}
                        {disabled && (
                          <span className="font-body text-[10px] text-muted-foreground/50">Out</span>
                        )}
                      </div>
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
            </>
          )}

          {/* Add button */}
          <Button
            onClick={isComingSoon ? onClose : isStudioExclusive ? onClose : handleAdd}
            disabled={isComingSoon ? false : isStudioExclusive ? false : (!selectedSize || maxQty === 0)}
            className={`w-full font-body text-[12px] uppercase tracking-[1.5px] py-7 rounded-none disabled:opacity-50 ${
              isComingSoon
                ? "bg-gray-900 text-white hover:bg-gray-700"
                : isStudioExclusive
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : isPreorder
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-foreground text-background hover:bg-foreground/90"
            }`}
          >
            {isComingSoon ? "Coming Soon" : isStudioExclusive ? "Visit Studio" : !selectedSize ? "Select a Size" : isPreorder ? "Pre-Order Now" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default AddToCartModal;
