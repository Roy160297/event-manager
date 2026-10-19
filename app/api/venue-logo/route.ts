import { createAdminClient } from "@/lib/supabase/admin";
import { getVenueSettings } from "@/lib/venueSettings";
import { VENUE_FILES_BUCKET } from "@/lib/welcomeAttachments";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

// Serves the venue logo. Public (the login page shows it too); the bucket
// itself stays private and only this route reads from it. The URL carries the
// stored path as a version, so a replaced logo gets a new URL and the long
// cache below never shows an old one.
export async function GET(request: Request) {
  const { logo_path } = await getVenueSettings();
  if (!logo_path) return new Response(null, { status: 404 });

  const { data, error } = await createAdminClient().storage.from(VENUE_FILES_BUCKET).download(logo_path);
  if (error || !data) return new Response(null, { status: 404 });

  // Only a request that names the current logo (as the pages do) may be cached
  // for a year; a bare request is always revalidated.
  const isVersioned = new URL(request.url).searchParams.get("v") === logo_path;

  const ext = logo_path.split(".").pop()?.toLowerCase() ?? "";
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": isVersioned ? "public, max-age=31536000, immutable" : "no-cache",
    },
  });
}
