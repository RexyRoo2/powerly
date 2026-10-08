import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1C1712",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
            <rect x="5" y="8" width="20" height="14" rx="3.2" fill="#D97A52" />
            <rect x="9.5" y="12.5" width="18" height="12" rx="2.8" fill="#F2E9DA" />
            <rect x="12.5" y="16.3" width="8.5" height="1.8" rx="0.9" fill="#1C1712" fillOpacity={0.55} />
            <rect x="12.5" y="19.4" width="5.5" height="1.8" rx="0.9" fill="#1C1712" fillOpacity={0.35} />
          </svg>
          <div style={{ color: "#F2E9DA", fontSize: 56, fontWeight: 600 }}>powerly.</div>
        </div>
        <div style={{ color: "#F2E9DA", fontSize: 32, opacity: 0.8 }}>
          Your notes, turned into a finished presentation.
        </div>
      </div>
    ),
    { ...size }
  );
}
