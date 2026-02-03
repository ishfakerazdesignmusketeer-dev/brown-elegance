const AnnouncementBar = () => {
  const marqueeText = "Free Shipping across Dhaka • COD Available • Express Delivery • ";
  
  return (
    <div className="bg-espresso text-cream py-2 overflow-hidden">
      <div className="flex items-center justify-center px-4 lg:px-12">
        {/* Scrolling Marquee - Centered */}
        <div className="overflow-hidden">
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
      </div>
    </div>
  );
};

export default AnnouncementBar;
