type PresetConfig = {
  dotType: "square" | "rounded" | "extra-rounded" | "dots" | "classy" | "classy-rounded";
  dotColor: string;
  bgColor: string;
  bgTransparent: boolean;
  useGradient: boolean;
  gradientType: "linear" | "radial";
  gradientAngle: number;
  color1: string;
  color2: string;
  eyeFrameType: "square" | "extra-rounded" | "dot" | "dots" | "rounded" | "classy" | "classy-rounded";
  eyeDotType: "square" | "dot" | "dots" | "rounded" | "extra-rounded" | "classy" | "classy-rounded";
  useCustomEyeColor: boolean;
  eyeColor: string;
  margin: number;
  logoSize: number;
};

export type QrStylePreset = {
  id: string;
  name: string;
  category: string;
  description: string;
  visibility: "system";
  config: PresetConfig;
};

const preset = (
  id: string,
  name: string,
  category: string,
  description: string,
  config: PresetConfig,
): QrStylePreset => ({ id, name, category, description, visibility: "system", config });

export const QR_STYLE_PRESETS: QrStylePreset[] = [
  preset("minimal", "Minimal", "Minimal", "Yüksek kontrastlı ve baskı dostu.", { dotType:"square", dotColor:"#0f172a", bgColor:"#ffffff", bgTransparent:false, useGradient:false, gradientType:"linear", gradientAngle:45, color1:"#0f172a", color2:"#334155", eyeFrameType:"square", eyeDotType:"square", useCustomEyeColor:false, eyeColor:"#0f172a", margin:24, logoSize:0.18 }),
  preset("corporate", "Kurumsal Mavi", "Kurumsal", "Sunumlar ve kurumsal dokümanlar için.", { dotType:"classy-rounded", dotColor:"#164e63", bgColor:"#f8fafc", bgTransparent:false, useGradient:true, gradientType:"linear", gradientAngle:90, color1:"#0369a1", color2:"#0f766e", eyeFrameType:"extra-rounded", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#0c4a6e", margin:24, logoSize:0.18 }),
  preset("restaurant", "Restoran Sıcak", "Restoran", "Menü ve masa QR'ları için sıcak tonlar.", { dotType:"rounded", dotColor:"#9a3412", bgColor:"#fffaf5", bgTransparent:false, useGradient:true, gradientType:"linear", gradientAngle:135, color1:"#ea580c", color2:"#be123c", eyeFrameType:"extra-rounded", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#9f1239", margin:24, logoSize:0.18 }),
  preset("hospital", "Sağlık Güveni", "Hastane", "Bildirim ve yönlendirme formları için temiz görünüm.", { dotType:"rounded", dotColor:"#075985", bgColor:"#f0fdfa", bgTransparent:false, useGradient:true, gradientType:"linear", gradientAngle:45, color1:"#0891b2", color2:"#0d9488", eyeFrameType:"extra-rounded", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#155e75", margin:28, logoSize:0.17 }),
  preset("hotel", "Otel Gece", "Otel", "Konaklama ve servis içerikleri için premium stil.", { dotType:"classy", dotColor:"#e2e8f0", bgColor:"#111827", bgTransparent:false, useGradient:true, gradientType:"linear", gradientAngle:135, color1:"#f8fafc", color2:"#c4b5fd", eyeFrameType:"extra-rounded", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#ffffff", margin:28, logoSize:0.17 }),
  preset("event", "Etkinlik Enerji", "Etkinlik", "Bilet, davet ve etkinlik sayfaları için.", { dotType:"dots", dotColor:"#7c3aed", bgColor:"#faf5ff", bgTransparent:false, useGradient:true, gradientType:"radial", gradientAngle:0, color1:"#8b5cf6", color2:"#ec4899", eyeFrameType:"dot", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#6d28d9", margin:24, logoSize:0.18 }),
  preset("campaign", "Kampanya Vurgu", "Kampanya", "İndirim ve dönüşüm kampanyaları için dikkat çekici.", { dotType:"extra-rounded", dotColor:"#be123c", bgColor:"#fff1f2", bgTransparent:false, useGradient:true, gradientType:"linear", gradientAngle:45, color1:"#f43f5e", color2:"#f59e0b", eyeFrameType:"extra-rounded", eyeDotType:"square", useCustomEyeColor:true, eyeColor:"#9f1239", margin:24, logoSize:0.18 }),
  preset("wifi", "Wi-Fi Hızlı", "Wi-Fi", "Mekân Wi-Fi paylaşımı için net ve modern.", { dotType:"dots", dotColor:"#1d4ed8", bgColor:"#eff6ff", bgTransparent:false, useGradient:true, gradientType:"linear", gradientAngle:90, color1:"#2563eb", color2:"#06b6d4", eyeFrameType:"dot", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#1e40af", margin:24, logoSize:0.18 }),
  preset("menu", "Menü Fresh", "Menü", "Mobil restoran menüleri için ferah görünüm.", { dotType:"rounded", dotColor:"#047857", bgColor:"#f0fdf4", bgTransparent:false, useGradient:true, gradientType:"linear", gradientAngle:135, color1:"#10b981", color2:"#0f766e", eyeFrameType:"extra-rounded", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#065f46", margin:24, logoSize:0.18 }),
  preset("vcard", "Kartvizit Net", "Kartvizit", "Profesyonel iletişim ve vCard paylaşımı için.", { dotType:"classy-rounded", dotColor:"#312e81", bgColor:"#f8fafc", bgTransparent:false, useGradient:true, gradientType:"linear", gradientAngle:135, color1:"#4f46e5", color2:"#7c3aed", eyeFrameType:"extra-rounded", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#3730a3", margin:24, logoSize:0.18 }),
  preset("booking", "Randevu Sakin", "Randevu", "Rezervasyon ve randevu akışları için güven veren.", { dotType:"rounded", dotColor:"#0f766e", bgColor:"#f0fdfa", bgTransparent:false, useGradient:false, gradientType:"linear", gradientAngle:90, color1:"#0f766e", color2:"#14b8a6", eyeFrameType:"extra-rounded", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#115e59", margin:28, logoSize:0.17 }),
  preset("feedback", "Geri Bildirim", "Feedback", "Şikayet, öneri ve istek formları için.", { dotType:"rounded", dotColor:"#6d28d9", bgColor:"#ffffff", bgTransparent:false, useGradient:true, gradientType:"linear", gradientAngle:135, color1:"#7c3aed", color2:"#0891b2", eyeFrameType:"extra-rounded", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#5b21b6", margin:28, logoSize:0.17 }),
  preset("premium", "Premium Siyah", "Premium", "Özel baskılar ve seçkin marka uygulamaları için.", { dotType:"classy", dotColor:"#111827", bgColor:"#f8fafc", bgTransparent:false, useGradient:true, gradientType:"linear", gradientAngle:45, color1:"#111827", color2:"#a16207", eyeFrameType:"extra-rounded", eyeDotType:"dot", useCustomEyeColor:true, eyeColor:"#111827", margin:28, logoSize:0.17 }),
];
