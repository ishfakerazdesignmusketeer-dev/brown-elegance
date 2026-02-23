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

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  is_active: boolean;
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
        .select("id, name, slug, price, images, is_active")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data as Product[];
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
      addItem(
        { id: product.id, name: product.name, slug: product.slug, image, price: product.price },
        "M",
        1
      );
    }
  };

  return (
    <section className="bg-cream py-20 lg:py-28">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
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
                return (
                  <div key={product.id} className="group">
                    <Link to={`/product/${product.slug}`} className="block relative overflow-hidden bg-[#F8F5E9] mb-5" style={{aspectRatio: '4/5'}}>
                      <img
                        src={getImageUrl(originalUrl, 600)}
                        alt={product.name}
                        className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        width={600}
                        height={800}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = originalUrl; }}
                      />
                      {/* Desktop overlay */}
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 hidden lg:flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
                        <Button
                          variant="secondary"
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuickAdd(product);
                          }}
                          className="bg-cream text-foreground hover:bg-cream/90 font-body text-[12px] uppercase tracking-[1px] px-6 py-2.5 rounded-none"
                        >
                          Add to Cart
                        </Button>
                      </div>
                      {/* Mobile bottom bar */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleQuickAdd(product);
                        }}
                        className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 bg-cream/90 backdrop-blur-sm text-foreground font-body text-[10px] uppercase tracking-[1px] py-1.5 lg:hidden"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        Add to Cart
                      </button>
                    </Link>
                    <div className="text-center">
                      <Link to={`/product/${product.slug}`}>
                        <h3 className="font-heading text-lg text-foreground group-hover:opacity-70 transition-opacity">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="font-body text-sm text-muted-foreground mt-1">
                        {formatPrice(product.price)} BDT
                      </p>
                    </div>
                  </div>
                );
              })}
        </div>

        <div className="text-center mt-16">
          <Button
            variant="outline"
            className="border-foreground text-foreground hover:bg-foreground hover:text-background font-body text-[12px] uppercase tracking-[1.5px] px-10 py-6 rounded-none"
          >
            View All Products
          </Button>
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
