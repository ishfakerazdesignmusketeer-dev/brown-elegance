import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";

const heroSlides = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80",
    alt: "Premium Bengali fabric in warm earth tones",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1920&q=80",
    alt: "Elegant traditional craftsmanship",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1920&q=80",
    alt: "Luxurious textile details",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80",
    alt: "Artisan Bengali fashion",
  },
];

const HeroCarousel = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const autoplayPlugin = Autoplay({
    delay: 5000,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      duration: 40,
    },
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
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Carousel Container */}
      <div className="absolute inset-0" ref={emblaRef}>
        <div className="flex h-full">
          {heroSlides.map((slide) => (
            <div
              key={slide.id}
              className="relative flex-[0_0_100%] min-w-0 h-full"
            >
              <img
                src={slide.image}
                alt={slide.alt}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex items-center">
        <div className="px-6 lg:px-12 xl:pl-[10%] max-w-3xl">
          {/* Eyebrow */}
          <p className="font-body text-[11px] uppercase tracking-[2px] text-white/90 mb-6 drop-shadow-sm">
            CRAFTED FOR TIMELESS ELEGANCE
          </p>

          {/* Headline */}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-[64px] text-white leading-[1.15] mb-6 drop-shadow-md">
            Brown — Effortless Elegance,{" "}
            <em className="italic">Rooted in Heritage</em>
          </h1>

          {/* Body Text */}
          <p className="font-body text-base lg:text-lg text-white/90 leading-relaxed max-w-[480px] mb-8 drop-shadow-sm">
            Small-batch panjabis in premium fabrics, designed for those who know quality when they see it.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <a
              href="#collection"
              className="inline-flex items-center justify-center bg-cream text-foreground font-body text-[13px] uppercase tracking-[1px] px-8 py-4 hover:bg-white transition-colors"
            >
              EXPLORE THE COLLECTION
            </a>
            <a
              href="#preorder"
              className="inline-flex items-center justify-center border-2 border-white text-white font-body text-[13px] uppercase tracking-[1px] px-8 py-4 hover:bg-white/10 transition-colors"
            >
              PRE-ORDER — JOIN WAITLIST
            </a>
          </div>

          {/* Story Link */}
          <a
            href="#story"
            className="inline-block font-body text-[13px] text-white/90 hover:text-white transition-colors group"
          >
            <span className="border-b border-white/50 group-hover:border-white transition-colors">
              Our Story
            </span>
            <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </div>

      {/* Dot Navigation */}
      <div className="absolute bottom-10 right-6 lg:right-12 z-10 flex gap-3">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              selectedIndex === index
                ? "bg-white"
                : "bg-white/40 hover:bg-white/60"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
