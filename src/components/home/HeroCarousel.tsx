import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { getImageUrl } from "@/lib/image";

interface HeroSlide {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  sort_order: number;
}

const HeroCarousel = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("id, image_url, title, subtitle, cta_text, cta_url, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as HeroSlide[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const autoplayPlugin = Autoplay({
    delay: 5000,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 40 },
    [autoplayPlugin]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const handleVisibility = () => {
      const autoplay = emblaApi.plugins()?.autoplay;
      if (!autoplay) return;
      if (document.hidden) autoplay.stop();
      else autoplay.play();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => { if (emblaApi) emblaApi.scrollTo(index); },
    [emblaApi]
  );

  if (isLoading) {
    return (
      <section className="relative h-screen w-full overflow-hidden bg-[#F8F5E9] animate-pulse" />
    );
  }

  const displaySlides = slides.length > 0 ? slides : [{
    id: "fallback",
    image_url: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80",
    title: "Brown House — Handwoven Khadi,",
    subtitle: "Tailored Quietly",
    cta_text: "EXPLORE THE COLLECTION",
    cta_url: "/collections",
    sort_order: 1,
  }];

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0" ref={emblaRef}>
        <div className="flex h-full">
          {displaySlides.map((slide, index) => (
            <div key={slide.id} className="relative flex-[0_0_100%] min-w-0 h-full bg-[#F8F5E9]" style={{ contain: "layout" }}>
              <img
                src={getImageUrl(slide.image_url, 1920)}
                alt={slide.title || "Hero slide"}
                className="absolute inset-0 w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : undefined}
                decoding="async"
                width={1920}
                height={1080}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = slide.image_url; }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex items-end pb-24 lg:pb-32">
        <div className="px-6 lg:px-12 xl:pl-14 max-w-2xl">
          {(() => {
            const current = displaySlides[selectedIndex] || displaySlides[0];
            return (
              <>
                <p className="font-body text-[11px] uppercase tracking-[2px] text-white/80 mb-5">
                  CRAFTED FOR TIMELESS ELEGANCE
                </p>

                {current.title && (
                  <h1 className="font-heading text-4xl sm:text-5xl lg:text-[56px] text-white leading-[1.1] mb-6">
                    {current.title}
                    {current.subtitle && (
                      <>
                        <br />
                        <em className="italic">{current.subtitle}</em>
                      </>
                    )}
                  </h1>
                )}

                <p className="font-body text-[15px] text-white/80 leading-relaxed max-w-[420px] mb-8">
                  Small-batch pieces in organic cotton, linen, silk, and wool khadi.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  {current.cta_text && current.cta_url ? (
                    <a
                      href={current.cta_url}
                      className="inline-flex items-center justify-center border border-white/80 text-white font-body text-[12px] uppercase tracking-[1.5px] px-7 py-4 hover:bg-white/10 transition-colors"
                    >
                      {current.cta_text}
                    </a>
                  ) : (
                    <a
                      href="/collections"
                      className="inline-flex items-center justify-center border border-white/80 text-white font-body text-[12px] uppercase tracking-[1.5px] px-7 py-4 hover:bg-white/10 transition-colors"
                    >
                      EXPLORE THE COLLECTION
                    </a>
                  )}
                  <a
                    href="#preorder"
                    className="inline-flex items-center justify-center bg-espresso text-cream font-body text-[12px] uppercase tracking-[1.5px] px-7 py-4 hover:bg-espresso/90 transition-colors"
                  >
                    PRE-ORDER — JOIN THE WAITLIST
                  </a>
                </div>

                <a
                  href="#story"
                  className="inline-flex items-center font-body text-[13px] text-white/80 hover:text-white transition-colors group"
                >
                  <span className="border-b border-white/60 group-hover:border-white transition-colors">
                    Craft Story
                  </span>
                  <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </>
            );
          })()}
        </div>
      </div>

      {/* Dot Navigation */}
      {displaySlides.length > 1 && (
        <div className="absolute bottom-10 right-6 lg:right-12 z-10 flex items-center gap-2">
          {displaySlides.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                selectedIndex === index
                  ? "bg-white w-8"
                  : "bg-white/40 hover:bg-white/60 w-2"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HeroCarousel;
