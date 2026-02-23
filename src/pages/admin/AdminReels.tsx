import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Film } from "lucide-react";

interface Reel {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

const emptyReel = { video_url: "", thumbnail_url: "", caption: "", sort_order: 0, is_active: true };

const AdminReels = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyReel);

  const { data: reels = [], isLoading } = useQuery({
    queryKey: ["admin-reels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reels")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Reel[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        video_url: form.video_url,
        thumbnail_url: form.thumbnail_url || null,
        caption: form.caption || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      };
      if (editId) {
        const { error } = await supabase.from("reels").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reels").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reels"] });
      queryClient.invalidateQueries({ queryKey: ["featured-reel"] });
      toast({ title: editId ? "Reel updated" : "Reel created" });
      setEditOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reels"] });
      queryClient.invalidateQueries({ queryKey: ["featured-reel"] });
      toast({ title: "Reel deleted" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("reels").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reels"] });
      queryClient.invalidateQueries({ queryKey: ["featured-reel"] });
    },
  });

  const openAdd = () => {
    setEditId(null);
    setForm(emptyReel);
    setEditOpen(true);
  };

  const openEdit = (r: Reel) => {
    setEditId(r.id);
    setForm({
      video_url: r.video_url,
      thumbnail_url: r.thumbnail_url || "",
      caption: r.caption || "",
      sort_order: r.sort_order ?? 0,
      is_active: r.is_active ?? true,
    });
    setEditOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reels</h1>
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Reel
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : reels.length === 0 ? (
        <p className="text-gray-500 text-sm">No reels yet. Add your first reel.</p>
      ) : (
        <div className="space-y-3">
          {reels.map((r) => (
            <div key={r.id} className="flex items-center gap-4 bg-white border rounded-lg p-4">
              {r.thumbnail_url ? (
                <img src={r.thumbnail_url} alt="" className="w-14 h-24 object-cover rounded" />
              ) : (
                <div className="w-14 h-24 bg-gray-100 rounded flex items-center justify-center">
                  <Film className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.caption || "No caption"}</p>
                <p className="text-xs text-gray-500 truncate">{r.video_url}</p>
              </div>
              <Switch
                checked={r.is_active ?? true}
                onCheckedChange={(v) => toggleActive.mutate({ id: r.id, active: v })}
              />
              <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetTitle>{editId ? "Edit Reel" : "Add Reel"}</SheetTitle>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Video URL (Cloudflare R2)</Label>
              <Input
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://pub-xxx.r2.dev/your-reel.mp4"
              />
            </div>
            <div>
              <Label>Thumbnail / Poster Image URL</Label>
              <Input
                value={form.thumbnail_url}
                onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                placeholder="https://... shown before video loads"
              />
            </div>
            <div>
              <Label>Caption (shown on video)</Label>
              <Input
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="Optional caption"
              />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Active</Label>
            </div>

            {form.video_url && (
              <div>
                <Label className="text-xs text-gray-500">Preview</Label>
                <video
                  src={form.video_url}
                  className="w-28 h-48 object-cover rounded-lg mt-1"
                  muted
                  controls
                  preload="metadata"
                />
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => saveMutation.mutate()}
              disabled={!form.video_url || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminReels;
