import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Upload, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  product_count?: number;
}

const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AdminCategories = () => {
  const queryClient = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      // Get product counts
      const cats = data as Category[];
      const counts = await Promise.all(
        cats.map(async (c) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("category_id", c.id);
          return { ...c, product_count: count ?? 0 };
        })
      );
      return counts;
    },
  });

  const openPanel = (cat?: Category) => {
    if (cat) {
      setEditCat(cat);
      setName(cat.name);
      setSlug(cat.slug);
      setDescription(cat.description ?? "");
      setImageUrl(cat.image_url ?? "");
      setSortOrder(cat.sort_order);
      setIsActive(cat.is_active);
    } else {
      setEditCat(null);
      setName(""); setSlug(""); setDescription(""); setImageUrl("");
      setSortOrder(categories.length + 1); setIsActive(true);
    }
    setPanelOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editCat) setSlug(toSlug(val));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("category-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("category-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) { toast.error("Name and slug are required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        sort_order: sortOrder,
        is_active: isActive,
      };
      if (editCat) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editCat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-public"] });
      queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
      toast.success(editCat ? "Category updated" : "Category created");
      setPanelOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if ((cat.product_count ?? 0) > 0) {
      toast.error(`Cannot delete — ${cat.product_count} products assigned to this category`);
      setDeleteConfirm(null);
      return;
    }
    const { error } = await supabase.from("categories").delete().eq("id", cat.id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-public"] });
    }
    setDeleteConfirm(null);
  };

  const toggleActive = async (cat: Category) => {
    const { error } = await supabase.from("categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    if (error) toast.error("Update failed");
    else {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-public"] });
    }
  };

  const swapSort = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= categories.length) return;
    const a = categories[idx];
    const b = categories[target];
    await supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id);
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Categories</h1>
        <button onClick={() => openPanel()} className="flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-12 px-4 py-3"></th>
                {["Name", "Slug", "Products", "Active", "Sort", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50"><td colSpan={7} className="px-4 py-3"><div className="h-6 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : categories.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No categories yet</td></tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => swapSort(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => swapSort(idx, 1)} disabled={idx === categories.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                    <td className="px-4 py-3 text-gray-500">{cat.product_count ?? 0}</td>
                    <td className="px-4 py-3"><Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat)} /></td>
                    <td className="px-4 py-3 text-gray-400">#{cat.sort_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openPanel(cat)} className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 border border-gray-200 rounded">Edit</button>
                        {deleteConfirm === cat.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(cat)} className="text-xs text-red-600 font-medium px-2 py-1 border border-red-200 rounded bg-red-50">Confirm</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 px-2 py-1 border border-gray-200 rounded">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(cat.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setPanelOpen(false)} />
          <div className="w-full max-w-[480px] bg-white flex flex-col h-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">{editCat ? "Edit Category" : "Add Category"}</h2>
              <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Name *</label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Panjabi" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Slug *</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="panjabi" className="h-9 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Category description..." className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Image</label>
                <Tabs defaultValue="url">
                  <TabsList className="mb-2">
                    <TabsTrigger value="url" className="text-xs">URL</TabsTrigger>
                    <TabsTrigger value="upload" className="text-xs">Upload</TabsTrigger>
                  </TabsList>
                  <TabsContent value="url">
                    <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-9 text-sm" />
                  </TabsContent>
                  <TabsContent value="upload">
                    <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded cursor-pointer hover:border-gray-400">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{uploading ? "Uploading..." : "Choose image"}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                  </TabsContent>
                </Tabs>
                {imageUrl && (
                  <div className="mt-2 w-full h-32 rounded overflow-hidden bg-gray-100">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Sort Order</label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className="h-9 text-sm w-24" />
              </div>
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Active</p>
                  <p className="text-xs text-gray-500">Show this category on the storefront</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setPanelOpen(false)} className="flex-1 h-10 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || uploading} className="flex-1 h-10 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50">
                {saving ? "Saving..." : editCat ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
