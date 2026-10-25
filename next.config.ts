import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // pdf-parse (via pdfjs-dist) loads its worker script from disk at runtime
  // rather than through a static import, so Next's build-time file tracer
  // misses it and Vercel's deployed function can't find the file. Force it
  // to be included for the two routes that actually parse PDFs.
  outputFileTracingIncludes: {
    "/events/import": ["./node_modules/pdfjs-dist/**/*"],
    "/events/\\[id\\]/staffing": ["./node_modules/pdfjs-dist/**/*"],
  },
  experimental: {
    // Pages prefetched in the background (the navigation links) are shown from
    // memory for this long (seconds) - short, since other people edit the same
    // events. The router drops them sooner after any save done in this tab.
    staleTimes: { dynamic: 0, static: 60 },
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
