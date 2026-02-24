import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { getImageUrl } from "@/lib/image";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

const PLACEHOLDER_GRADIENTS = [
  "from-amber-800/80 to-amber-950/90",
  "from-stone-700/80 to-stone-900/90",
  "from-yellow-800/80 to-yellow-950/90",
];

const CategoryCards = () => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <section className="bg-background py-10 lg:py-14">
      <div className="px-6 lg:px-12">
        <div className="text-center mb-16">
          <span className="font-body text-[12px] uppercase tracking-[2px] text-muted-foreground">
            Find Your Style
          </span>
          <h2 className="font-heading text-4xl lg:text-5xl text-foreground mt-3">
            Shop by Category
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full rounded-none" />
              ))
            : categories.map((cat, idx) => (
                <Link
                  key={cat.id}
                  to={`/collections/${cat.slug}`}
                  className="group relative aspect-[4/3] overflow-hidden"
                  style={{ contain: 'layout style' }}
                >
                  {cat.image_url ? (
                    <img
                      src={getImageUrl(cat.image_url, 800)}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                      width={800}
                      height={600}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = cat.image_url!; }}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${PLACEHOLDER_GRADIENTS[idx % PLACEHOLDER_GRADIENTS.length]}`} />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

                  <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-8">
                    <h3 className="font-heading text-2xl lg:text-3xl text-cream">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="font-body text-sm text-cream/80 mt-1">
                        {cat.description}
                      </p>
                    )}
                    <span className="font-body text-[12px] uppercase tracking-[1.5px] text-cream mt-4 group-hover:tracking-[2px] transition-all">
                      Shop Now →
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryCards;
