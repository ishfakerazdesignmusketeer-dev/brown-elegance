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
    const url = data.faviconUrl.toLowerCase();
    link.type = url.endsWith(".svg") ? "image/svg+xml" : url.endsWith(".jpg") || url.endsWith(".jpeg") ? "image/jpeg" : "image/png";
  }, [data?.faviconUrl]);
};
