import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Upload, Trash2, ChevronUp, ChevronDown, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HeroSlide {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const AdminHeroSlides = () => {
  const queryClient = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editSlide, setEditSlide] = useState<HeroSlide | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as HeroSlide[];
    },
  });

  const openPanel = (slide?: HeroSlide) => {
    if (slide) {
      setEditSlide(slide);
      setImageUrl(slide.image_url);
      setTitle(slide.title ?? "");
      setSubtitle(slide.subtitle ?? "");
      setCtaText(slide.cta_text ?? "");
      setCtaUrl(slide.cta_url ?? "");
      setSortOrder(slide.sort_order);
      setIsActive(slide.is_active);
    } else {
      setEditSlide(null);
      setImageUrl("");
      setTitle("");
      setSubtitle("");
      setCtaText("");
      setCtaUrl("");
      setSortOrder(slides.length + 1);
      setIsActive(true);
    }
    setPanelOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("hero-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("hero-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!imageUrl.trim()) { toast.error("Image URL is required"); return; }
    setSaving(true);
    try {
      const payload = {
        image_url: imageUrl.trim(),
        title: title.trim() || null,
        subtitle: subtitle.trim() || null,
        cta_text: ctaText.trim() || null,
        cta_url: ctaUrl.trim() || null,
        sort_order: sortOrder,
        is_active: isActive,
      };
      if (editSlide) {
        const { error } = await supabase.from("hero_slides").update(payload).eq("id", editSlide.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hero_slides").insert(payload);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast.success(editSlide ? "Slide updated" : "Slide created");
      setPanelOpen(false);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Slide deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
    }
    setDeleteConfirm(null);
  };

  const toggleActive = async (slide: HeroSlide) => {
    const { error } = await supabase.from("hero_slides").update({ is_active: !slide.is_active }).eq("id", slide.id);
    if (error) toast.error("Update failed");
    else queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
  };

  const swapSort = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const a = slides[idx];
    const b = slides[target];
    await supabase.from("hero_slides").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("hero_slides").update({ sort_order: a.sort_order }).eq("id", b.id);
    queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Hero Slides</h1>
        <button onClick={() => openPanel()} className="flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : slides.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No hero slides yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {slides.map((slide, idx) => (
              <div key={slide.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => swapSort(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => swapSort(idx, 1)} disabled={idx === slides.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-20 h-[60px] rounded overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{slide.title || <span className="text-gray-400 italic">No title</span>}</p>
                  <p className="text-xs text-gray-500 truncate">{slide.subtitle || ""}</p>
                </div>
                <span className="text-xs text-gray-400">#{slide.sort_order}</span>
                <Switch checked={slide.is_active} onCheckedChange={() => toggleActive(slide)} />
                <button onClick={() => openPanel(slide)} className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 border border-gray-200 rounded">
                  Edit
                </button>
                {deleteConfirm === slide.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(slide.id)} className="text-xs text-red-600 font-medium px-2 py-1 border border-red-200 rounded bg-red-50">Confirm</button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 px-2 py-1 border border-gray-200 rounded">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(slide.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setPanelOpen(false)} />
          <div className="w-full max-w-[480px] bg-white flex flex-col h-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">{editSlide ? "Edit Slide" : "Add Slide"}</h2>
              <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Image */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Image *</label>
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Brown House — Handwoven Khadi," className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Subtitle</label>
                <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Tailored Quietly" className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">CTA Button Text</label>
                  <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="e.g. Shop Now" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">CTA Button URL</label>
                  <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="e.g. /collections/panjabi" className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Sort Order</label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className="h-9 text-sm w-24" />
              </div>
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Active</p>
                  <p className="text-xs text-gray-500">Show this slide on the homepage</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setPanelOpen(false)} className="flex-1 h-10 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || uploading} className="flex-1 h-10 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50">
                {saving ? "Saving..." : editSlide ? "Update Slide" : "Create Slide"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHeroSlides;
