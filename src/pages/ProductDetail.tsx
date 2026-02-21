import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { getImageUrl } from "@/lib/image";
import { Minus, Plus } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Footer from "@/components/layout/Footer";

interface Variant {
  size: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: string[] | null;
  category: string | null;
  category_id: string | null;
  is_active: boolean;
  product_variants: Variant[];
}

interface Category {
  name: string;
  slug: string;
}

const SIZES_ORDER = ["S", "M", "L", "XL", "XXL"];

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x, y });
  };

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(size, stock)")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!slug,
  });

  const { data: category } = useQuery({
    queryKey: ["product-category", product?.category_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name, slug")
        .eq("id", product!.category_id!)
        .single();
      if (error) return null;
      return data as Category;
    },
    enabled: !!product?.category_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream">
        <AnnouncementBar />
        <Navigation />
        <div className="px-6 lg:px-12 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="aspect-[3/4] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <p className="font-heading text-3xl text-foreground">Product not found</p>
        <Link to="/" className="font-body text-sm text-muted-foreground underline">Return to shop</Link>
      </div>
    );
  }

  const variants = product.product_variants ?? [];
  const sortedVariants = SIZES_ORDER
    .map((s) => variants.find((v) => v.size === s))
    .filter(Boolean) as Variant[];

  const allOutOfStock = sortedVariants.every((v) => v.stock === 0);
  const selectedVariant = sortedVariants.find((v) => v.size === selectedSize);
  const maxQty = selectedVariant?.stock ?? 0;

  const images = product.images && product.images.length > 0 ? product.images : ["/placeholder.svg"];

  const handleAddToCart = () => {
    if (!selectedSize) return;
    addItem(
      { id: product.id, name: product.name, slug: product.slug, image: images[0], price: product.price },
      selectedSize,
      quantity
    );
  };

  return (
    <div className="min-h-screen bg-cream">
      <AnnouncementBar />
      <Navigation />

      <main className="px-6 lg:px-12 py-10 max-w-6xl mx-auto">
        <nav className="flex items-center gap-2 font-body text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>›</span>
          {category ? (
            <Link to={`/collections/${category.slug}`} className="hover:text-foreground transition-colors capitalize">
              {category.name}
            </Link>
          ) : (
            <span className="capitalize">{product.category ?? "Collection"}</span>
          )}
          <span>›</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Left: Image Gallery */}
          <div>
            <div
              className="w-full overflow-hidden bg-[#F8F5E9] mb-3 cursor-zoom-in"
              style={{ aspectRatio: '4/5' }}
              onMouseEnter={() => setZoom(true)}
              onMouseLeave={() => setZoom(false)}
              onMouseMove={handleMouseMove}
            >
              <img
                src={getImageUrl(images[mainImage], 1200)}
                alt={product.name}
                className="w-full h-full object-cover object-center transition-transform duration-200 ease-out"
                style={{
                  transform: zoom ? 'scale(2)' : 'scale(1)',
                  transformOrigin: `${pos.x}% ${pos.y}%`,
                }}
                loading="eager"
                draggable={false}
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImage(i)}
                    className={`w-20 overflow-hidden bg-[#F8F5E9] border-2 transition-colors ${
                      mainImage === i ? "border-foreground" : "border-transparent"
                    }`}
                    style={{aspectRatio: '4/5'}}
                  >
                    <img
                      src={getImageUrl(img, 200)}
                      alt={`View ${i + 1}`}
className="w-full h-full object-cover object-center"
                      loading="lazy"
                      decoding="async"
                      width={200}
                      height={267}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = img; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="flex flex-col">
            {allOutOfStock && (
              <span className="inline-block bg-espresso text-cream font-body text-[10px] uppercase tracking-[1.5px] px-3 py-1.5 mb-4 w-fit">
                Pre-Order
              </span>
            )}

            <h1 className="font-heading text-4xl lg:text-5xl text-foreground leading-tight mb-3">
              {product.name}
            </h1>

            <p className="font-body text-2xl text-foreground mb-6">
              {formatPrice(product.price)} <span className="text-sm text-muted-foreground">BDT</span>
            </p>

            {product.description && (
              <p className="font-body text-sm text-muted-foreground leading-relaxed mb-8">
                {product.description}
              </p>
            )}

            {/* Size Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="font-body text-xs uppercase tracking-[1.5px] text-foreground">Size</span>
                {selectedSize && selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
                  <span className="font-body text-xs text-destructive">Only {selectedVariant.stock} left</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedVariants.map((variant) => {
                  const outOfStock = variant.stock === 0;
                  const isSelected = selectedSize === variant.size;
                  return (
                    <button
                      key={variant.size}
                      disabled={outOfStock}
                      onClick={() => { setSelectedSize(variant.size); setQuantity(1); }}
                      className={`w-12 h-12 font-body text-sm border transition-all ${
                        outOfStock
                          ? "border-border text-muted-foreground line-through cursor-not-allowed opacity-40"
                          : isSelected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-foreground hover:border-foreground"
                      }`}
                    >
                      {variant.size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity */}
            {selectedSize && maxQty > 0 && (
              <div className="mb-8">
                <span className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-3">Quantity</span>
                <div className="flex items-center border border-border w-fit">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-body text-sm text-foreground">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="w-10 h-10 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <Button
              onClick={handleAddToCart}
              disabled={!selectedSize || maxQty === 0}
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] py-7 rounded-none disabled:opacity-50"
            >
              {!selectedSize ? "Select a Size" : allOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>

            <p className="font-body text-xs text-muted-foreground text-center mt-4">
              Cash on Delivery · Free exchange within 7 days
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
