import { useEffect } from "react";
import { useBranding } from "./use-branding";

export const useDynamicFavicon = () => {
  const { data } = useBranding();

  useEffect(() => {
    if (!data?.faviconUrl) return;
    const link: HTMLLinkElement =
      (document.getElementById("dynamic-favicon") as HTMLLinkElement) ||
      document.querySelector("link[rel='icon']") ||
      (() => {
        const el = document.createElement("link");
        el.rel = "icon";
        el.id = "dynamic-favicon";
        document.head.appendChild(el);
        return el;
      })();
    link.href = data.faviconUrl + '?t=' + Date.now();
    const url = data.faviconUrl.toLowerCase();
    link.type = url.endsWith(".svg") ? "image/svg+xml" : url.endsWith(".jpg") || url.endsWith(".jpeg") ? "image/jpeg" : "image/png";
  }, [data?.faviconUrl]);
};
