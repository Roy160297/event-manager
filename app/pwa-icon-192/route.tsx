import { ImageResponse } from "next/og";

// Plain route handler (not the icon.tsx metadata convention) so the URL is
// one we control directly and can hardcode into app/manifest.ts - the
// convention's own generated URLs aren't meant to be referenced externally.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#9c6b30",
          color: "#fffdf9",
          fontSize: 130,
          fontWeight: 700,
        }}
      >
        7
      </div>
    ),
    { width: 192, height: 192 },
  );
}
