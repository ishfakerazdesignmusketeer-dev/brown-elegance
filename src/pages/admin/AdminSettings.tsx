import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import BrandingSection from "@/components/admin/BrandingSection";

interface Setting {
  id: string;
  key: string;
  value: string | null;
}

const SETTING_META: Record<string, { label: string; type?: string; placeholder?: string }> = {
  whatsapp_number: { label: "WhatsApp Number", placeholder: "8801883132020" },
  delivery_charge: { label: "Delivery Charge (৳)", type: "number", placeholder: "80" },
  admin_password: { label: "Admin Password", type: "password", placeholder: "••••••••" },
  admin_email: { label: "Admin Email (for dashboard access)", type: "email", placeholder: "admin@example.com" },
  store_name: { label: "Store Name", placeholder: "BROWN" },
  store_email: { label: "Store Email", placeholder: "hello@brownbd.com" },
  store_url: { label: "Store URL", placeholder: "https://brownbd.com" },
  size_chart_url: { label: "Size Chart Image URL", placeholder: "https://... image URL" },
  bkash_number: { label: "bKash Number", placeholder: "01XXXXXXXXX" },
  nagad_number: { label: "Nagad Number", placeholder: "01XXXXXXXXX" },
  studio_name: { label: "Studio Name", placeholder: "Brown House Experience Studio" },
  studio_address: { label: "Studio Address", placeholder: "Full address here" },
  studio_city: { label: "City", placeholder: "Dhaka" },
  studio_map_url: { label: "Google Maps URL", placeholder: "https://maps.google.com/..." },
  studio_hours: { label: "Opening Hours", placeholder: "Sat–Thu: 11am–8pm" },
};

const AdminSettings = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async (): Promise<Setting[]> => {
      const { data, error } = await supabase.from("admin_settings").select("*");
      if (error) throw error;
      const initial: Record<string, string> = {};
      (data as Setting[]).forEach((s) => { initial[s.key] = s.value ?? ""; });
      setValues(initial);
      return data as Setting[];
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = settings.map((s) =>
        supabase
          .from("admin_settings")
          .update({ value: values[s.key] ?? s.value })
          .eq("key", s.key)
      );
      const results = await Promise.all(updates);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const orderedKeys = ["store_name", "store_email", "store_url", "admin_email", "whatsapp_number", "bkash_number", "nagad_number", "size_chart_url", "delivery_charge", "admin_password"];
  const studioKeys = ["studio_name", "studio_address", "studio_city", "studio_map_url", "studio_hours"];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Settings</h1>

      {/* Branding Section */}
      <div className="mb-8">
        <BrandingSection />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg">
        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-9 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {orderedKeys.map((key) => {
              const meta = SETTING_META[key];
              if (!meta) return null;
              const isPassword = key === "admin_password";
              return (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    {meta.label}
                  </label>
                  <div className="relative">
                    <Input
                      type={isPassword ? (showPassword ? "text" : "password") : (meta.type ?? "text")}
                      value={values[key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={meta.placeholder}
                      className="h-9 text-sm pr-10"
                    />
                    {isPassword && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  {key === "size_chart_url" && values[key] && (
                    <img src={values[key]} alt="Size chart preview" className="mt-2 max-h-32 rounded border border-border object-contain" />
                  )}
                </div>
              );
            })}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 mt-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save All"}
            </button>
          </div>
        )}
      </div>

      {/* Experience Studio Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-1">🏛️ Experience Studio Information</h2>
        <p className="text-xs text-gray-500 mb-5">Studio details shown on studio-exclusive product pages.</p>
        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-9 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {studioKeys.map((key) => {
              const meta = SETTING_META[key];
              if (!meta) return null;
              return (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    {meta.label}
                  </label>
                  <Input
                    type="text"
                    value={values[key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={meta.placeholder}
                    className="h-9 text-sm"
                  />
                </div>
              );
            })}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 mt-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save All"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
