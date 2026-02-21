import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BrandingData {
  logoUrl: string | null;
  faviconUrl: string | null;
}

export const useBranding = () => {
  return useQuery({
    queryKey: ["branding"],
    queryFn: async (): Promise<BrandingData> => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["logo_url", "favicon_url"]);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      data.forEach((s) => { map[s.key] = s.value; });
      return {
        logoUrl: map.logo_url || null,
        faviconUrl: map.favicon_url || null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};
