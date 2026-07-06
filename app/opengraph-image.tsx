import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "QR Publish";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg,#161326,#3B1D78 48%,#0E1B18)",
          color: "white",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 26, width: 680 }}>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 1.5 }}>QR Publish</div>
          <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.98 }}>
            QR Kodlarınızı Yayınlayın, Yönetin ve Ölçün
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, color: "#D8D4FF" }}>
            Dinamik QR, restoran menüsü, dijital kartvizit ve gerçek zamanlı tarama analitiği.
          </div>
        </div>
        <div
          style={{
            width: 292,
            height: 292,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: 28,
            borderRadius: 36,
            background: "white",
            boxShadow: "0 40px 90px rgba(0,0,0,.28)",
          }}
        >
          {Array.from({ length: 121 }).map((_, index) => {
            const active = [0, 1, 2, 3, 4, 6, 10, 12, 14, 18, 20, 22, 24, 30, 32, 36, 38, 40, 44, 48, 50, 52, 54, 55, 57, 60, 62, 64, 66, 70, 72, 76, 78, 80, 84, 88, 90, 92, 94, 98, 100, 104, 106, 110, 112, 114, 116, 117, 118, 119, 120].includes(index);
            return (
              <div
                key={index}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: active ? (index % 7 === 0 ? "#7C3AED" : "#16131F") : "transparent",
                }}
              />
            );
          })}
        </div>
      </div>
    ),
    size,
  );
}
