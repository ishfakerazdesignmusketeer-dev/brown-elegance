import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { isPant } from "@/lib/sizes";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const TAGS = ["Heritage", "Contemporary", "Classic", "Modern", "Signature", "Essential"];
const TAGLINES = [
  "Crafted for the modern gentleman.",
  "Effortless comfort meets refined style.",
  "Timeless elegance, redefined.",
  "Where tradition meets trend.",
  "Bold statements, subtle craft.",
  "Everyday luxury, perfected.",
];
const BG_COLORS = ["#F0EAE0", "#EAE4D8"];
const BG_HOVER = ["#EAE2D4", "#E4DDD0"];

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
  });

  return (
    <section className="bg-background py-10 lg:py-14">
      <div className="px-6 lg:px-12">
        {/* Section header */}
        <div className="text-center mb-16">
          <span
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}
            className="text-[11px] uppercase tracking-[3px] text-muted-foreground"
          >
            Curated Collections
          </span>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
            className="text-4xl lg:text-5xl text-foreground mt-3"
          >
            Shop by Category
          </h2>
          <div className="flex items-center justify-center gap-3 mt-5">
            <span className="block w-12 h-px bg-foreground/20" />
            <span
              className="block w-2 h-2 rotate-45 border border-foreground/30"
            />
            <span className="block w-12 h-px bg-foreground/20" />
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton-shimmer"
                  style={{ height: 420 }}
                />
              ))
            : categories.map((cat, idx) => {
                const pant = isPant(cat.name);
                const bg = BG_COLORS[idx % 2];
                const bgHover = BG_HOVER[idx % 2];

                return (
                  <Link
                    key={cat.id}
                    to={`/collections/${cat.slug}`}
                    className="group block no-underline"
                    style={{ contain: "layout style" }}
                  >
                    <div
                      className="relative flex flex-col justify-between overflow-hidden transition-colors duration-500"
                      style={{
                        height: "clamp(420px, 50vw, 580px)",
                        padding: "40px",
                        background: bg,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = bgHover;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = bg;
                      }}
                    >
                      {/* Watermark */}
                      <span
                        className="pointer-events-none select-none absolute right-6 top-1/2 -translate-y-1/2 text-[180px] md:text-[240px] leading-none"
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 300,
                          color: "rgba(0,0,0,0.04)",
                        }}
                      >
                        {ROMAN[idx % ROMAN.length]}
                      </span>

                      {/* Top row */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span
                          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}
                          className="text-[11px] tracking-[2px] text-foreground/40"
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span
                          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}
                          className="text-[10px] uppercase tracking-[2px] text-foreground/50 border border-foreground/15 px-3 py-1"
                        >
                          {TAGS[idx % TAGS.length]}
                        </span>
                      </div>

                      {/* Center content */}
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <span className="block w-10 h-px bg-foreground/20 mb-5" />
                        <h3
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontWeight: 400,
                            lineHeight: 1,
                          }}
                          className="text-[52px] md:text-[72px] text-foreground tracking-tight"
                        >
                          {cat.name}
                        </h3>
                        <p
                          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}
                          className="text-[12px] tracking-[1px] text-foreground/50 mt-4"
                        >
                          {TAGLINES[idx % TAGLINES.length]}
                        </p>
                      </div>

                      {/* Bottom row */}
                      <div className="relative z-10 flex items-end justify-between">
                        <div>
                          <span
                            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}
                            className="block text-[9px] uppercase tracking-[2px] text-foreground/40 mb-1"
                          >
                            {pant ? "Waist Sizes" : "Available Sizes"}
                          </span>
                          <span
                            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}
                            className="text-[12px] text-foreground/60 tracking-[1px]"
                          >
                            {pant
                              ? "29 · 30 · 31 · 32 · 33 · 34 · 35 · 36"
                              : "S · M · L · XL"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}
                            className="text-[11px] uppercase tracking-[2px] text-foreground/80 transition-colors duration-300 group-hover:text-[#8B6A3E]"
                          >
                            Shop Now
                          </span>
                          <span
                            className="block h-px bg-foreground/40 transition-all duration-500 w-10 group-hover:w-16 group-hover:bg-[#8B6A3E]"
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
};

export default CategoryCards;
