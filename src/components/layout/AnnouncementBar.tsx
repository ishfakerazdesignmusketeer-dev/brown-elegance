const AnnouncementBar = () => {
  const marqueeText = "PRE-ORDER • LAUNCHING EID 2026 • LIMITED PIECES • HANDCRAFTED BENGALI ELEGANCE • ";
  
  return (
    <div className="bg-espresso text-cream py-2 overflow-hidden">
      <div className="flex items-center justify-between px-4 lg:px-12">
        {/* Scrolling Marquee - Left Side */}
        <div className="flex-1 overflow-hidden mr-4">
          <div className="flex animate-marquee whitespace-nowrap">
            <span className="font-body text-[11px] uppercase tracking-[1px]">
              {marqueeText}
            </span>
            <span className="font-body text-[11px] uppercase tracking-[1px]">
              {marqueeText}
            </span>
            <span className="font-body text-[11px] uppercase tracking-[1px]">
              {marqueeText}
            </span>
            <span className="font-body text-[11px] uppercase tracking-[1px]">
              {marqueeText}
            </span>
          </div>
        </div>
        
        {/* Static Link - Right Side */}
        <a 
          href="#join" 
          className="hidden md:block font-body text-[11px] uppercase tracking-[1px] hover:opacity-80 transition-opacity whitespace-nowrap"
        >
          JOIN THE BROWN CIRCLE [10% OFF FIRST ORDER]
        </a>
      </div>
    </div>
  );
};

export default AnnouncementBar;
