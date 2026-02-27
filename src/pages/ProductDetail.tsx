import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { Minus, Plus, Clock, MapPin, Truck, Ruler, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/layout/Navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Footer from "@/components/layout/Footer";
import YouMayAlsoLike from "@/components/product/YouMayAlsoLike";
import LazyImage from "@/components/ui/lazy-image";

interface Variant {
  size: string;
  stock: number;
  is_available: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  offer_price: number | null;
  images: string[] | null;
  category: string | null;
  category_id: string | null;
  is_active: boolean;
  is_preorder: boolean | null;
  is_studio_exclusive: boolean | null;
  is_coming_soon: boolean | null;
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
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [returnPolicyOpen, setReturnPolicyOpen] = useState(false);

  const { data: sizeChartUrl } = useQuery({
    queryKey: ["size-chart"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "size_chart_url")
        .single();
      return data?.value || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: deliveryPrices } = useQuery({
    queryKey: ["delivery-prices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["delivery_inside_dhaka", "delivery_outside_dhaka"]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });
      return { inside: map["delivery_inside_dhaka"] || "100", outside: map["delivery_outside_dhaka"] || "130" };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: returnPolicyContent } = useQuery({
    queryKey: ["return-policy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "return_policy_content")
        .single();
      return data?.value || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: instagramUrl } = useQuery({
    queryKey: ["instagram-url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "instagram_url")
        .single();
      return data?.value || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!sizeChartOpen && !returnPolicyOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSizeChartOpen(false); setReturnPolicyOpen(false); }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [sizeChartOpen, returnPolicyOpen]);


  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(size, stock, is_available)")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data as unknown as Product;
    },
    enabled: !!slug,
  });

  const isStudioExclusive = !!product?.is_studio_exclusive;
  const isComingSoon = !!product?.is_coming_soon;

  const { data: studioSettings } = useQuery({
    queryKey: ["studio-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["studio_name", "studio_address", "studio_city", "studio_hours", "studio_map_url"]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });
      return map;
    },
    enabled: isStudioExclusive,
    staleTime: 5 * 60 * 1000,
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
          <div className="aspect-[3/4] w-full skeleton-shimmer" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 skeleton-shimmer rounded" />
            <div className="h-6 w-1/4 skeleton-shimmer rounded" />
            <div className="flex gap-3">
              {[1,2,3,4].map(i => <div key={i} className="w-12 h-12 skeleton-shimmer rounded" />)}
            </div>
            <div className="h-24 w-full skeleton-shimmer rounded" />
            <div className="h-12 w-full skeleton-shimmer rounded" />
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

  // Coming Soon full page display
  if (isComingSoon) {
    const images = product.images && product.images.length > 0 ? product.images : ["/placeholder.svg"];
    return (
      <div className="min-h-screen bg-cream">
        <AnnouncementBar />
        <Navigation />
        <main className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
          {/* Blurred background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${images[0]})`,
              filter: "blur(20px)",
              transform: "scale(1.1)",
            }}
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/60" />
          {/* Content */}
          <div className="relative z-10 text-center px-6 max-w-lg mx-auto">
            <p className="text-white/60 font-body text-[11px] uppercase tracking-[3px] mb-4">🔮</p>
            <h1 className="font-heading text-4xl lg:text-5xl text-white mb-4">DROPPING SOON</h1>
            <p className="font-body text-sm text-white/70 leading-relaxed mb-8">
              Something special is on its way. Stay tuned and keep your eyes on our Instagram for the reveal.
            </p>
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-black font-body text-[12px] uppercase tracking-[1.5px] font-bold px-8 py-4 hover:bg-white/90 transition-colors"
              >
                Follow us on Instagram →
              </a>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const variants = product.product_variants ?? [];
  const sortedVariants = SIZES_ORDER
    .map((s) => variants.find((v) => v.size === s))
    .filter(Boolean) as Variant[];

  const allOutOfStock = sortedVariants.every((v) => v.stock === 0);
  const isPreorder = !!product.is_preorder;
  const hasOfferPrice = product.offer_price != null && product.offer_price < product.price;
  const displayPrice = hasOfferPrice ? product.offer_price! : product.price;
  const selectedVariant = sortedVariants.find((v) => v.size === selectedSize);
  const maxQty = selectedVariant?.stock ?? 0;

  const images = product.images && product.images.length > 0 ? product.images : ["/placeholder.svg"];

  const handleAddToCart = () => {
    if (!selectedSize) return;
    const variant = sortedVariants.find(v => v.size === selectedSize);
    if (!variant || variant.stock === 0) {
      toast.error("This size is out of stock");
      return;
    }
    if (variant.stock < quantity) {
      toast.error(`Only ${variant.stock} left in size ${selectedSize}`);
      return;
    }
    addItem(
      { id: product.id, name: product.name, slug: product.slug, image: images[0], price: displayPrice },
      selectedSize,
      quantity
    );
  };

  const isSizeDisabled = (v: Variant) => v.stock === 0 || !(v.is_available ?? true);

  return (
    <div className="min-h-screen bg-cream page-transition">
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
            <div className="overflow-hidden bg-[#F8F5E9] mb-3" style={{ contain: 'layout style', willChange: 'auto' }}>
              <LazyImage
                src={images[mainImage]}
                alt={product.name}
                className="w-full h-auto block"
                priority
                width={1200}
                height={1600}
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
                    <LazyImage
                      src={img}
                      alt={`View ${i + 1}`}
                      className="object-center"
                      width={200}
                      height={267}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="flex flex-col">
            {/* Badges */}
            {isStudioExclusive && (
              <span className="inline-block bg-indigo-600 text-white font-body text-[10px] uppercase tracking-[1.5px] px-3 py-1.5 mb-4 w-fit">
                Studio Exclusive
              </span>
            )}
            {!isStudioExclusive && isPreorder && (
              <span className="inline-block bg-amber-500 text-white font-body text-[10px] uppercase tracking-[1.5px] px-3 py-1.5 mb-4 w-fit">
                Pre-Order
              </span>
            )}
            {!isStudioExclusive && !isPreorder && allOutOfStock && (
              <span className="inline-block bg-red-600 text-white font-body text-[10px] uppercase tracking-[1.5px] px-3 py-1.5 mb-4 w-fit">
                Sold Out
              </span>
            )}

            <h1 className="font-heading text-4xl lg:text-5xl text-foreground leading-tight mb-3">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mb-6">
              {hasOfferPrice ? (
                <div className="flex items-baseline gap-3">
                  <p className="font-body text-2xl font-bold text-foreground">
                    {formatPrice(product.offer_price!)} <span className="text-sm text-muted-foreground">BDT</span>
                  </p>
                  <p className="font-body text-lg text-muted-foreground line-through">
                    {formatPrice(product.price)}
                  </p>
                </div>
              ) : (
                <p className="font-body text-2xl text-foreground">
                  {formatPrice(product.price)} <span className="text-sm text-muted-foreground">BDT</span>
                </p>
              )}
            </div>

            {product.description && (
              <p className="font-body text-sm text-muted-foreground leading-relaxed mb-8">
                {product.description}
              </p>
            )}

            {isStudioExclusive ? (
              /* ── Studio Exclusive Block ── */
              <div className="border-l-4 border-indigo-600 bg-[#F5F3FF] rounded-r-lg p-6">
                <p className="font-body text-[10px] uppercase tracking-[2px] text-indigo-700 font-bold mb-3">
                  🏛️ Experience Studio Exclusive
                </p>
                <p className="font-body text-sm text-gray-700 leading-relaxed">
                  This piece is exclusively available at our {studioSettings?.studio_name || "Experience Studio"} in limited quantity. Visit us in person to explore and purchase this product.
                </p>
                {(studioSettings?.studio_address || studioSettings?.studio_hours) && (
                  <>
                    <hr className="border-indigo-200 my-4" />
                    {studioSettings?.studio_address && (
                      <p className="font-body text-xs text-gray-600 mb-1">
                        📍 {studioSettings.studio_address}{studioSettings?.studio_city ? `, ${studioSettings.studio_city}` : ""}
                      </p>
                    )}
                    {studioSettings?.studio_hours && (
                      <p className="font-body text-xs text-gray-600">
                        🕐 {studioSettings.studio_hours}
                      </p>
                    )}
                  </>
                )}
                <div className="mt-4">
                  {studioSettings?.studio_map_url ? (
                    <a
                      href={studioSettings.studio_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 font-body text-xs uppercase tracking-[1px] px-4 py-2.5 rounded-md transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      View on Google Maps
                    </a>
                  ) : (
                    <button
                      disabled
                      title="Location coming soon"
                      className="inline-flex items-center gap-2 border border-gray-200 text-gray-400 bg-white font-body text-xs uppercase tracking-[1px] px-4 py-2.5 rounded-md cursor-not-allowed"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      View on Google Maps
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Size Selector */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-body text-xs uppercase tracking-[1.5px] text-foreground">Size</span>
                    {sizeChartUrl && (
                      <button
                        onClick={() => { setSizeChartOpen(!sizeChartOpen); setReturnPolicyOpen(false); }}
                        className="flex items-center gap-1.5 text-[13px] uppercase tracking-widest text-foreground font-bold underline underline-offset-4 hover:opacity-70 transition-opacity"
                      >
                        <Ruler className="w-4 h-4" />
                        Size Chart
                      </button>
                    )}
                    <button
                      onClick={() => { setReturnPolicyOpen(!returnPolicyOpen); setSizeChartOpen(false); }}
                      className="flex items-center gap-1.5 text-[13px] uppercase tracking-widest text-foreground font-bold underline underline-offset-4 hover:opacity-70 transition-opacity"
                    >
                      <Undo2 className="w-4 h-4" />
                      Return Policy
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {sortedVariants.map((variant) => {
                      const disabled = isSizeDisabled(variant);
                      const isSelected = selectedSize === variant.size;
                      const isLowStock = !disabled && variant.stock > 0 && variant.stock <= 5;
                      return (
                        <div key={variant.size} className="flex flex-col items-center gap-1">
                          <div className="relative">
                            <button
                              disabled={disabled}
                              onClick={() => { setSelectedSize(variant.size); setQuantity(1); }}
                              className={`w-12 h-12 font-body text-sm border transition-all ${
                                disabled
                                  ? "border-border text-muted-foreground line-through cursor-not-allowed opacity-40"
                                  : isSelected
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border text-foreground hover:border-foreground"
                              }`}
                              title={isLowStock ? `Only ${variant.stock} left!` : undefined}
                            >
                              {variant.size}
                            </button>
                            {isLowStock && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />
                            )}
                          </div>
                          {isLowStock && (
                            <span className="font-body text-[10px] text-amber-600 font-semibold">Only {variant.stock} left!</span>
                          )}
                          {disabled && (
                            <span className="font-body text-[10px] text-muted-foreground/50">Out</span>
                          )}
                        </div>
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

                {/* Add to Cart / Pre-Order Button */}
                <Button
                  onClick={handleAddToCart}
                  disabled={!selectedSize || maxQty === 0}
                  className={`w-full font-body text-[12px] uppercase tracking-[1.5px] py-7 rounded-none disabled:opacity-50 ${
                    isPreorder
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  }`}
                >
                  {!selectedSize
                    ? "Select a Size"
                    : !isPreorder && allOutOfStock
                    ? "Out of Stock"
                    : isPreorder
                    ? "Pre-Order Now"
                    : "Add to Cart"}
                </Button>

                {/* Pre-order notice */}
                {isPreorder && (
                  <div className="flex items-center gap-2 mt-4 border border-amber-300 rounded-md px-4 py-3 bg-amber-50">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="font-body text-xs text-amber-700">Order in your door step by 7 days</p>
                  </div>
                )}

                {/* Standard delivery notice (non pre-order) */}
                {!isPreorder && (
                  <div className="flex items-center gap-2 mt-4 border border-border rounded-md px-4 py-3">
                    <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="font-body text-xs text-muted-foreground">Standard Delivery: 2–3 Business Days</p>
                  </div>
                )}

                {/* Delivery Charges */}
                <div className="mt-3 border border-border rounded-md px-4 py-3">
                  <p className="font-body text-xs font-semibold text-foreground mb-1.5">📦 Delivery Charges</p>
                  <div className="flex justify-between font-body text-xs text-muted-foreground">
                    <span>Inside Dhaka</span>
                    <span>৳{deliveryPrices?.inside || "100"}</span>
                  </div>
                  <div className="flex justify-between font-body text-xs text-muted-foreground mt-0.5">
                    <span>Outside Dhaka</span>
                    <span>৳{deliveryPrices?.outside || "130"}</span>
                  </div>
                </div>

                <p className="font-body text-xs text-muted-foreground text-center mt-4">
                  Cash on Delivery · Free exchange within 7 days
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      <YouMayAlsoLike productId={product.id} categoryId={product.category_id} />

      {/* Size Chart Modal */}
      {sizeChartOpen && sizeChartUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSizeChartOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-background rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-auto popover-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10">
              <h3 className="font-heading text-lg font-bold text-foreground">Size Chart</h3>
              <button onClick={() => setSizeChartOpen(false)} className="text-foreground/40 hover:text-foreground transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <img src={sizeChartUrl} alt="Size Chart" className="w-full h-auto" />
              <p className="text-sm text-center text-foreground font-bold mt-3 font-body">All measurements are in inches</p>
            </div>
          </div>
        </div>
      )}

      {/* Return Policy Modal */}
      {returnPolicyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setReturnPolicyOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-background rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-auto popover-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10">
              <h3 className="font-heading text-lg font-bold text-foreground">Return Policy</h3>
              <button onClick={() => setReturnPolicyOpen(false)} className="text-foreground/40 hover:text-foreground transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="font-body text-sm text-foreground leading-relaxed whitespace-pre-line">
                {returnPolicyContent || "Our return policy will be available soon. Please contact us for any queries."}
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ProductDetail;
