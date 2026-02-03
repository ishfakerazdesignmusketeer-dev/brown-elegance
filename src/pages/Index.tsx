import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navigation from "@/components/layout/Navigation";
import HeroCarousel from "@/components/home/HeroCarousel";
import ProductGrid from "@/components/home/ProductGrid";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Navigation />
      <main>
        <HeroCarousel />
        <ProductGrid />
      </main>
    </div>
  );
};

export default Index;
