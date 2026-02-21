import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { getImageUrl } from "@/lib/image";
import Navigation from "@/components/layout/Navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Footer from "@/components/layout/Footer";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
}

const Collections = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();

  const isAllCollections = !slug;

  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url, sort_order")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: products = [], isLoading: prodsLoading } = useQuery({
    queryKey: ["collection-products", isAllCollections ? "all" : category?.id],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, slug, price, images")
        .eq("is_active", true)
        .order("created_at");
      if (!isAllCollections && category?.id) {
        query = query.eq("category_id", category.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
    enabled: isAllCollections || !!category?.id,
  });

  const handleQuickAdd = (product: Product) => {
    addItem(
      { id: product.id, name: product.name, slug: product.slug, image: product.images?.[0] ?? "", price: product.price },
      "M",
      1
    );
  };

  if (catLoading || (isAllCollections && prodsLoading)) {
    return (
      <div className="min-h-screen bg-cream">
        <AnnouncementBar />
        <Navigation />
        <div className="px-6 lg:px-12 py-12">
          <Skeleton className="h-6 w-48 mb-8" />
          <Skeleton className="h-12 w-64 mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] w-full mb-5" />
                <Skeleton className="h-5 w-3/4 mx-auto mb-2" />
                <Skeleton className="h-4 w-1/3 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAllCollections && !category) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <p className="font-heading text-3xl text-foreground">Collection not found</p>
        <Link to="/" className="font-body text-sm text-muted-foreground underline">Return to shop</Link>
      </div>
    );
  }

  const pageTitle = isAllCollections ? "All Collections" : category!.name;

  return (
    <div className="min-h-screen bg-cream">
      <AnnouncementBar />
      <Navigation />

      <main className="px-6 lg:px-12 py-10 max-w-6xl mx-auto">
        <nav className="flex items-center gap-2 font-body text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>›</span>
          <span className="text-foreground">{pageTitle}</span>
        </nav>

        <h1 className="font-heading text-4xl lg:text-5xl text-foreground mb-12">
          {pageTitle}
        </h1>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-body text-lg text-muted-foreground">No products in this category yet</p>
            <Button asChild className="mt-6 bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] px-8 py-5 rounded-none">
              <Link to="/">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {products.map((product) => {
              const originalUrl = product.images?.[0] ?? "/placeholder.svg";
              return (
                <div key={product.id} className="group">
                  <Link to={`/product/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-[#F8F5E9] mb-5">
                    <img
                      src={getImageUrl(originalUrl, 600)}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      width={600}
                      height={800}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = originalUrl; }}
                    />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        onClick={(e) => { e.preventDefault(); handleQuickAdd(product); }}
                        className="bg-cream text-foreground hover:bg-cream/90 font-body text-[12px] uppercase tracking-[1px] px-6 py-2.5 rounded-none"
                      >
                        Quick Add
                      </Button>
                    </div>
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
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Collections;
