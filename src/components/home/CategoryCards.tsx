const categories = [
  {
    id: 1,
    title: "Eid Elegance",
    description: "Celebrate in style",
    image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&h=600&fit=crop",
  },
  {
    id: 2,
    title: "Weekend Comfort",
    description: "Effortless everyday wear",
    image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=600&fit=crop",
  },
  {
    id: 3,
    title: "Professional Poise",
    description: "Office-ready refinement",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
  },
];

const CategoryCards = () => {
  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="font-body text-[12px] uppercase tracking-[2px] text-muted-foreground">
            Find Your Style
          </span>
          <h2 className="font-heading text-4xl lg:text-5xl text-foreground mt-3">
            Shop by Mood
          </h2>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {categories.map((category) => (
            <a
              key={category.id}
              href={`#${category.title.toLowerCase().replace(/\s+/g, '-')}`}
              className="group relative aspect-[4/3] overflow-hidden"
            >
              {/* Background Image */}
              <img
                src={category.image}
                alt={category.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-8">
                <h3 className="font-heading text-2xl lg:text-3xl text-cream">
                  {category.title}
                </h3>
                <p className="font-body text-sm text-cream/80 mt-1">
                  {category.description}
                </p>
                <span className="font-body text-[12px] uppercase tracking-[1.5px] text-cream mt-4 group-hover:tracking-[2px] transition-all">
                  Explore →
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryCards;
