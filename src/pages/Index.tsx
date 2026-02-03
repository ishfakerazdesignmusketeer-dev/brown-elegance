import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navigation from "@/components/layout/Navigation";
import HeroCarousel from "@/components/home/HeroCarousel";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Navigation />
      <main>
        <HeroCarousel />
      </main>
    </div>
  );
};

export default Index;
