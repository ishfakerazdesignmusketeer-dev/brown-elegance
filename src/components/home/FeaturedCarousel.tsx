import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { isYouTubeUrl, getYouTubeId } from "@/lib/video";

const featuredItems = [
{
  id: 1,
  title: "The Art of Bengali Craftsmanship",
  description: "Each piece is hand-stitched by master artisans in Dhaka, using techniques passed down through generations. Our commitment to quality means every stitch tells a story.",
  cta: "Our Craftsmanship"
},
{
  id: 2,
  title: "Premium Fabrics, Sourced Responsibly",
  description: "We partner with local weavers to source the finest cotton and silk blends. From Tangail muslin to Rajshahi silk, every fabric is chosen for its quality and heritage.",
  cta: "About Our Fabrics"
},
{
  id: 3,
  title: "Limited Edition: Eid 2026",
  description: "Introducing our most ambitious collection yet. Six exclusive pieces, each limited to just 50 units. Pre-order now to secure yours before they're gone.",
  cta: "Pre-Order Now"
}];

const FeaturedCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: reel } = useQuery({
    queryKey: ["featured-reel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reels")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
  });

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
      onMouseLeave={() => setIsPaused(false)}>

      <div className="px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="font-body text-[12px] uppercase tracking-[2px] text-cream/60">
            Featured Stories
          </span>
          <h2 className="font-heading text-4xl lg:text-5xl text-cream mt-3">The Brown Story</h2>
        </div>

        {/* Carousel */}
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Video Card */}
            <div className="flex justify-center">
              {reel ? (
                <div className="relative flex-shrink-0 overflow-hidden rounded-lg" style={{ width: '320px', height: '560px' }}>
                  {isYouTubeUrl(reel.video_url) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(reel.video_url)}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&modestbranding=1&showinfo=0&rel=0&loop=1&playlist=${getYouTubeId(reel.video_url)}&playsinline=1`}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen={false}
                      frameBorder="0"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={reel.video_url}
                      poster={reel.thumbnail_url ?? undefined}
                      autoPlay
                      muted={muted}
                      loop
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Bottom gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  {/* Mute/Unmute button */}
                  <button
                    onClick={() => setMuted(!muted)}
                    className="absolute bottom-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all duration-200 backdrop-blur-sm z-10"
                  >
                    {muted ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <line x1="23" y1="9" x2="17" y2="15"/>
                        <line x1="17" y1="9" x2="23" y2="15"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    )}
                  </button>
                  {/* Caption */}
                  {reel.caption && (
                    <div className="absolute bottom-14 left-4 right-12 z-10">
                      <p className="text-white text-sm font-body leading-snug">{reel.caption}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="flex-shrink-0 overflow-hidden rounded-lg bg-cream/10 border border-cream/20 flex flex-col items-center justify-center gap-3"
                  style={{ width: '320px', height: '560px' }}
                >
                  <span className="text-cream/40 text-4xl">🎬</span>
                  <p className="text-cream/60 font-body text-sm tracking-wide">Video coming soon</p>
                </div>
              )}
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
                className="inline-flex items-center gap-2 font-body text-[12px] uppercase tracking-[1.5px] text-cream mt-8 hover:gap-3 transition-all">
                {currentItem.cta}
                <span>→</span>
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 lg:mt-12">
            <div className="flex items-center gap-4">
              <button
                onClick={prevSlide}
                className="w-12 h-12 border border-cream/30 flex items-center justify-center text-cream hover:bg-cream hover:text-espresso transition-colors"
                aria-label="Previous slide">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="w-12 h-12 border border-cream/30 flex items-center justify-center text-cream hover:bg-cream hover:text-espresso transition-colors"
                aria-label="Next slide">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {featuredItems.map((_, index) =>
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ?
                "bg-cream w-6" :
                "bg-cream/30 hover:bg-cream/50"}`
                }
                aria-label={`Go to slide ${index + 1}`} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>);
};

export default FeaturedCarousel;
