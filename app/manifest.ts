import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ניהול אירועים - House No. Seven",
    short_name: "ניהול אירועים",
    description: "מערכת פנימית לניהול אירועים",
    start_url: "/",
    display: "standalone",
    background_color: "#f2e8d2",
    theme_color: "#9c6b30",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
