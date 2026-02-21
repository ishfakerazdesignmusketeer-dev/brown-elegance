import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const featuredItems = [
  {
    id: 1,
    title: "The Art of Bengali Craftsmanship",
    description: "Each piece is hand-stitched by master artisans in Dhaka, using techniques passed down through generations. Our commitment to quality means every stitch tells a story.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=800&fit=crop",
    cta: "Our Craftsmanship",
  },
  {
    id: 2,
    title: "Premium Fabrics, Sourced Responsibly",
    description: "We partner with local weavers to source the finest cotton and silk blends. From Tangail muslin to Rajshahi silk, every fabric is chosen for its quality and heritage.",
    image: "https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=1200&h=800&fit=crop",
    cta: "About Our Fabrics",
  },
  {
    id: 3,
    title: "Limited Edition: Eid 2026",
    description: "Introducing our most ambitious collection yet. Six exclusive pieces, each limited to just 50 units. Pre-order now to secure yours before they're gone.",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200&h=800&fit=crop",
    cta: "Pre-Order Now",
  },
];

const FeaturedCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const currentItem = featuredItems[currentIndex];

  return (
    <section 
      className="bg-espresso py-20 lg:py-28"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="font-body text-[12px] uppercase tracking-[2px] text-cream/60">
            Featured Stories
          </span>
          <h2 className="font-heading text-4xl lg:text-5xl text-cream mt-3">
            The Brown Journal
          </h2>
        </div>

        {/* Carousel */}
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                key={currentItem.id}
                src={currentItem.image}
                alt={currentItem.title}
                className="w-full h-full object-cover animate-fade-in"
                loading="lazy"
                decoding="async"
                width={1200}
                height={800}
              />
            </div>

            {/* Content */}
            <div className="text-cream animate-fade-in" key={`content-${currentItem.id}`}>
              <h3 className="font-heading text-3xl lg:text-4xl leading-tight">
                {currentItem.title}
              </h3>
              <p className="font-body text-base text-cream/70 mt-6 leading-relaxed">
                {currentItem.description}
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-2 font-body text-[12px] uppercase tracking-[1.5px] text-cream mt-8 hover:gap-3 transition-all"
              >
                {currentItem.cta}
                <span>→</span>
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 lg:mt-12">
            {/* Arrows */}
            <div className="flex items-center gap-4">
              <button
                onClick={prevSlide}
                className="w-12 h-12 border border-cream/30 flex items-center justify-center text-cream hover:bg-cream hover:text-espresso transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="w-12 h-12 border border-cream/30 flex items-center justify-center text-cream hover:bg-cream hover:text-espresso transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {featuredItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "bg-cream w-6"
                      : "bg-cream/30 hover:bg-cream/50"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
