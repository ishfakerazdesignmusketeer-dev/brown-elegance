const AnnouncementBar = () => {
  return (
    <div className="bg-espresso text-cream py-1 overflow-hidden">
      <div className="animate-marquee-rtl whitespace-nowrap" style={{ willChange: 'transform', contain: 'content' }}>
        <span className="font-body text-[11px] uppercase tracking-[1px]">
          ​The Studio is Open — Visit us in Bashundhara & experience Brown House in person           
        </span>
      </div>
    </div>);

};

export default AnnouncementBar;