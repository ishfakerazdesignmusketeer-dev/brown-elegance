import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getImageUrl } from "@/lib/image";
import { formatPrice } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  productId: string;
  categoryId: string | null;
}

const YouMayAlsoLike = ({ productId, categoryId }: Props) => {
  const { data: products, isLoading } = useQuery({
    queryKey: ["related-products", productId],
    queryFn: async () => {
      let results: any[] = [];

      // 1. Try same category first
      if (categoryId) {
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, price, images")
          .eq("is_active", true)
          .eq("category_id", categoryId)
          .neq("id", productId)
          .limit(4);
        if (data) results = data;
      }

      // 2. Fill remaining slots with random products
      if (results.length < 4) {
        const excludeIds = [productId, ...results.map((r) => r.id)];
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, price, images")
          .eq("is_active", true)
          .not("id", "in", `(${excludeIds.join(",")})`)
          .limit(4 - results.length);
        if (data) results = [...results, ...data];
      }

      return results;
    },
  });

  if (isLoading) {
    return (
      <section className="px-6 lg:px-12 py-10 lg:py-14 max-w-6xl mx-auto">
        <h2 className="font-heading text-2xl lg:text-3xl text-foreground mb-6">You May Also Like</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <section className="px-6 lg:px-12 py-10 lg:py-14 max-w-6xl mx-auto">
      <h2 className="font-heading text-2xl lg:text-3xl text-foreground mb-6">You May Also Like</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((p) => {
          const img = p.images?.[0] || "/placeholder.svg";
          return (
            <Link key={p.id} to={`/product/${p.slug}`} className="group">
              <div className="overflow-hidden bg-[#F8F5E9] mb-2">
                <img
                  src={getImageUrl(img, 600)}
                  alt={p.name}
                  className="w-full aspect-[3/4] object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = img; }}
                />
              </div>
              <h3 className="font-heading text-sm lg:text-base text-foreground truncate">{p.name}</h3>
              <p className="font-body text-sm text-muted-foreground">{formatPrice(p.price)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default YouMayAlsoLike;
