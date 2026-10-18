import type { MetadataRoute } from "next";
import { getVenueSettings } from "@/lib/venueSettings";

// The name comes from the venue's settings, which can change after a deploy -
// so this must be rendered per request, not baked in at build time.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { venue_name } = await getVenueSettings();
  return {
    name: `ניהול אירועים - ${venue_name}`,
    short_name: "ניהול אירועים",
    description: "מערכת פנימית לניהול אירועים",
    start_url: "/",
    display: "standalone",
    background_color: "#f2e8d2",
    theme_color: "#9c6b30",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
