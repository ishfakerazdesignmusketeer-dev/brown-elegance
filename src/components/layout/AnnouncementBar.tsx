const AnnouncementBar = () => {
  return (
    <div className="bg-espresso text-cream py-1 overflow-hidden">
      <div className="animate-marquee-rtl whitespace-nowrap" style={{ willChange: 'transform', contain: 'content' }}>
        <span className="font-body text-[11px] uppercase tracking-[1px]">
          Free Shipping across Dhaka • COD Available • Express Delivery
        </span>
      </div>
    </div>
  );
};

export default AnnouncementBar;
