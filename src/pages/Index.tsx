import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navigation from "@/components/layout/Navigation";
import HeroCarousel from "@/components/home/HeroCarousel";
import ProductGrid from "@/components/home/ProductGrid";
import CategoryCards from "@/components/home/CategoryCards";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import Newsletter from "@/components/home/Newsletter";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Navigation />
      <main>
        <HeroCarousel />
        <ProductGrid />
        <CategoryCards />
        <FeaturedCarousel />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
