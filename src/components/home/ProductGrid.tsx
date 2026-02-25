import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { getImageUrl } from "@/lib/image";
import { useIsMobile } from "@/hooks/use-mobile";
import AddToCartModal from "@/components/cart/AddToCartModal";
import { ShoppingBag } from "lucide-react";

interface ProductVariant {
  stock: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  offer_price: number | null;
  is_preorder: boolean | null;
  is_studio_exclusive: boolean | null;
  images: string[] | null;
  is_active: boolean;
  product_variants: ProductVariant[];
}

const ProductGrid = () => {
  const { addItem } = useCart();
  const isMobile = useIsMobile();
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, offer_price, is_preorder, is_studio_exclusive, images, is_active, product_variants(stock)")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data as unknown as Product[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const handleQuickAdd = (product: Product) => {
    if (isMobile) {
      setModalProduct(product);
    } else {
      const image = product.images?.[0] ?? "";
      const displayPrice = product.offer_price != null && product.offer_price < product.price ? product.offer_price : product.price;
      addItem(
        { id: product.id, name: product.name, slug: product.slug, image, price: displayPrice },
        "M",
        1
      );
    }
  };

  const allSoldOut = (p: Product) => p.product_variants.length > 0 && p.product_variants.every(v => v.stock === 0);
  const hasSale = (p: Product) => p.offer_price != null && p.offer_price < p.price;

  // Badge: Studio Exclusive > Pre-Order > Sold Out > SALE
  const getBadge = (p: Product): { text: string; className: string; position: string } | null => {
    if (p.is_studio_exclusive) return { text: "Studio Exclusive", className: "bg-indigo-600 text-white", position: "top-2 left-2" };
    if (p.is_preorder) return { text: "Pre-Order", className: "bg-amber-500 text-white", position: "top-2 left-2" };
    if (allSoldOut(p)) return { text: "Sold Out", className: "bg-red-600 text-white", position: "top-2 left-2" };
    if (hasSale(p)) return { text: "SALE", className: "bg-red-600 text-white", position: "top-2 right-2" };
    return null;
  };

  return (
    <section className="bg-cream pt-12 pb-10 lg:pt-16 lg:pb-14">
      <div className="px-6 lg:px-12">
        <div className="text-center mb-16">
          <span className="font-body text-[12px] uppercase tracking-[2px] text-muted-foreground">
            Curated Collection
          </span>
          <h2 className="font-heading text-4xl lg:text-5xl text-foreground mt-3">
            The First Drop
          </h2>
          <p className="font-body text-base text-muted-foreground mt-4 max-w-md mx-auto">
            Six carefully crafted pieces, each telling a story of Bengali heritage and modern elegance.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-10">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="w-full bg-[#ede9d9] animate-pulse rounded-md" style={{aspectRatio:'4/5'}} />
                  <div className="h-4 w-24 bg-[#ede9d9] animate-pulse rounded-md mt-2" />
                  <div className="h-4 w-16 bg-[#ede9d9] animate-pulse rounded-md mt-1" />
                </div>
              ))
            : (products ?? []).map((product) => {
                const originalUrl = product.images?.[0] ?? "/placeholder.svg";
                const isSoldOut = allSoldOut(product);
                const badge = getBadge(product);
                const showOfferPrice = hasSale(product);
                return (
                  <div key={product.id} className={`group ${isSoldOut && !product.is_preorder && !product.is_studio_exclusive ? "opacity-75" : ""}`}>
                    <Link to={`/product/${product.slug}`} className="block relative overflow-hidden bg-[#F8F5E9] mb-5" style={{aspectRatio: '4/5', contain: 'layout style'}}>
                      <img
                        src={getImageUrl(originalUrl, 600)}
                        alt={product.name}
                        className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                        loading="eager"
                        fetchPriority="low"
                        decoding="async"
                        width={600}
                        height={800}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = originalUrl; }}
                      />
                      {/* Badge */}
                      {badge && (
                        <span className={`absolute ${badge.position} font-body text-[9px] uppercase tracking-[1px] px-2 py-1 ${badge.className} z-10`}>
                          {badge.text}
                        </span>
                      )}
                      {/* Desktop overlay */}
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 hidden lg:flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
                        {product.is_studio_exclusive ? (
                          <Button
                            variant="secondary"
                            className="bg-indigo-600 text-white hover:bg-indigo-700 font-body text-[12px] uppercase tracking-[1px] px-6 py-2.5 rounded-none"
                          >
                            View at Studio →
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            disabled={isSoldOut && !product.is_preorder}
                            onClick={(e) => {
                              e.preventDefault();
                              handleQuickAdd(product);
                            }}
                            className="bg-cream text-foreground hover:bg-cream/90 font-body text-[12px] uppercase tracking-[1px] px-6 py-2.5 rounded-none disabled:opacity-50"
                          >
                            {product.is_preorder ? "Pre-Order" : "Add to Cart"}
                          </Button>
                        )}
                      </div>
                      {/* Mobile bottom bar */}
                      {product.is_studio_exclusive ? (
                        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 bg-indigo-600/90 backdrop-blur-sm text-white font-body text-[10px] uppercase tracking-[1px] py-1.5 lg:hidden">
                          View at Studio →
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (isSoldOut && !product.is_preorder) return;
                            handleQuickAdd(product);
                          }}
                          disabled={isSoldOut && !product.is_preorder}
                          className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 bg-cream/90 backdrop-blur-sm text-foreground font-body text-[10px] uppercase tracking-[1px] py-1.5 lg:hidden disabled:opacity-50"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          {product.is_preorder ? "Pre-Order" : "Add to Cart"}
                        </button>
                      )}
                    </Link>
                    <div className="text-center">
                      <Link to={`/product/${product.slug}`}>
                        <h3 className="font-heading text-lg text-foreground group-hover:opacity-70 transition-opacity">
                          {product.name}
                        </h3>
                      </Link>
                      {showOfferPrice ? (
                        <div className="mt-1">
                          <span className="font-body text-sm font-bold text-foreground">{formatPrice(product.offer_price!)} BDT</span>
                          <span className="font-body text-xs text-muted-foreground line-through ml-2">{formatPrice(product.price)}</span>
                        </div>
                      ) : (
                        <p className="font-body text-sm text-muted-foreground mt-1">
                          {formatPrice(product.price)} BDT
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>

        <div className="text-center mt-16">
          <Link to="/collections">
            <Button
              variant="outline"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background font-body text-[12px] uppercase tracking-[1.5px] px-10 py-6 rounded-none"
            >
              View All Products
            </Button>
          </Link>
        </div>
      </div>

      <AddToCartModal
        product={modalProduct}
        open={!!modalProduct}
        onClose={() => setModalProduct(null)}
      />
    </section>
  );
};

export default ProductGrid;
