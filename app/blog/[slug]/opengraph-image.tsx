import { ImageResponse } from "next/og";
import { getBlogPost } from "@/lib/blog-posts";

export const alt = "QR Publish Blog rehberi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getBlogPost((await params).slug);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, color: "white", background: "linear-gradient(135deg,#0f172a,#4c1d95 55%,#0f766e)", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ fontSize: 34, fontWeight: 800 }}>QR Publish</div><div style={{ border: "2px solid rgba(255,255,255,.35)", borderRadius: 999, padding: "12px 22px", fontSize: 22 }}>{post?.category ?? "QR Rehberleri"}</div></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}><div style={{ fontSize: 64, lineHeight: 1.08, fontWeight: 900, maxWidth: 1040 }}>{post?.title ?? "QR Publish Blog"}</div><div style={{ fontSize: 25, color: "#ddd6fe" }}>Uygulamalı QR kod rehberleri · qrpublish.com/blog</div></div>
    </div>,
    size,
  );
}
