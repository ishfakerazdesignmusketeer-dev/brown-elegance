import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { X, Upload, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const SIZES = ["S", "M", "L", "XL", "XXL"];
const CATEGORIES = ["formal", "everyday", "festive", "casual"];

interface Variant {
  id: string;
  size: string;
  stock: number;
  product_id: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  price: number;
  description: string | null;
  images: string[] | null;
  is_active: boolean | null;
  product_variants: Variant[];
}

interface ProductPanelProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const ProductPanel = ({ open, onClose, product }: ProductPanelProps) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("everyday");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [stocks, setStocks] = useState<Record<string, number>>({
    S: 0, M: 0, L: 0, XL: 0, XXL: 0,
  });

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSlug(product.slug);
      setCategory(product.category ?? "everyday");
      setPrice(String(product.price));
      setDescription(product.description ?? "");
      setImages(product.images ?? []);
      setIsActive(product.is_active ?? true);
      const s: Record<string, number> = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
      product.product_variants.forEach((v) => { s[v.size] = v.stock; });
      setStocks(s);
    } else {
      setName(""); setSlug(""); setCategory("everyday"); setPrice("");
      setDescription(""); setImages([]); setIsActive(true);
      setStocks({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
    }
  }, [product, open]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!product) setSlug(toSlug(val));
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
      setImages((prev) => [...prev, ...urls]);
      toast.success(`${files.length} image(s) uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim() || !price || !slug.trim()) {
      toast.error("Name, slug and price are required");
      return;
    }
    setSaving(true);
    try {
      const productData = {
        name: name.trim(),
        slug: slug.trim(),
        category,
        price: parseInt(price),
        description: description.trim() || null,
        images,
        is_active: isActive,
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
        if (product) {
          const existingVariant = product.product_variants.find((v) => v.size === size);
          if (existingVariant) {
            await supabase.from("product_variants").update({ stock }).eq("id", existingVariant.id);
          } else {
            await supabase.from("product_variants").insert({ product_id: productId!, size, stock });
          }
        } else {
          await supabase.from("product_variants").insert({ product_id: productId!, size, stock });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
      toast.success(product ? "Product updated" : "Product created");
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
      {/* Overlay */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-[480px] bg-white flex flex-col h-full overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{product ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Product Name *</label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Heritage Panjabi" className="h-9 text-sm" />
          </div>

          {/* Slug */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Slug *</label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="heritage-panjabi" className="h-9 text-sm font-mono" />
          </div>

          {/* Category + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 text-sm border border-gray-200 rounded-md px-2 focus:outline-none focus:border-gray-400 capitalize"
              >
                {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Price (BDT) *</label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="4800" className="h-9 text-sm" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Product description..."
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* Images */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Images</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {images.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-gray-200 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  {idx === 0 && (
                    <div className="absolute bottom-1 left-1 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded">Main</div>
                  )}
                </div>
              ))}
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
            </div>
            <p className="text-[10px] text-gray-400">First image is the main image. Multiple images allowed.</p>
          </div>

          {/* Sizes & Stock */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Size & Stock</label>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {SIZES.map((s) => (
                      <th key={s} className="py-2 text-center text-xs font-medium text-gray-500">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {SIZES.map((size) => (
                      <td key={size} className="py-3 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={stocks[size]}
                          onChange={(e) => setStocks((prev) => ({ ...prev, [size]: parseInt(e.target.value) || 0 }))}
                          className="w-full text-center text-sm border border-gray-200 rounded px-1 py-1 focus:outline-none focus:border-gray-400"
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Is Active */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Active / Visible</p>
              <p className="text-xs text-gray-500">Show this product on the storefront</p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-10 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex-1 h-10 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : product ? "Update Product" : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductPanel;
