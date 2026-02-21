import { Instagram, Facebook } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import logo from "@/assets/logo.png";

interface FooterSetting {
  key: string;
  value: string | null;
}

const parseLinks = (value: string | null | undefined): { label: string; href: string }[] => {
  if (!value) return [];
  return value.split(",").map((item) => {
    const [label, href] = item.split("|");
    return { label: label?.trim() || "", href: href?.trim() || "#" };
  }).filter((l) => l.label);
};

const Footer = () => {
  const { data: settingsMap = {}, isLoading } = useQuery({
    queryKey: ["footer-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("footer_settings").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data as FooterSetting[]).forEach((s) => { if (s.key && s.value) map[s.key] = s.value; });
      return map;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const get = (key: string, fallback: string = "") => settingsMap[key] || fallback;

  const col1Title = get("footer_col1_title", "Shop");
  const col1Links = parseLinks(get("footer_col1_links"));
  const col2Title = get("footer_col2_title", "Information");
  const col2Links = parseLinks(get("footer_col2_links"));
  const col3Title = get("footer_col3_title", "Support");
  const col3Links = parseLinks(get("footer_col3_links"));
  const copyright = get("copyright_text", "© 2025 Brown House. All rights reserved.");
  const instagramUrl = get("instagram_url", "#");
  const facebookUrl = get("facebook_url", "#");
  const tagline = get("brand_tagline", "Premium Bengali Menswear. Handcrafted with love.");

  const renderLinkCol = (title: string, links: { label: string; href: string }[]) => (
    <div>
      <h4 className="font-body text-[12px] uppercase tracking-[2px] text-cream/50 mb-6">
        {title}
      </h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="font-body text-sm text-cream/80 hover:text-cream transition-colors">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  if (isLoading) {
    return (
      <footer className="bg-espresso text-cream">
        <div className="px-6 lg:px-12 py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-12 w-32 bg-cream/10" />
              <Skeleton className="h-16 w-64 bg-cream/10" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-20 bg-cream/10" />
                <Skeleton className="h-4 w-32 bg-cream/10" />
                <Skeleton className="h-4 w-28 bg-cream/10" />
                <Skeleton className="h-4 w-24 bg-cream/10" />
              </div>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-espresso text-cream">
      <div className="px-6 lg:px-12 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <img src={logo} alt="Brown House" className="h-12 w-auto brightness-0 invert" />
            <p className="font-body text-sm text-cream/70 mt-6 max-w-sm leading-relaxed">
              {tagline}
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href={instagramUrl}
                className="w-10 h-10 border border-cream/30 flex items-center justify-center hover:bg-cream hover:text-espresso transition-colors"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={facebookUrl}
                className="w-10 h-10 border border-cream/30 flex items-center justify-center hover:bg-cream hover:text-espresso transition-colors"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {renderLinkCol(col1Title, col1Links)}
          {renderLinkCol(col2Title, col2Links)}
          {renderLinkCol(col3Title, col3Links)}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-cream/10 mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-[11px] text-cream/50">{copyright}</p>
          <div className="flex items-center gap-6">
            <a href="#" className="font-body text-[11px] text-cream/50 hover:text-cream transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="font-body text-[11px] text-cream/50 hover:text-cream transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
