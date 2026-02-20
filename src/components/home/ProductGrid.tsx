import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";

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
  });

  const handleQuickAdd = (product: Product) => {
    const image = product.images?.[0] ?? "";
    addItem(
      { id: product.id, name: product.name, slug: product.slug, image, price: product.price },
      "M",
      1
    );
  };

  return (
    <section className="bg-cream py-20 lg:py-28">
      <div className="px-6 lg:px-12">
        {/* Section Header */}
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

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-[3/4] w-full mb-5" />
                  <Skeleton className="h-5 w-3/4 mx-auto mb-2" />
                  <Skeleton className="h-4 w-1/3 mx-auto" />
                </div>
              ))
            : (products ?? []).map((product) => (
                <div key={product.id} className="group">
                  {/* Image Container */}
                  <Link to={`/product/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-muted mb-5">
                    <img
                      src={product.images?.[0] ?? "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Hover Overlay with Quick Add */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          handleQuickAdd(product);
                        }}
                        className="bg-cream text-foreground hover:bg-cream/90 font-body text-[12px] uppercase tracking-[1px] px-6 py-2.5 rounded-none"
                      >
                        Quick Add
                      </Button>
                    </div>
                  </Link>

                  {/* Product Info */}
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
              ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-16">
          <Button
            variant="outline"
            className="border-foreground text-foreground hover:bg-foreground hover:text-background font-body text-[12px] uppercase tracking-[1.5px] px-10 py-6 rounded-none"
          >
            View All Products
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
