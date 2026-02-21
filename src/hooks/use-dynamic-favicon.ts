import { useEffect } from "react";
import { useBranding } from "./use-branding";

export const useDynamicFavicon = () => {
  const { data } = useBranding();

  useEffect(() => {
    if (!data?.faviconUrl) return;
    const link: HTMLLinkElement =
      document.querySelector("link[rel='icon']") ||
      (() => {
        const el = document.createElement("link");
        el.rel = "icon";
        document.head.appendChild(el);
        return el;
      })();
    link.href = data.faviconUrl;
    link.type = data.faviconUrl.endsWith(".svg") ? "image/svg+xml" : "image/png";
  }, [data?.faviconUrl]);
};
