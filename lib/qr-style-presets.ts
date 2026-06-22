export const QR_STYLE_PRESETS = [
  {
    id: "classic",
    name: "Klasik",
    description: "Yüksek kontrastlı ve baskı dostu",
    config: { dotType: "square", dotColor: "#0f172a", bgColor: "#ffffff", bgTransparent: false, useGradient: false, gradientType: "linear", gradientAngle: 45, color1: "#0f172a", color2: "#334155", eyeFrameType: "square", eyeDotType: "square", useCustomEyeColor: false, eyeColor: "#0f172a", margin: 24, logoSize: 0.18 },
  },
  {
    id: "violet-flow",
    name: "Mor Akış",
    description: "Yuvarlak modüller ve canlı geçiş",
    config: { dotType: "rounded", dotColor: "#7c3aed", bgColor: "#ffffff", bgTransparent: false, useGradient: true, gradientType: "linear", gradientAngle: 135, color1: "#7c3aed", color2: "#ec4899", eyeFrameType: "extra-rounded", eyeDotType: "dot", useCustomEyeColor: true, eyeColor: "#6d28d9", margin: 24, logoSize: 0.18 },
  },
  {
    id: "ocean",
    name: "Okyanus",
    description: "Kurumsal mavi ve turkuaz",
    config: { dotType: "classy-rounded", dotColor: "#0369a1", bgColor: "#f0f9ff", bgTransparent: false, useGradient: true, gradientType: "linear", gradientAngle: 90, color1: "#0284c7", color2: "#14b8a6", eyeFrameType: "extra-rounded", eyeDotType: "dot", useCustomEyeColor: true, eyeColor: "#075985", margin: 24, logoSize: 0.18 },
  },
  {
    id: "forest",
    name: "Orman",
    description: "Doğal ve sakin yeşil tonları",
    config: { dotType: "dots", dotColor: "#047857", bgColor: "#f0fdf4", bgTransparent: false, useGradient: true, gradientType: "radial", gradientAngle: 0, color1: "#10b981", color2: "#065f46", eyeFrameType: "dot", eyeDotType: "dot", useCustomEyeColor: true, eyeColor: "#065f46", margin: 28, logoSize: 0.17 },
  },
  {
    id: "sunset",
    name: "Gün Batımı",
    description: "Sıcak kampanya görünümü",
    config: { dotType: "extra-rounded", dotColor: "#ea580c", bgColor: "#fff7ed", bgTransparent: false, useGradient: true, gradientType: "linear", gradientAngle: 45, color1: "#f97316", color2: "#e11d48", eyeFrameType: "extra-rounded", eyeDotType: "square", useCustomEyeColor: true, eyeColor: "#be123c", margin: 24, logoSize: 0.18 },
  },
  {
    id: "midnight",
    name: "Gece",
    description: "Koyu zeminli premium görünüm",
    config: { dotType: "classy", dotColor: "#e2e8f0", bgColor: "#0f172a", bgTransparent: false, useGradient: true, gradientType: "linear", gradientAngle: 135, color1: "#c4b5fd", color2: "#67e8f9", eyeFrameType: "extra-rounded", eyeDotType: "dot", useCustomEyeColor: true, eyeColor: "#f8fafc", margin: 28, logoSize: 0.17 },
  },
] as const;

export type QrStylePreset = (typeof QR_STYLE_PRESETS)[number];
