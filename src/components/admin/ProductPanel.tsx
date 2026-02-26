import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Upload, Trash2, Link as LinkIcon, ChevronDown, ChevronRight, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

const SIZES = ["S", "M", "L", "XL", "XXL"];

interface Variant {
  id: string;
  size: string;
  stock: number;
  product_id: string;
  is_available: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  category_id: string | null;
  price: number;
  offer_price: number | null;
  sku: string | null;
  weight: number | null;
  description: string | null;
  images: string[] | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  is_preorder: boolean | null;
  is_studio_exclusive: boolean | null;
  meta_title: string | null;
  meta_description: string | null;
  product_variants: Variant[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductPanelProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const generateSku = (name: string) => {
  const initials = name.split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").join("").slice(0, 3);
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${initials}-${num}`;
};

const stockIndicator = (stock: number) => {
  if (stock === 0) return { color: "border-red-400", label: "🔴 Out of stock", text: "text-red-600" };
  if (stock <= 5) return { color: "border-amber-400", label: "⚠️ Low stock", text: "text-amber-600" };
  return { color: "border-green-400", label: "🟢", text: "text-green-600" };
};

const ProductPanel = ({ open, onClose, product }: ProductPanelProps) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [category, setCategory] = useState("everyday");
  const [price, setPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPreorder, setIsPreorder] = useState(false);
  const [isStudioExclusive, setIsStudioExclusive] = useState(false);
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [sku, setSku] = useState("");
  const [weight, setWeight] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [seoOpen, setSeoOpen] = useState(false);
  const [stocks, setStocks] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    SIZES.forEach(sz => s[sz] = 0);
    return s;
  });
  const [availability, setAvailability] = useState<Record<string, boolean>>(() => {
    const a: Record<string, boolean> = {};
    SIZES.forEach(sz => a[sz] = true);
    return a;
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["panel-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSlug(product.slug);
      setCategoryId(product.category_id ?? "");
      setCategory(product.category ?? "everyday");
      setPrice(String(product.price));
      setOfferPrice(product.offer_price ? String(product.offer_price) : "");
      setDescription(product.description ?? "");
      setImages(product.images ?? []);
      setIsActive(product.is_active ?? true);
      setIsFeatured(product.is_featured ?? false);
      setIsPreorder(product.is_preorder ?? false);
      setIsStudioExclusive(product.is_studio_exclusive ?? false);
      setIsComingSoon((product as any).is_coming_soon ?? false);
      setSku(product.sku ?? "");
      setWeight(product.weight ? String(product.weight) : "");
      setMetaTitle(product.meta_title ?? "");
      setMetaDescription(product.meta_description ?? "");
      const s: Record<string, number> = {};
      const a: Record<string, boolean> = {};
      SIZES.forEach(sz => { s[sz] = 0; a[sz] = true; });
      product.product_variants.forEach((v) => {
        s[v.size] = v.stock;
        a[v.size] = v.is_available ?? true;
      });
      setStocks(s);
      setAvailability(a);
    } else {
      setName(""); setSlug(""); setCategoryId(""); setCategory("everyday");
      setPrice(""); setOfferPrice(""); setDescription(""); setImages([]);
      setIsActive(true); setIsFeatured(false); setIsPreorder(false); setIsStudioExclusive(false); setIsComingSoon(false);
      setSku(""); setWeight(""); setMetaTitle(""); setMetaDescription("");
      const s: Record<string, number> = {};
      const a: Record<string, boolean> = {};
      SIZES.forEach(sz => { s[sz] = 0; a[sz] = true; });
      setStocks(s);
      setAvailability(a);
    }
  }, [product, open]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!product) setSlug(toSlug(val));
  };

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat) setCategory(cat.name.toLowerCase());
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      setImages((prev) => [...prev, ...urls].slice(0, 5));
      toast.success(`${files.length} image(s) uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!name.trim() || !price || !slug.trim()) {
      toast.error("Name, slug and price are required");
      return;
    }
    setSaving(true);
    try {
      const productData: any = {
        name: name.trim(),
        slug: slug.trim(),
        category,
        category_id: categoryId || null,
        price: parseInt(price),
        offer_price: offerPrice ? parseInt(offerPrice) : null,
        description: description.trim() || null,
        images,
        is_active: isActive,
        is_featured: isFeatured,
        is_preorder: isPreorder,
        is_studio_exclusive: isStudioExclusive,
        is_coming_soon: isComingSoon,
        sku: sku.trim() || null,
        weight: weight ? parseInt(weight) : null,
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
      };

      let productId = product?.id;

      if (product) {
        const { error } = await supabase.from("products").update(productData).eq("id", product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(productData).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Upsert variants
      for (const size of SIZES) {
        const stock = stocks[size] ?? 0;
        const is_available = availability[size] ?? true;
        if (product) {
          // Use upsert with ON CONFLICT
          const { error } = await supabase.from("product_variants").upsert(
            { product_id: productId!, size, stock, is_available },
            { onConflict: "product_id,size" }
          );
          if (error) throw error;
        } else {
          await supabase.from("product_variants").insert({ product_id: productId!, size, stock, is_available });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-detail"] });
      queryClient.invalidateQueries({ queryKey: ["related-products"] });
      toast.success("Product saved successfully");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-[520px] bg-white flex flex-col h-full overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{product ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Basic Info ── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Basic Info</h3>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Product Name *</label>
              <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Heritage Panjabi" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Slug *</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="heritage-panjabi" className="h-9 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Category</label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full h-9 text-sm border border-gray-200 rounded-md px-2 focus:outline-none focus:border-gray-400"
              >
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Product description..." className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-gray-400" />
            </div>
          </div>

          {/* ── Pricing ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pricing</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Regular Price *</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="৳4800" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Offer Price</label>
                <Input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="Optional" className="h-9 text-sm" />
              </div>
            </div>
            {offerPrice && parseInt(offerPrice) < parseInt(price || "0") && (
              <p className="text-[10px] text-green-600">✓ SALE badge will appear. Offer price shown as main price.</p>
            )}
          </div>

          {/* ── Images ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Images</h3>
            <div className="grid grid-cols-3 gap-2">
              {images.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-gray-200 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  {idx === 0 && <div className="absolute bottom-1 left-1 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded">Main</div>}
                </div>
              ))}
              {images.length < 5 && (
                <label className="aspect-square rounded-md border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                  {uploading ? (
                    <div className="text-xs text-gray-400 text-center">Uploading...</div>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-400">Upload</span>
                    </>
                  )}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Paste image URL..."
                className="h-8 text-xs flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  const url = imageUrlInput.trim();
                  if (!url) return;
                  setImages((prev) => [...prev, url].slice(0, 5));
                  setImageUrlInput("");
                  toast.success("Image URL added");
                }}
                disabled={!imageUrlInput.trim() || images.length >= 5}
                className="h-8 px-3 text-xs border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1"
              >
                <LinkIcon className="w-3 h-3" /> Add URL
              </button>
            </div>
            <p className="text-[10px] text-gray-400">First image = main. Max 5 images.</p>
          </div>

          {/* ── Sizes & Stock ── */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sizes & Stock</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Set stock quantity for each size</p>
            </div>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">Size</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">Stock Quantity</th>
                    <th className="py-2 px-3 text-center text-xs font-medium text-gray-500">Enable</th>
                  </tr>
                </thead>
                <tbody>
                  {SIZES.map((size) => {
                    const stock = stocks[size] ?? 0;
                    const ind = stockIndicator(stock);
                    return (
                      <tr key={size} className="border-b border-gray-100">
                        <td className="py-2.5 px-3 text-sm font-medium text-gray-700">{size}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min={0} value={stock}
                              onChange={(e) => setStocks((prev) => ({ ...prev, [size]: parseInt(e.target.value) || 0 }))}
                              className={`w-20 text-center text-sm border-2 rounded px-2 py-1 focus:outline-none ${ind.color}`}
                            />
                            <span className={`text-[10px] ${ind.text}`}>{ind.label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Switch
                            checked={availability[size] ?? true}
                            onCheckedChange={(v) => setAvailability(prev => ({ ...prev, [size]: v }))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pre-Order ── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Pre-Order</p>
                <p className="text-xs text-gray-500 mt-0.5">Toggle on if product is in production. Customers see 7-day delivery notice.</p>
              </div>
              <Switch
                checked={isPreorder}
                onCheckedChange={setIsPreorder}
                className={isPreorder ? "data-[state=checked]:bg-amber-500" : ""}
              />
            </div>
          </div>

          {/* ── Studio Exclusive ── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">🏛️ Experience Studio Exclusive</p>
                <p className="text-xs text-gray-500 mt-0.5">This product is only available at our physical studio. Customers can view but cannot order online.</p>
              </div>
              <Switch
                checked={isStudioExclusive}
                onCheckedChange={setIsStudioExclusive}
                className={isStudioExclusive ? "data-[state=checked]:bg-indigo-600" : ""}
              />
            </div>
            {isStudioExclusive && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <p className="text-[11px] text-amber-700">⚠️ When enabled: Add to Cart, Pre-Order buttons are hidden. Product is view-only on storefront.</p>
              </div>
            )}
          </div>

          {/* ── Coming Soon ── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">🔮 Coming Soon</p>
                <p className="text-xs text-gray-500 mt-0.5">Product image will be blurred. Price and details hidden. Teaser only.</p>
              </div>
              <Switch
                checked={isComingSoon}
                onCheckedChange={setIsComingSoon}
                className={isComingSoon ? "data-[state=checked]:bg-gray-900" : ""}
              />
            </div>
            {isComingSoon && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                <p className="text-[11px] text-gray-600">⚠️ When enabled: Image blurred, name hidden as "???", price hidden, no Add to Cart. Product detail shows "Dropping Soon" teaser.</p>
              </div>
            )}
          </div>

          {/* ── Additional Details ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Additional Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">SKU</label>
                <div className="flex gap-1">
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. JS-4829" className="h-9 text-sm flex-1" />
                  <button
                    type="button"
                    onClick={() => setSku(generateSku(name))}
                    className="h-9 px-2 text-xs border border-gray-200 rounded-md hover:bg-gray-50"
                    title="Auto-generate"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Weight (g)</label>
                <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="500" className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-gray-700">Is Featured</p>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} className={isFeatured ? "data-[state=checked]:bg-red-500" : ""} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-gray-700">Active / Visible</p>
                <p className="text-[10px] text-gray-400">Show on storefront</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} className={isActive ? "data-[state=checked]:bg-red-500" : ""} />
            </div>
          </div>

          {/* ── Meta / SEO ── */}
          <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              {seoOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Meta / SEO</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Meta Title</label>
                <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={name || "Product name"} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Meta Description</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value.slice(0, 160))}
                  rows={2}
                  placeholder="Brief product description for search engines..."
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-gray-400"
                />
                <p className={`text-[10px] mt-0.5 ${metaDescription.length > 150 ? "text-amber-600" : "text-gray-400"}`}>
                  {metaDescription.length}/160 characters
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || uploading} className="flex-1 h-10 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : product ? "Update Product" : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductPanel;
