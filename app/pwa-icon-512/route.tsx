import { ImageResponse } from "next/og";

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
          fontSize: 340,
          fontWeight: 700,
        }}
      >
        7
      </div>
    ),
    { width: 512, height: 512 },
  );
}
