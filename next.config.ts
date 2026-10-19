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
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
