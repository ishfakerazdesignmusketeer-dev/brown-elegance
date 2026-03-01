import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const BRAND_BUCKET = "brand-assets";

interface BrandingField {
  key: string;
  label: string;
  hint: string;
  accept: string;
  folder: string;
}

const FIELDS: BrandingField[] = [
  {
    key: "logo_url",
    label: "Site Logo",
    hint: "PNG or SVG, recommended height 80px",
    accept: "image/png,image/svg+xml,image/webp",
    folder: "logo",
  },
  {
    key: "favicon_url",
    label: "Favicon",
    hint: "JPG only, 32×32 or 64×64",
    accept: "image/jpeg",
    folder: "favicon",
  },
];

const BrandingSection = () => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: values = {}, isLoading } = useQuery({
    queryKey: ["branding-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["logo_url", "favicon_url"]);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      data.forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  const handleUpload = async (field: BrandingField, file: File) => {
    setUploading(field.key);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${field.folder}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BRAND_BUCKET)
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BRAND_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("admin_settings")
        .upsert({ key: field.key, value: publicUrl }, { onConflict: 'key' });
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["branding-admin"] });
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      toast.success(`${field.label} updated`);
    } catch (err: any) {
      toast.error(err.message || `Failed to upload ${field.label}`);
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (field: BrandingField) => {
    try {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({ key: field.key, value: null }, { onConflict: 'key' });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["branding-admin"] });
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      toast.success(`${field.label} removed — using default`);
    } catch {
      toast.error(`Failed to remove ${field.label}`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="h-24 bg-gray-100 rounded mb-3" />
        <div className="h-24 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-5">
        Branding
      </h2>

      <div className="space-y-6">
        {FIELDS.map((field) => {
          const currentUrl = values[field.key];
          const isUploading = uploading === field.key;

          return (
            <div key={field.key}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                {field.label}
              </label>

              {currentUrl ? (
                <div className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="w-16 h-16 flex-shrink-0 bg-white border border-gray-200 rounded flex items-center justify-center overflow-hidden">
                    <img
                      src={currentUrl}
                      alt={field.label}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{currentUrl.split("/").pop()}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => fileRefs.current[field.key]?.click()}
                        disabled={isUploading}
                        className="text-xs text-gray-700 underline hover:text-gray-900 disabled:opacity-50"
                      >
                        Replace
                      </button>
                      <button
                        onClick={() => handleRemove(field)}
                        className="text-xs text-red-500 underline hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRefs.current[field.key]?.click()}
                  disabled={isUploading}
                  className="w-full border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center gap-2 hover:border-gray-400 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-500">
                    {isUploading ? "Uploading..." : "Click to upload"}
                  </span>
                </button>
              )}

              <p className="text-[10px] text-gray-400 mt-1.5">{field.hint}</p>

              <input
                ref={(el) => { fileRefs.current[field.key] = el; }}
                type="file"
                accept={field.accept}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(field, file);
                  e.target.value = "";
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BrandingSection;
