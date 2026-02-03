import { Button } from "@/components/ui/button";

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  isPreOrder?: boolean;
}

const products: Product[] = [
  {
    id: 1,
    name: "The Heritage Panjabi",
    price: 4500,
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=800&fit=crop",
    isPreOrder: true,
  },
  {
    id: 2,
    name: "The Evening Kurta",
    price: 3800,
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&h=800&fit=crop",
    isPreOrder: true,
  },
  {
    id: 3,
    name: "The Classic White",
    price: 3200,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
    isPreOrder: false,
  },
  {
    id: 4,
    name: "The Monsoon Grey",
    price: 4200,
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop",
    isPreOrder: true,
  },
  {
    id: 5,
    name: "The Celebration Gold",
    price: 5500,
    image: "https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=600&h=800&fit=crop",
    isPreOrder: false,
  },
  {
    id: 6,
    name: "The Midnight Navy",
    price: 4800,
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=800&fit=crop",
    isPreOrder: true,
  },
];

const ProductGrid = () => {
  return (
    <section className="bg-cream py-20 lg:py-28">
      <div className="px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="font-body text-[12px] uppercase tracking-[2px] text-muted-foreground">
            Curated Collection
          </span>
          <h2 className="font-heading text-4xl lg:text-5xl text-foreground mt-3">
            The First Drop
          </h2>
          <p className="font-body text-base text-muted-foreground mt-4 max-w-md mx-auto">
            Six carefully crafted pieces, each telling a story of Bengali heritage and modern elegance.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {products.map((product) => (
            <div key={product.id} className="group">
              {/* Image Container */}
              <div className="relative aspect-[3/4] overflow-hidden bg-muted mb-5">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Pre-order Badge */}
                {product.isPreOrder && (
                  <div className="absolute top-4 left-4 bg-espresso text-cream px-3 py-1.5">
                    <span className="font-body text-[10px] uppercase tracking-[1.5px]">
                      Pre-Order
                    </span>
                  </div>
                )}

                {/* Hover Overlay with Quick Add */}
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
                  <Button 
                    variant="secondary"
                    className="bg-cream text-foreground hover:bg-cream/90 font-body text-[12px] uppercase tracking-[1px] px-6 py-2.5 rounded-none"
                  >
                    Quick Add
                  </Button>
                </div>
              </div>

              {/* Product Info */}
              <div className="text-center">
                <h3 className="font-heading text-lg text-foreground group-hover:opacity-70 transition-opacity">
                  {product.name}
                </h3>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  ৳ {product.price.toLocaleString()} BDT
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-16">
          <Button 
            variant="outline"
            className="border-foreground text-foreground hover:bg-foreground hover:text-background font-body text-[12px] uppercase tracking-[1.5px] px-10 py-6 rounded-none"
          >
            View All Products
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
