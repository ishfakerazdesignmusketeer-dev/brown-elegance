import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FooterSetting {
  id: string;
  key: string;
  value: string | null;
  sort_order: number;
}

interface LinkItem {
  label: string;
  url: string;
}

const parseLinks = (value: string): LinkItem[] => {
  if (!value) return [];
  return value.split(",").map((item) => {
    const [label, url] = item.split("|");
    return { label: label?.trim() || "", url: url?.trim() || "" };
  }).filter((l) => l.label);
};

const serializeLinks = (links: LinkItem[]): string => {
  return links.filter((l) => l.label).map((l) => `${l.label}|${l.url}`).join(",");
};

const AdminFooter = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [col1Links, setCol1Links] = useState<LinkItem[]>([]);
  const [col2Links, setCol2Links] = useState<LinkItem[]>([]);
  const [col3Links, setCol3Links] = useState<LinkItem[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["admin-footer-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("footer_settings").select("*").order("sort_order");
      if (error) throw error;
      return data as FooterSetting[];
    },
  });

  useEffect(() => {
    if (settings.length > 0) {
      const map: Record<string, string> = {};
      settings.forEach((s) => { map[s.key] = s.value ?? ""; });
      setValues(map);
      setCol1Links(parseLinks(map["footer_col1_links"] || ""));
      setCol2Links(parseLinks(map["footer_col2_links"] || ""));
      setCol3Links(parseLinks(map["footer_col3_links"] || ""));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalValues = {
        ...values,
        footer_col1_links: serializeLinks(col1Links),
        footer_col2_links: serializeLinks(col2Links),
        footer_col3_links: serializeLinks(col3Links),
      };
      const updates = Object.entries(finalValues).map(([key, value]) =>
        supabase.from("footer_settings").update({ value }).eq("key", key)
      );
      const results = await Promise.all(updates);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
      toast.success("Footer settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const LinkEditor = ({
    title,
    titleKey,
    links,
    setLinks,
  }: {
    title: string;
    titleKey: string;
    links: LinkItem[];
    setLinks: (links: LinkItem[]) => void;
  }) => {
    const moveLink = (idx: number, dir: -1 | 1) => {
      const target = idx + dir;
      if (target < 0 || target >= links.length) return;
      const newLinks = [...links];
      [newLinks[idx], newLinks[target]] = [newLinks[target], newLinks[idx]];
      setLinks(newLinks);
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="mb-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Column Title</label>
          <Input
            value={values[titleKey] || ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [titleKey]: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          {links.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveLink(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20">
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button onClick={() => moveLink(idx, 1)} disabled={idx === links.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <Input
                value={link.label}
                onChange={(e) => {
                  const newLinks = [...links];
                  newLinks[idx] = { ...newLinks[idx], label: e.target.value };
                  setLinks(newLinks);
                }}
                placeholder="Label"
                className="h-8 text-xs flex-1"
              />
              <Input
                value={link.url}
                onChange={(e) => {
                  const newLinks = [...links];
                  newLinks[idx] = { ...newLinks[idx], url: e.target.value };
                  setLinks(newLinks);
                }}
                placeholder="/url"
                className="h-8 text-xs flex-1"
              />
              <button onClick={() => setLinks(links.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setLinks([...links, { label: "", url: "" }])}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-2"
        >
          <Plus className="w-3 h-3" /> Add link
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Footer Settings</h1>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Footer Settings</h1>

      <div className="space-y-6 max-w-4xl">
        {/* Section 1: Brand & Contact */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Brand & Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Brand Tagline</label>
              <Input value={values["brand_tagline"] ?? ""} onChange={(e) => setValues((p) => ({ ...p, brand_tagline: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Contact Email</label>
              <Input value={values["contact_email"] ?? ""} onChange={(e) => setValues((p) => ({ ...p, contact_email: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Contact Phone</label>
              <Input value={values["contact_phone"] ?? ""} onChange={(e) => setValues((p) => ({ ...p, contact_phone: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Contact Address</label>
              <Input value={values["contact_address"] ?? ""} onChange={(e) => setValues((p) => ({ ...p, contact_address: e.target.value }))} className="h-9 text-sm" />
            </div>
          </div>
        </div>

        {/* Section 2: Social Media */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Social Media</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Instagram URL</label>
              <Input value={values["instagram_url"] ?? ""} onChange={(e) => setValues((p) => ({ ...p, instagram_url: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Facebook URL</label>
              <Input value={values["facebook_url"] ?? ""} onChange={(e) => setValues((p) => ({ ...p, facebook_url: e.target.value }))} className="h-9 text-sm" />
            </div>
          </div>
        </div>

        {/* Section 3: Link Columns */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Footer Link Columns</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LinkEditor title="Column 1" titleKey="footer_col1_title" links={col1Links} setLinks={setCol1Links} />
            <LinkEditor title="Column 2" titleKey="footer_col2_title" links={col2Links} setLinks={setCol2Links} />
            <LinkEditor title="Column 3" titleKey="footer_col3_title" links={col3Links} setLinks={setCol3Links} />
          </div>
        </div>

        {/* Section 4: Copyright */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Copyright</h3>
          <Input value={values["copyright_text"] ?? ""} onChange={(e) => setValues((p) => ({ ...p, copyright_text: e.target.value }))} className="h-9 text-sm max-w-md" />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save All"}
        </button>
      </div>
    </div>
  );
};

export default AdminFooter;
