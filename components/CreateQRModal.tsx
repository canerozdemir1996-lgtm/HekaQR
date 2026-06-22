"use client";
import { useState, useCallback, useEffect } from "react";
import {
  X, Loader2, Sparkles, Palette, Check, Lock, Plus, Shuffle,
  AlertCircle, Eye, EyeOff, Facebook, Activity,
  Copy, RefreshCw, Globe, Smartphone, Wifi,
  MessageSquare, Mail, Phone, FileText, User, Download,
  Image as ImageIcon, UserCircle, Building2, MapPin, Tag,
  ArrowLeft, Settings2, Link as LinkIcon, Shield, Bot,
  ChevronDown, Sliders, CalendarCheck,
} from "lucide-react";
import Image from "next/image";
import {
  createQrCode, updateQrCode, fetchStyles, saveStyle, buildTargetUrl,
  QR_TYPE_LABELS,
  fetchFolders, createFolder, fetchOrganizations,
  getOrCreateSettings,
  type QrCode, type QrPayload, type QrStyle, type QrType, type QrFolder, type OrganizationSummary,
} from "@/lib/supabase";
import type { VCardData } from "@/app/card/[slug]/VCardPageClient";
import Link from "next/link";
import { appendUtmParams } from "@/lib/utils/urlBuilder";
import { Button, getButtonClass } from "@/lib/button-system-2026";
import { copyToClipboard } from "@/lib/clipboard";
import PhoneInput from "@/components/PhoneInput";
import { EMPTY_MENU_DATA, type MenuData, type MenuCategory, type MenuItem, type MenuDiscount, type MenuTemplate, type MenuLogoMode, type MenuCategoryNavStyle, type MenuCategoryShowcase, type MenuProductLayout } from "@/lib/menu";
import MultiLinkPageView from "@/components/MultiLinkPageView";
import { MULTI_LINK_TEMPLATES, createEmptyMultiLinkData, createMultiLinkItem, normalizeMultiLinkData, type MultiLinkData } from "@/lib/multi-link";
import { EMPTY_FEEDBACK_CONFIG, FEEDBACK_KIND_LABEL, FEEDBACK_PRIORITY_LABEL, buildLocationLabel, normalizeFeedbackConfig, type FeedbackConfig, type FeedbackKind, type FeedbackPriority } from "@/lib/feedback";
import {
  EMPTY_APP_STORE_QR_CONFIG,
  EMPTY_BOOKING_CONFIG,
  EMPTY_DOCUMENT_QR_CONFIG,
  normalizeAppStoreQrConfig,
  normalizeBookingConfig,
  normalizeDocumentQrConfig,
  type AppStoreQrConfig,
  type BookingConfig,
  type DocumentQrConfig,
} from "@/lib/smart-qr";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QR_STYLE_PRESETS } from "@/lib/qr-style-presets";

const TYPES = ["url","product","vcard","multi","menu","feedback","booking","doc","appstore","wifi","sms","whatsapp","email","phone","text"] as const;
const MENU_CURRENCIES = [
  { value: "TL", label: "TL - Türk Lirası" },
  { value: "₺", label: "₺ - Türk Lirası" },
  { value: "$", label: "$ - US Dollar" },
  { value: "€", label: "€ - Euro" },
  { value: "£", label: "£ - Pound Sterling" },
  { value: "AED", label: "AED - Dirhem" },
  { value: "SAR", label: "SAR - Suudi Riyali" },
  { value: "KWD", label: "KWD - Kuveyt Dinarı" },
  { value: "RUB", label: "RUB - Ruble" },
  { value: "JPY", label: "JPY - Japon Yeni" },
];

function listFromText(value: string) {
  return value
    .split(/\r?\n|,/g)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 40);
}

type InlineQrStyleConfig = {
  dotType: "square" | "rounded" | "extra-rounded" | "dots" | "classy" | "classy-rounded";
  dotColor: string;
  bgColor: string;
  bgTransparent: boolean;
  useGradient: boolean;
  gradientType: "linear" | "radial";
  gradientAngle: number;
  color1: string;
  color2: string;
  eyeFrameType: "square" | "extra-rounded" | "dot";
  eyeDotType: "square" | "dot";
  useCustomEyeColor: boolean;
  eyeColor: string;
  margin: number;
  logoSize: number;
  savedLogoData?: string;
};

const DEFAULT_INLINE_QR_STYLE: InlineQrStyleConfig = {
  dotType: "square",
  dotColor: "#0f172a",
  bgColor: "#ffffff",
  bgTransparent: false,
  useGradient: false,
  gradientType: "linear",
  gradientAngle: 45,
  color1: "#7c3aed",
  color2: "#14b8a6",
  eyeFrameType: "square",
  eyeDotType: "square",
  useCustomEyeColor: false,
  eyeColor: "#0f172a",
  margin: 24,
  logoSize: 0.18,
};

function normalizeInlineQrStyle(config?: Record<string, unknown> | null): InlineQrStyleConfig {
  const c = config ?? {};
  const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T) =>
    allowed.includes(value as T) ? value as T : fallback;
  const color = (value: unknown, fallback: string) =>
    typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ? value : fallback;
  const number = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

  return {
    dotType: pick(c.dotType, ["square", "rounded", "extra-rounded", "dots", "classy", "classy-rounded"] as const, DEFAULT_INLINE_QR_STYLE.dotType),
    dotColor: color(c.dotColor, DEFAULT_INLINE_QR_STYLE.dotColor),
    bgColor: color(c.bgColor, DEFAULT_INLINE_QR_STYLE.bgColor),
    bgTransparent: typeof c.bgTransparent === "boolean" ? c.bgTransparent : DEFAULT_INLINE_QR_STYLE.bgTransparent,
    useGradient: typeof c.useGradient === "boolean" ? c.useGradient : DEFAULT_INLINE_QR_STYLE.useGradient,
    gradientType: pick(c.gradientType, ["linear", "radial"] as const, DEFAULT_INLINE_QR_STYLE.gradientType),
    gradientAngle: number(c.gradientAngle, DEFAULT_INLINE_QR_STYLE.gradientAngle, 0, 360),
    color1: color(c.color1, DEFAULT_INLINE_QR_STYLE.color1),
    color2: color(c.color2, DEFAULT_INLINE_QR_STYLE.color2),
    eyeFrameType: pick(c.eyeFrameType, ["square", "extra-rounded", "dot"] as const, DEFAULT_INLINE_QR_STYLE.eyeFrameType),
    eyeDotType: pick(c.eyeDotType, ["square", "dot"] as const, DEFAULT_INLINE_QR_STYLE.eyeDotType),
    useCustomEyeColor: typeof c.useCustomEyeColor === "boolean" ? c.useCustomEyeColor : DEFAULT_INLINE_QR_STYLE.useCustomEyeColor,
    eyeColor: color(c.eyeColor, DEFAULT_INLINE_QR_STYLE.eyeColor),
    margin: number(c.margin, DEFAULT_INLINE_QR_STYLE.margin, 8, 72),
    logoSize: number(c.logoSize, DEFAULT_INLINE_QR_STYLE.logoSize, 0.1, 0.24),
    savedLogoData: typeof c.savedLogoData === "string" && c.savedLogoData.startsWith("data:image/") ? c.savedLogoData : undefined,
  };
}

function normalizeQrType(qr?: QrCode | null): QrType {
  if ((qr as any)?.dynamic_content?.kind === "menu" || (qr as any)?.qr_type === "menu") return "menu";
  if ((qr as any)?.dynamic_content?.kind === "multi" || (qr as any)?.qr_type === "multi") return "multi";
  if ((qr as any)?.dynamic_content?.kind === "feedback" || (qr as any)?.qr_type === "feedback") return "feedback";
  if ((qr as any)?.dynamic_content?.kind === "booking" || (qr as any)?.qr_type === "booking") return "booking";
  if ((qr as any)?.dynamic_content?.kind === "doc" || (qr as any)?.qr_type === "doc") return "doc";
  if ((qr as any)?.dynamic_content?.kind === "appstore" || (qr as any)?.qr_type === "appstore") return "appstore";
  const type = (qr as any)?.qr_type;
  return TYPES.includes(type) ? type : "url";
}

function slug7() {
  const c = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 7 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

const VCARD_TPLS = [
  { id: "modern" as const, label: "Modern", desc: "Ortada profil + koyu kart", bg: "#0f172a", accent: "#6366f1", cover: "#1e1b4b" },
  { id: "executive" as const, label: "Executive", desc: "Sol hizalı kurumsal", bg: "#ffffff", accent: "#0f766e", cover: "#111827" },
  { id: "portrait" as const, label: "Portrait", desc: "Büyük görsel odaklı", bg: "#ffffff", accent: "#1d4ed8", cover: "#dbeafe" },
  { id: "clean" as const, label: "Clean", desc: "Minimal, beyaz ve ferah", bg: "#ffffff", accent: "#111827", cover: "#ffffff" },
  { id: "brand" as const, label: "Brand", desc: "Marka rengi güçlü", bg: "#0b1220", accent: "#f97316", cover: "#1e293b" },
];

const UTM_SRC  = ["google","facebook","instagram","tiktok","email","qr-code","whatsapp"];

// ─── Inline vCard mini preview for modal ─────────────────────────────────────
function VCardMiniPreview({ vcard }: { vcard: VCardData }) {
  const tmpl = vcard.template || "modern";
  const accent = vcard.accentColor || "#6366f1";
  const cover  = vcard.coverColor  || "#1e1b4b";

  const themes: Record<string, { page:string; card:string; cover:string; name:string; role:string; text:string; border:string }> = {
    modern:   { page:"#0f172a", card:"#1e293b",      cover:accent,   name:"#f1f5f9", role:"#94a3b8", text:"#cbd5e1", border:"#334155" },
    classic:  { page:"#f8fafc", card:"#ffffff",      cover:cover,    name:"#0f172a", role:"#475569", text:"#334155", border:"#e2e8f0" },
    minimal:  { page:"#fafafa", card:"#ffffff",      cover:"#f3f4f6",name:"#111827", role:"#6b7280", text:"#374151", border:"#f3f4f6" },
    dark:     { page:"#030712", card:"#080f1e",      cover:"#000",   name:"#f8fafc", role:"#94a3b8", text:"#cbd5e1", border:"#0f172a" },
    gradient: { page:`linear-gradient(140deg,${cover},${accent})`, card:"rgba(255,255,255,0.07)", cover:"transparent", name:"#fff", role:"rgba(255,255,255,0.7)", text:"rgba(255,255,255,0.85)", border:"rgba(255,255,255,0.1)" },
    executive:{ page:"#e8edf3", card:"#ffffff", cover:"#111827", name:"#111827", role:"#4b5563", text:"#1f2937", border:"#e5e7eb" },
    portrait: { page:"#f5f7fb", card:"#ffffff", cover:accent, name:"#101828", role:"#667085", text:"#344054", border:"#e4e7ec" },
    clean:    { page:"#ffffff", card:"#ffffff", cover:"#ffffff", name:"#111827", role:"#6b7280", text:"#374151", border:"#e5e7eb" },
    brand:    { page:"#08111f", card:"#0b1220", cover:`linear-gradient(135deg,${accent},${cover})`, name:"#f8fafc", role:"#cbd5e1", text:"#dbeafe", border:"#1e293b" },
    soft:     { page:"#f7f3ff", card:"#ffffff", cover:"#ede9fe", name:"#1f2937", role:"#6b7280", text:"#374151", border:"#ede9fe" },
  };
  const t = themes[tmpl] || themes.modern;
  const fullName = `${vcard.firstName||""} ${vcard.lastName||""}`.trim() || "Adınız";
  const initials = ((vcard.firstName?.[0]??"") + (vcard.lastName?.[0]??"")).toUpperCase() || "?";
  const layouts: Record<string, { coverH: number; avatar: number; radius: number; left: string; align: "center" | "left"; contentTop: number }> = {
    modern: { coverH: 116, avatar: 58, radius: 14, left: "50%", align: "center" as const, contentTop: 34 },
    executive: { coverH: 82, avatar: 54, radius: 12, left: "22%", align: "left" as const, contentTop: 34 },
    portrait: { coverH: 150, avatar: 64, radius: 18, left: "50%", align: "center" as const, contentTop: 40 },
    clean: { coverH: 54, avatar: 58, radius: 999, left: "50%", align: "center" as const, contentTop: 38 },
    brand: { coverH: 112, avatar: 56, radius: 16, left: "78%", align: "left" as const, contentTop: 18 },
  };
  const layout = layouts[tmpl] ?? layouts.modern;

  const contactRows = [
    vcard.phone  && { icon:"📞", val:vcard.phone },
    vcard.phone2 && { icon:"☎", val:vcard.phone2 },
    vcard.email  && { icon:"✉", val:vcard.email },
    vcard.email2 && { icon:"✉", val:vcard.email2 },
    vcard.website && { icon:"🌐", val:vcard.website.replace(/^https?:\/\//,"") },
    vcard.address && { icon:"📍", val:[vcard.address, vcard.city, vcard.country].filter(Boolean).join(", ") },
  ].filter(Boolean) as { icon: string; val: string }[];
  const socials = ["instagram","linkedin","twitter","github","facebook","youtube","whatsapp"].filter(k => vcard[k as keyof VCardData]);

  return (
    <div style={{ width:"100%", minHeight:"100%", background:t.page, fontFamily:"system-ui,sans-serif", display:"flex", flexDirection:"column" }}>
      {/* Cover */}
      <div style={{ position:"relative", height:layout.coverH, flexShrink:0, overflow:"visible",
        background: tmpl==="gradient" ? `linear-gradient(135deg,${cover},${accent})` : t.cover }}>
        {/* clip inner background but not avatar */}
        <div style={{ position:"absolute", inset:0, overflow:"visible" }}>
        {vcard.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vcard.coverImage} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
        )}
        {/* Avatar */}
        <div style={{ position:"absolute", bottom:-(layout.avatar / 2), left:layout.left, transform:"translateX(-50%)",
          width:layout.avatar, height:layout.avatar, borderRadius:layout.radius, overflow:"hidden",
          border:`3px solid ${t.card}`,
          background: vcard.avatar ? undefined : `linear-gradient(135deg,${accent},${cover})`,
          boxShadow:"0 4px 12px rgba(0,0,0,0.3)" }}>
          {vcard.avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={vcard.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                color:"#fff", fontSize:16, fontWeight:900 }}>{initials}</div>}
        </div>
        </div>{/* end clip inner */}
      </div>
      {/* Content */}
      <div style={{ background:t.card, flex:1, paddingTop:layout.contentTop, paddingBottom:12, paddingLeft:12, paddingRight:12 }}>
        <div style={{ textAlign:layout.align, marginBottom:10 }}>
          <div style={{ fontSize:15, fontWeight:900, color:t.name }}>{fullName}</div>
          {vcard.title && <div style={{ fontSize:10, color:t.role, marginTop:3 }}>{vcard.title}</div>}
          {vcard.company && <div style={{ fontSize:8, color:t.role, opacity:.75, marginTop:5, display:"flex", alignItems:"center", justifyContent:layout.align === "center" ? "center" : "flex-start", gap:3 }}>
            <Building2 size={7}/> {vcard.company}
          </div>}
        </div>
        {/* CTA button */}
        <div style={{ background:accent, borderRadius:8, padding:"6px 0", textAlign:"center",
          color:"#fff", fontSize:9, fontWeight:700, marginBottom:8 }}>
          Rehbere Kaydet
        </div>
        {vcard.bio && (
          <div style={{ marginBottom:8, borderRadius:8, border:`1px solid ${t.border}`, padding:"6px 7px", color:t.text, fontSize:8, lineHeight:1.35 }}>
            {vcard.bio}
          </div>
        )}
        {/* Contact rows */}
        {contactRows.map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 6px",
          borderRadius:tmpl === "executive" ? 3 : 9, background:tmpl === "brand" ? "rgba(255,255,255,0.06)" : tmpl==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",
            border:`1px solid ${t.border}`, marginBottom:4, fontSize:8, color:t.text, overflow:"hidden" }}>
            <span style={{flexShrink:0}}>{item.icon}</span>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.val}</span>
          </div>
        ))}
        {(vcard.websites || []).filter(site => site.url).map((site, i) => (
          <div key={`site-${i}`} style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 6px",
            borderRadius:6, background:tmpl==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",
            border:`1px solid ${t.border}`, marginBottom:4, fontSize:8, color:t.text, overflow:"hidden" }}>
            <span style={{flexShrink:0}}>↗</span>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{site.label || site.url}</span>
          </div>
        ))}
        {/* Social chips */}
        {socials.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginTop:4 }}>
            {socials.map(k => (
              <div key={k} style={{ fontSize:7, padding:"2px 6px", borderRadius:4, fontWeight:700,
                background:`${accent}18`, color:accent, border:`1px solid ${accent}30` }}>
                {k}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardTemplateThumb({ template, active }: { template: typeof VCARD_TPLS[number]; active: boolean }) {
  const cover = template.cover;
  const isDarkCard = ["modern", "brand"].includes(template.id);
  const avatarClass = template.id === "clean" ? "rounded-full" : template.id === "executive" ? "rounded-md" : "rounded-xl";
  return (
    <div className={`relative h-44 w-28 shrink-0 overflow-hidden rounded-2xl border transition-all ${active ? "border-violet-500 ring-4 ring-violet-500/20" : "border-slate-200 dark:border-white/10"}`} style={{ background: isDarkCard ? "#0f172a" : "#fff" }}>
      <div className={`${template.id === "portrait" ? "h-20" : template.id === "clean" ? "h-8" : "h-14"} relative`} style={{ background: cover }}>
        {template.id === "executive" && <div className="absolute bottom-0 left-0 h-1.5 w-full" style={{ background: template.accent }} />}
        {template.id === "brand" && <div className="absolute -right-6 -top-8 h-20 w-20 rotate-45 rounded-2xl bg-white/10" />}
      </div>
      <div className={`relative px-2 ${template.id === "portrait" ? "pt-4" : "pt-8"}`}>
        <div className={`absolute left-1/2 ${template.id === "portrait" ? "top-[-34px] h-14 w-14" : "top-[-22px] h-11 w-11"} -translate-x-1/2 border-[3px] bg-slate-200 ${avatarClass}`} style={{ borderColor: isDarkCard ? "#0f172a" : "#fff", background: `linear-gradient(135deg,${template.accent},${template.cover})` }} />
        <div className={`mx-auto mb-1.5 h-2.5 w-16 rounded ${isDarkCard ? "bg-white/90" : "bg-slate-900"}`} />
        <div className={`mx-auto mb-3 h-1.5 w-12 rounded ${isDarkCard ? "bg-white/35" : "bg-slate-300"}`} />
        <div className={`${template.id === "clean" ? "mx-auto w-16" : "w-full"} mb-2 h-6 rounded-lg`} style={{ background: template.id === "clean" ? "#111827" : template.accent }} />
        <div className="space-y-1.5">
          <div className={`h-4 rounded-md ${template.id === "executive" ? "border-l-4" : ""} ${isDarkCard ? "bg-white/10" : "bg-slate-100"}`} style={{ borderColor: template.accent }} />
          <div className={`h-4 rounded-md ${template.id === "clean" ? "bg-white border border-slate-200" : isDarkCard ? "bg-white/10" : "bg-slate-100"}`} />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 border-t px-1.5 py-1.5 ${isDarkCard ? "border-white/10 bg-black/25 text-white" : "border-slate-100 bg-white/90 text-slate-900"}`}>
        <p className="truncate text-[10px] font-black leading-tight">{template.label}</p>
        <p className={`truncate text-[8px] font-semibold ${isDarkCard ? "text-white/50" : "text-slate-400"}`}>{template.desc}</p>
      </div>
      {active && (
        <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg">
          <Check size={12} />
        </div>
      )}
    </div>
  );
}

const MENU_TEMPLATE_OPTIONS: { id: MenuTemplate; title: string; desc: string; hint: string }[] = [
  { id: "hero", title: "Hero", desc: "Kapak odaklı giriş", hint: "Logo ve başlık üst bölümde güçlü görünür." },
  { id: "catalog", title: "Katalog", desc: "Kategori vitrini", hint: "Kategori kartları tıklanabilir vitrin olarak çalışır." },
  { id: "compact", title: "Hızlı Menü", desc: "Dar ve hızlı liste", hint: "Kategoriler sticky kısa barla hızlı gezilir." },
  { id: "premium", title: "Premium", desc: "Ürün kartları büyük", hint: "Ürün görselleri ve fiyat alanları daha belirgin olur." },
];

const MENU_LOGO_OPTIONS: { id: MenuLogoMode; title: string; desc: string }[] = [
  { id: "small-left", title: "Sol küçük", desc: "Klasik restoran logosu" },
  { id: "center-large", title: "Ortada büyük", desc: "Marka odaklı giriş" },
  { id: "floating", title: "Yüzen", desc: "Kapak üstünde rozet" },
  { id: "hidden", title: "Gizle", desc: "Logo gösterilmez" },
];

const MENU_NAV_OPTIONS: { id: MenuCategoryNavStyle; title: string; desc: string }[] = [
  { id: "hidden", title: "Gizli", desc: "Kategori barı gösterilmez" },
  { id: "chips", title: "Chip", desc: "Kısa yazılı bar" },
  { id: "pills", title: "Büyük", desc: "Rahat dokunma alanı" },
  { id: "round", title: "Yuvarlak", desc: "Görselli kategori" },
  { id: "compact", title: "Mini", desc: "Çok kategori için" },
];

const MENU_SHOWCASE_OPTIONS: { id: MenuCategoryShowcase; title: string; desc: string }[] = [
  { id: "hidden", title: "Gösterme", desc: "Sadece kategori barı" },
  { id: "image", title: "Sadece görsel", desc: "Başlıksız görsel kutuları" },
  { id: "text", title: "Sadece yazı", desc: "Görselsiz kategori kartları" },
  { id: "both", title: "Görsel + yazı", desc: "Katalog görünümü" },
];

const MENU_PRODUCT_LAYOUT_OPTIONS: { id: MenuProductLayout; title: string; desc: string }[] = [
  { id: "image-left", title: "Görsel sol", desc: "Hızlı liste" },
  { id: "image-right", title: "Görsel sağ", desc: "Fiyat odaklı" },
  { id: "image-top", title: "Görsel üst", desc: "Fotoğraf büyük" },
  { id: "image-round", title: "Yuvarlak", desc: "Kafe tarzı" },
];

function menuAnchorId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kategori";
}

function MenuMiniPreview({ menu }: { menu: MenuData }) {
  const template = menu.template ?? "hero";
  const theme = menu.theme ?? "classic";
  const logoMode = menu.logoMode ?? "small-left";
  const navStyle = menu.categoryNavStyle ?? (template === "compact" ? "compact" : "chips");
  const showcase = menu.categoryShowcase ?? (template === "catalog" ? "both" : "hidden");
  const productLayout = menu.productLayout ?? (template === "premium" ? "image-top" : "image-left");
  const dark = theme === "dark";
  const customBg = /^#([0-9a-f]{3}){1,2}$/i.test(menu.backgroundColor || "") ? menu.backgroundColor! : "#f8fafc";
  const bg = dark ? "#020617" : customBg;
  const card = dark ? "#0f172a" : "#ffffff";
  const text = dark ? "#f8fafc" : "#0f172a";
  const muted = dark ? "#94a3b8" : "#64748b";
  const accent = dark ? "#2dd4bf" : "#0f766e";
  const categories = menu.categories.filter(category => category.name.trim());
  const activeDiscounts = (menu.discounts ?? []).filter(discount => discount.active !== false);
  const formatPrice = (price?: string) => price ? `${menu.currency || "TL"}${price}` : "";
  const showLogo = Boolean(menu.logo && logoMode !== "hidden");
  const heroHeight = template === "compact" ? 112 : logoMode === "center-large" ? 160 : 150;
  const headerTextAlign = logoMode === "center-large" ? "center" : "left";

  return (
    <div style={{ minHeight:"100%", background:bg, color:text, fontFamily:"system-ui,sans-serif", paddingBottom:18 }}>
      <div style={{ position:"relative", height: heroHeight, background:"#0f172a", overflow:"hidden" }}>
        {menu.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={menu.coverImage} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        ) : (
          <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg,${accent},#1e293b 65%,#7c3aed)` }} />
        )}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,.78),rgba(0,0,0,.08))" }} />
        {showLogo && logoMode === "floating" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={menu.logo} alt="" style={{ position:"absolute", right:14, top:16, width:56, height:56, objectFit:"cover", borderRadius:18, border:"3px solid rgba(255,255,255,.75)", background:"#fff", boxShadow:"0 12px 30px rgba(0,0,0,.3)" }} />
        )}
        <div style={{ position:"absolute", left:14, right:14, bottom:14, textAlign:headerTextAlign }}>
          {showLogo && logoMode !== "floating" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={menu.logo} alt="" style={{ width:logoMode === "center-large" ? 52 : 42, height:logoMode === "center-large" ? 52 : 42, objectFit:"cover", borderRadius:logoMode === "center-large" ? 16 : 12, border:"1px solid rgba(255,255,255,.55)", background:"#fff", marginBottom:8, marginLeft:logoMode === "center-large" ? "auto" : 0, marginRight:logoMode === "center-large" ? "auto" : 0 }} />
          )}
          <div style={{ fontSize:20, fontWeight:900, lineHeight:1.05, color:"#fff" }}>{menu.restaurantName || "Restoran Adı"}</div>
          <div style={{ marginTop:4, fontSize:10, fontWeight:700, color:"rgba(255,255,255,.72)" }}>{menu.subtitle || "Kahvaltı · Kahve · Tatlı"}</div>
        </div>
      </div>

      {activeDiscounts.length > 0 && (
        <div style={{ margin:"10px 12px 0", display:"flex", gap:6, overflow:"hidden" }}>
          {activeDiscounts.slice(0, 2).map(discount => (
            <div key={discount.id} style={{ flex:"0 0 auto", borderRadius:999, background:"#ffe4e6", color:"#be123c", padding:"5px 8px", fontSize:9, fontWeight:900 }}>
              {discount.name || "İndirim"} · {discount.type === "percent" ? `%${discount.value}` : `${discount.value} indirim`}
            </div>
          ))}
        </div>
      )}

      {categories.length > 1 && navStyle !== "hidden" && (
        <div style={{ display:"flex", gap:navStyle === "round" ? 10 : 6, overflowX:"auto", overflowY:"hidden", padding:"12px 12px 4px", scrollbarWidth:"none" }}>
          {categories.map(category => (
            <a key={category.id} href={`#${menuAnchorId(category.id)}`} style={{
              flex:"0 0 auto",
              display:"inline-flex",
              alignItems:"center",
              gap:navStyle === "round" ? 5 : 6,
              flexDirection:navStyle === "round" ? "column" : "row",
              minWidth:navStyle === "round" ? 70 : undefined,
              maxWidth:navStyle === "round" ? 76 : undefined,
              textDecoration:"none",
              borderRadius:navStyle === "compact" ? 9 : 999,
              border:`1px solid ${dark ? "rgba(255,255,255,.12)" : "rgba(15,23,42,.10)"}`,
              padding:navStyle === "pills" ? "8px 12px" : navStyle === "compact" ? "4px 8px" : navStyle === "round" ? "4px" : "5px 9px",
              fontSize:navStyle === "pills" ? 10 : navStyle === "round" ? 8.5 : 9,
              fontWeight:900,
              color:text,
              background:card
            }}>
              {navStyle === "round" && (
                <span style={{ width:44, height:44, borderRadius:999, overflow:"hidden", background:dark ? "#1e293b" : "#e2e8f0", display:"block", border:`1px solid ${dark ? "rgba(255,255,255,.08)" : "#e2e8f0"}` }}>
                  {category.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  ) : null}
                </span>
              )}
              <span style={{ maxWidth:navStyle === "round" ? 68 : 110, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.1, textAlign:"center" }}>{category.name}</span>
            </a>
          ))}
        </div>
      )}

      {showcase !== "hidden" && categories.length > 0 && (
        <div style={{ display:"flex", gap:8, overflowX:"auto", overflowY:"hidden", padding:"10px 12px 2px", scrollbarWidth:"none" }}>
          {categories.map(category => (
            <a key={category.id} href={`#${menuAnchorId(category.id)}`} style={{ flex:"0 0 auto", width:showcase === "text" ? 132 : 126, borderRadius:14, overflow:"hidden", background:card, border:`1px solid ${dark ? "rgba(255,255,255,.10)" : "#e2e8f0"}`, color:text, textDecoration:"none" }}>
              {(showcase === "image" || showcase === "both") && (
                <div style={{ aspectRatio:"1 / 1", background:"#cbd5e1" }}>
                  {category.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  ) : null}
                </div>
              )}
              {(showcase === "text" || showcase === "both") && (
                <div style={{ padding:showcase === "text" ? "12px" : 7, fontSize:showcase === "text" ? 12 : 10, fontWeight:900 }}>{category.name}</div>
              )}
            </a>
          ))}
        </div>
      )}

      <div style={{ display: template === "premium" ? "grid" : "block", gridTemplateColumns:"1fr", gap:10, padding:"12px" }}>
        {categories.map(category => (
          <section key={category.id} id={menuAnchorId(category.id)} style={{ marginBottom:template === "premium" ? 0 : 14, scrollMarginTop:64 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              {template !== "compact" && category.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={category.image} alt="" style={{ width:34, height:34, objectFit:"cover", borderRadius:9 }} />
              )}
              <h3 style={{ fontSize:15, fontWeight:900 }}>{category.name || "Kategori"}</h3>
            </div>
            <div style={{ display:"grid", gap:8 }}>
              {category.items.filter(item => item.name.trim()).map(item => (
                <article key={item.id} style={{ overflow:"hidden", borderRadius:16, background:card, border:`1px solid ${dark ? "rgba(255,255,255,.10)" : "#e2e8f0"}`, boxShadow:dark ? "none" : "0 8px 20px rgba(15,23,42,.06)", display:productLayout === "image-top" ? "block" : "grid", gridTemplateColumns:productLayout === "image-right" ? "1fr 86px" : productLayout === "image-left" || productLayout === "image-round" ? "86px 1fr" : undefined }}>
                  {item.image && productLayout !== "image-right" && (
                    <div style={{ aspectRatio: productLayout === "image-top" ? "16 / 9" : "1 / 1", width:productLayout === "image-top" ? "100%" : 86, height:productLayout === "image-top" ? undefined : "100%", minHeight:86, background:"#cbd5e1", padding:productLayout === "image-round" ? 8 : 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:productLayout === "image-round" ? 999 : 0 }} />
                    </div>
                  )}
                  <div style={{ padding:10, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:900 }}>{item.name}</div>
                        {item.description && <p style={{ marginTop:3, fontSize:9, lineHeight:1.35, color:muted }}>{item.description}</p>}
                      </div>
                      {item.price && <div style={{ flexShrink:0, fontSize:12, fontWeight:900, color:accent }}>{formatPrice(item.price)}</div>}
                    </div>
                    {(item.calories || item.protein || item.carbs || item.fat || item.allergens) && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
                        {item.calories && <span style={{ borderRadius:7, background:dark ? "rgba(255,255,255,.08)" : "#f1f5f9", padding:"3px 5px", fontSize:8, fontWeight:800 }}>{item.calories} kcal</span>}
                        {item.protein && <span style={{ borderRadius:7, background:dark ? "rgba(255,255,255,.08)" : "#f1f5f9", padding:"3px 5px", fontSize:8, fontWeight:800 }}>P {item.protein}</span>}
                        {item.carbs && <span style={{ borderRadius:7, background:dark ? "rgba(255,255,255,.08)" : "#f1f5f9", padding:"3px 5px", fontSize:8, fontWeight:800 }}>K {item.carbs}</span>}
                        {item.fat && <span style={{ borderRadius:7, background:dark ? "rgba(255,255,255,.08)" : "#f1f5f9", padding:"3px 5px", fontSize:8, fontWeight:800 }}>Y {item.fat}</span>}
                      </div>
                    )}
                  </div>
                  {item.image && productLayout === "image-right" && (
                    <div style={{ aspectRatio:"1 / 1", width:86, minHeight:86, background:"#cbd5e1" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const UTM_MED  = ["cpc","social","email","organic","qr","display","sms"];
const UTM_CAMP = ["brand","launch","sale","retargeting","influencer","seasonal"];

type Tab = "content" | "tracking" | "settings";
type ScheduleRow = { start: string; end: string; url: string };

interface Props {
  onClose: () => void;
  onSuccess: (qr: QrCode) => void;
  editing?: QrCode | null;
  presentation?: "modal" | "page";
}

const EMPTY_VCARD: VCardData = {
  firstName: "", lastName: "", title: "", company: "", department: "", bio: "",
  phone: "", phone2: "", email: "", email2: "", website: "",
  address: "", city: "", country: "",
  instagram: "", linkedin: "", twitter: "", facebook: "", youtube: "", github: "", whatsapp: "",
  template: "modern", accentColor: "#6366f1", coverColor: "#0f172a", avatar: "", coverImage: "",
  websites: [],
};

// ─── Zod Schema for VCardData ────────────────────────────────────────────────
const VCardDataSchema = z.object({
  firstName: z.string().min(1, "Ad zorunlu").max(50, "Ad çok uzun"),
  lastName: z.string().max(50, "Soyad çok uzun").optional(),
  title: z.string().max(100, "Ünvan çok uzun").optional(),
  company: z.string().max(100, "Şirket adı çok uzun").optional(),
  department: z.string().max(100, "Departman çok uzun").optional(),
  bio: z.string().max(500, "Biyografi çok uzun").optional(),
  phone: z.string().max(20, "Telefon numarası çok uzun").optional(),
  phone2: z.string().max(20, "Telefon numarası çok uzun").optional(),
  email: z.string().email("Geçerli e-posta adresi girin").max(100, "E-posta çok uzun").optional().or(z.literal("")),
  email2: z.string().email("Geçerli e-posta adresi girin").max(100, "E-posta çok uzun").optional().or(z.literal("")),
  website: z.string().url("Geçerli web sitesi URL'si girin").max(200, "URL çok uzun").optional().or(z.literal("")),
  address: z.string().max(200, "Adres çok uzun").optional(),
  city: z.string().max(50, "Şehir çok uzun").optional(),
  country: z.string().max(50, "Ülke çok uzun").optional(),
  instagram: z.string().max(100, "Kullanıcı adı çok uzun").optional(),
  linkedin: z.string().max(100, "Kullanıcı adı çok uzun").optional(),
  twitter: z.string().max(100, "Kullanıcı adı çok uzun").optional(),
  facebook: z.string().max(100, "Kullanıcı adı çok uzun").optional(),
  youtube: z.string().max(100, "Kullanıcı adı çok uzun").optional(),
  github: z.string().max(100, "Kullanıcı adı çok uzun").optional(),
  whatsapp: z.string().max(20, "Telefon numarası çok uzun").optional(),
  template: z.enum(["modern", "classic", "minimal", "dark", "gradient", "executive", "portrait", "clean", "brand", "soft"]).default("modern"),
  accentColor: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Geçersiz renk kodu").default("#6366f1"),
  coverColor: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Geçersiz renk kodu").default("#0f172a"),
  avatar: z.string().url("Geçerli avatar URL'si girin").optional(),
  coverImage: z.string().url("Geçerli kapak görseli URL'si girin").optional(),
  websites: z.array(z.object({
    label: z.string().max(50, "Etiket çok uzun").optional(),
    url: z.string().url("Geçerli web sitesi URL'si girin").max(200, "URL çok uzun").optional(),
  })).optional(),
}).partial().default(EMPTY_VCARD); // Make all fields optional for partial updates or initial empty state, but provide default

// ─── Zod Schema for QrPayload (form values) ──────────────────────────────────
const QrFormSchema = z.object({
  qrType: z.enum(TYPES),
  title: z.string().min(1, "Başlık zorunlu").max(255, "Başlık çok uzun"),
  slug: z.string().min(1, "Slug zorunlu").regex(/^[a-z0-9_-]+$/, "Slug sadece küçük harf, rakam, tire (-) veya alt çizgi (_) içerebilir").max(50, "Slug çok uzun"),
  url: z.string().url("Geçerli URL girin (https://...)").max(2000, "URL çok uzun").optional().or(z.literal("")),
  vcard: VCardDataSchema,
  wifiSsid: z.string().min(1, "Ağ adı zorunlu").max(100, "Ağ adı çok uzun").optional(),
  wifiPwd: z.string().max(100, "Şifre çok uzun").optional(),
  wifiSec: z.enum(["WPA", "WEP", "nopass"]).default("WPA"),
  phone: z.string().max(20, "Telefon numarası çok uzun").optional(),
  message: z.string().max(500, "Mesaj çok uzun").optional(),
  emailTo: z.string().email("Geçerli e-posta adresi girin").max(100, "E-posta çok uzun").optional().or(z.literal("")),
  emailSub: z.string().max(255, "Konu çok uzun").optional(),
  emailBody: z.string().max(1000, "İçerik çok uzun").optional(),
  textVal: z.string().min(1, "İçerik zorunlu").max(1000, "Metin çok uzun").optional(),
  password: z.string().max(100, "Şifre çok uzun").optional(),
  showPwd: z.boolean().default(false), // Not part of payload, but form state
  scanLimit: z.string().regex(/^\d+$/g, "Pozitif sayı girin").transform(Number).refine(n => n >= 1, "Pozitif sayı girin").optional().or(z.literal("")),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
  redir: z.enum(["301", "302"]).default("302"),
  abUrl: z.string().url("Geçerli URL girin").max(2000, "URL çok uzun").optional().or(z.literal("")),
  abWeight: z.string().regex(/^\d+$/g, "Sayı girin").transform(Number).refine(n => n >= 10 && n <= 90, "10 ile 90 arası değer girin").default("50"),
  pixelOn: z.boolean().default(false),
  pixelId: z.string().min(1, "Pixel ID gerekli").max(50, "Pixel ID çok uzun").optional(),
  utmSrc: z.string().max(100, "UTM kaynağı çok uzun").optional(),
  utmMed: z.string().max(100, "UTM ortamı çok uzun").optional(),
  utmCamp: z.string().max(100, "UTM kampanyası çok uzun").optional(),
  utmTerm: z.string().max(100, "UTM terimi çok uzun").optional(),
  utmCont: z.string().max(100, "UTM içeriği çok uzun").optional(),
  isActive: z.boolean().default(true),
  styleId: z.string().nullable(),
  folderId: z.string().nullable(),
  rMobile: z.string().url("Geçerli URL girin").max(2000, "URL çok uzun").optional().or(z.literal("")),
  rTablet: z.string().url("Geçerli URL girin").max(2000, "URL çok uzun").optional().or(z.literal("")),
  rDesktop: z.string().url("Geçerli URL girin").max(2000, "URL çok uzun").optional().or(z.literal("")),
  countryJson: z.string().optional().or(z.literal("")),
  scheduleRows: z.array(z.object({
    start: z.string().datetime().optional().or(z.literal("")),
    end: z.string().datetime().optional().or(z.literal("")),
    url: z.string().url("Geçerli URL girin").max(2000, "URL çok uzun").optional().or(z.literal("")),
  })),
  ga4Id: z.string().max(50, "GA4 ID çok uzun").optional(),
  gtmId: z.string().max(50, "GTM ID çok uzun").optional(),
  webhookUrl: z.string().url("Geçerli Webhook URL'si girin").max(2000, "Webhook URL'si çok uzun").optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(500, "Notlar çok uzun").optional(),
}).superRefine((data, ctx) => { // Custom refinements for cross-field validation
  // Conditional pixelId validation
  if (data.pixelOn && !data.pixelId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pixelId"],
      message: "Pixel ID gerekli olduğunda zorunludur.",
    });
  }
});

export default function CreateQRModal({ onClose, onSuccess, editing, presentation = "modal" }: Props) {
  const isEdit = !!editing;
  const isPage = presentation === "page";
  const initialQrType = normalizeQrType(editing);

  const [qrType,      setQrType]      = useState<QrType>(initialQrType);
  const [typePicked,  setTypePicked]  = useState(isEdit);
  const [tab,         setTab]         = useState<Tab>("content");

  const [title,       setTitle]       = useState(editing?.title ?? "");
  const [slug,        setSlug]        = useState(editing?.short_slug ?? slug7());
  const [slugEdited,  setSlugEdited]  = useState(false);

  const [url,         setUrl]         = useState(
    !editing || initialQrType === "url" || initialQrType === "product" ? (editing?.target_url ?? "") : ""
  );
  const [wifiSsid,    setWifiSsid]    = useState("");
  const [wifiPwd,     setWifiPwd]     = useState("");
  const [wifiSec,     setWifiSec]     = useState("WPA");
  const [phone,       setPhone]       = useState("");
  const [message,     setMessage]     = useState("");
  const [emailTo,     setEmailTo]     = useState("");
  const [emailSub,    setEmailSub]    = useState("");
  const [emailBody,   setEmailBody]   = useState("");
  const [textVal,     setTextVal]     = useState("");
  const [vcard,       setVcard]       = useState<VCardData>(editing?.vcard_data ?? EMPTY_VCARD);
  const [menu,        setMenu]        = useState<MenuData>(() => {
    const existing = (editing as any)?.dynamic_content as MenuData | undefined;
    return initialQrType === "menu" && existing ? existing : EMPTY_MENU_DATA;
  });
  const [multi,       setMulti]       = useState<MultiLinkData>(() => {
    const existing = (editing as any)?.dynamic_content;
    return initialQrType === "multi" ? normalizeMultiLinkData(existing) : createEmptyMultiLinkData();
  });
  const [feedback, setFeedback] = useState<FeedbackConfig>(() => {
    const existing = (editing as any)?.dynamic_content;
    return initialQrType === "feedback" ? normalizeFeedbackConfig(existing) : EMPTY_FEEDBACK_CONFIG;
  });
  const [booking, setBooking] = useState<BookingConfig>(() => {
    const existing = (editing as any)?.dynamic_content;
    return initialQrType === "booking" ? normalizeBookingConfig(existing) : EMPTY_BOOKING_CONFIG;
  });
  const [docQr, setDocQr] = useState<DocumentQrConfig>(() => {
    const existing = (editing as any)?.dynamic_content;
    return initialQrType === "doc" ? normalizeDocumentQrConfig(existing) : EMPTY_DOCUMENT_QR_CONFIG;
  });
  const [appQr, setAppQr] = useState<AppStoreQrConfig>(() => {
    const existing = (editing as any)?.dynamic_content;
    return initialQrType === "appstore" ? normalizeAppStoreQrConfig(existing) : EMPTY_APP_STORE_QR_CONFIG;
  });
  const [activeMenuCategoryId, setActiveMenuCategoryId] = useState(() => {
    const existing = (editing as any)?.dynamic_content as MenuData | undefined;
    const initialMenu = initialQrType === "menu" && existing ? existing : EMPTY_MENU_DATA;
    return initialMenu.categories[0]?.id ?? "";
  });

  const [password,    setPassword]    = useState(editing?.password ?? "");
  const [showPwd,     setShowPwd]     = useState(false);
  const [scanLimit,   setScanLimit]   = useState(editing?.scan_limit?.toString() ?? "");
  const [expiresAt,   setExpiresAt]   = useState(
    editing?.expires_at ? new Date(editing.expires_at).toISOString().slice(0, 16) : ""
  );
  const [redir,       setRedir]       = useState<"301"|"302">(editing?.redirect_type ?? "302");
  const [abUrl,       setAbUrl]       = useState(editing?.ab_test_url ?? "");
  const [abWeight,    setAbWeight]    = useState(editing?.ab_test_weight?.toString() ?? "50");

  const [pixelOn,     setPixelOn]     = useState(editing?.pixel_enabled ?? false);
  const [pixelId,     setPixelId]     = useState(editing?.pixel_id ?? "");
  const [utmSrc,      setUtmSrc]      = useState(editing?.utm_source ?? "");
  const [utmMed,      setUtmMed]      = useState(editing?.utm_medium ?? "");
  const [utmCamp,     setUtmCamp]     = useState(editing?.utm_campaign ?? "");
  const [utmTerm,     setUtmTerm]     = useState(editing?.utm_term ?? "");
  const [utmCont,     setUtmCont]     = useState(editing?.utm_content ?? "");

  const [isActive,    setIsActive]    = useState(editing?.is_active ?? true);
  const [styleId,     setStyleId]     = useState<string|null>(editing?.style_id ?? null);
  const [customStyleConfig, setCustomStyleConfig] = useState<InlineQrStyleConfig>(DEFAULT_INLINE_QR_STYLE);
  const [customStyleDirty, setCustomStyleDirty] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [folders,     setFolders]     = useState<QrFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [foldersError, setFoldersError] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationId, setOrganizationId] = useState<string|null>((editing as any)?.organization_id ?? null);
  const [folderId,    setFolderId]    = useState<string|null>((editing as any)?.folder_id ?? null);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [designPanel, setDesignPanel] = useState<"dots" | "eyes" | "colors" | "logo" | "advanced">("colors");
  const [inlineFolderName, setInlineFolderName] = useState("");
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // Conditional routing rules (simple)
  const existingRules = ((editing as any)?.rules ?? {}) as Record<string, any>;
  const [rMobile, setRMobile]   = useState(existingRules?.device_redirect?.mobile ?? "");
  const [rTablet, setRTablet]   = useState(existingRules?.device_redirect?.tablet ?? "");
  const [rDesktop, setRDesktop] = useState(existingRules?.device_redirect?.desktop ?? "");
  const [countryJson, setCountryJson] = useState(() => {
    try {
      return existingRules?.country_redirect
        ? JSON.stringify(existingRules.country_redirect, null, 2)
        : "";
    } catch { return ""; }
  });
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(() => {
    const rows = Array.isArray(existingRules?.schedule_redirect) ? existingRules.schedule_redirect : [];
    return rows.map((r: any) => ({
      start: r?.start ? String(r.start).slice(0, 16) : "",
      end:   r?.end ? String(r.end).slice(0, 16) : "",
      url:   r?.url ? String(r.url) : "",
    }));
  });

  // Tracking bridge config
  const [ga4Id, setGa4Id] = useState<string>(((editing as any)?.ga4_measurement_id ?? "") as string);
  const [gtmId, setGtmId] = useState<string>(((editing as any)?.gtm_container_id ?? "") as string);
  const [webhookUrl, setWebhookUrl] = useState<string>(((editing as any)?.webhook_url ?? "") as string);
  const [tags,        setTags]        = useState<string[]>(editing?.tags ?? []);
  const [tagInput,    setTagInput]    = useState("");
  const [notes,       setNotes]       = useState(editing?.notes ?? "");
  const [styles,      setStyles]      = useState<QrStyle[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Record<string,string>>({});
  const [copied,      setCopied]      = useState(false);
  const [planAtLimit, setPlanAtLimit] = useState(false);

  useEffect(() => { fetchStyles().then(setStyles).catch(() => {}); }, []);
  useEffect(() => {
    fetchFolders().then(setFolders).catch(() => setFoldersError(true)).finally(() => setFoldersLoading(false));
  }, []);
  useEffect(() => { fetchOrganizations().then(setOrganizations).catch(() => {}); }, []);
  // Plan limiti UX kilidi — gerçek karar her zaman sunucuda (POST /api/v1/qrcodes → 402) verilir,
  // bu sadece /dashboard/qrcodes/new'e doğrudan URL ile girilince butonu erkenden kilitler.
  useEffect(() => {
    if (isEdit) return;
    fetch("/api/v1/plan", { credentials: "same-origin", cache: "no-store" })
      .then(r => r.json())
      .then(data => setPlanAtLimit(Boolean(data?.at_qr_limit)))
      .catch(() => {});
  }, [isEdit]);
  useEffect(() => {
    const selected = styleId ? styles.find((style) => style.id === styleId) : null;
    if (styleId) setActivePresetId(null);
    if (!customStyleDirty) {
      setCustomStyleConfig(normalizeInlineQrStyle(selected?.config ?? null));
    }
  }, [styleId, styles, customStyleDirty]);

  function parseWifiTarget(t: string): { security: string; ssid: string; password: string } | null {
    const s = (t || "").trim();
    if (!s.toUpperCase().startsWith("WIFI:")) return null;
    const body = s.replace(/^WIFI:/i, "");

    const unesc = (v: string) =>
      String(v ?? "")
        .replace(/\\\\/g, "\\")
        .replace(/\\;/g, ";")
        .replace(/\\,/g, ",")
        .replace(/\\:/g, ":");

    // split by unescaped ';'
    const parts: string[] = [];
    let cur = "";
    let esc = false;
    for (const ch of body) {
      if (esc) { cur += ch; esc = false; continue; }
      if (ch === "\\") { cur += ch; esc = true; continue; }
      if (ch === ";") { parts.push(cur); cur = ""; continue; }
      cur += ch;
    }
    if (cur) parts.push(cur);

    const out: Record<string, string> = {};
    for (const part of parts) {
      const idx = part.indexOf(":");
      if (idx <= 0) continue;
      const k = part.slice(0, idx).toUpperCase();
      const v = part.slice(idx + 1);
      out[k] = unesc(v);
    }

    return {
      security: out["T"] || "WPA",
      ssid: out["S"] || "",
      password: out["P"] || "",
    };
  }

  useEffect(() => {
    if (!editing) return;
    const qt = normalizeQrType(editing);
    setQrType(qt);
    setTitle(editing.title ?? "");
    setSlug(editing.short_slug ?? "");
    setIsActive(editing.is_active ?? true);
    setStyleId(editing.style_id ?? null);
    setOrganizationId((editing as any)?.organization_id ?? null);
    setFolderId((editing as any)?.folder_id ?? null);
    setCustomStyleDirty(false);

    // Fill type-specific fields from stored target_url (or vcard_data)
    const t = String(editing.target_url ?? "");
    if (qt === "url") setUrl(t);
    if (qt === "wifi") {
      const w = parseWifiTarget(t);
      setWifiSsid(w?.ssid ?? "");
      setWifiPwd(w?.password ?? "");
      setWifiSec(w?.security ?? "WPA");
    }
    if (qt === "sms") {
      try {
        // sms:PHONE?body=...
        const m = t.match(/^sms:([^?]+)(?:\?(.+))?$/i);
        if (m) {
          setPhone(m[1] ?? "");
          const p = new URLSearchParams(m[2] ?? "");
          setMessage(p.get("body") ?? "");
        }
      } catch { /* ignore */ }
    }
    if (qt === "whatsapp") {
      try {
        const u = new URL(t);
        if (u.hostname.includes("wa.me")) {
          setPhone(u.pathname.replace(/\//g, ""));
          setMessage(u.searchParams.get("text") ?? "");
        }
      } catch { /* ignore */ }
    }
    if (qt === "email") {
      try {
        const m = t.match(/^mailto:([^?]+)(?:\?(.+))?$/i);
        if (m) {
          setEmailTo(m[1] ?? "");
          const p = new URLSearchParams(m[2] ?? "");
          setEmailSub(p.get("subject") ?? "");
          setEmailBody(p.get("body") ?? "");
        }
      } catch { /* ignore */ }
    }
    if (qt === "phone") {
      const m = t.match(/^tel:(.+)$/i);
      if (m) setPhone(m[1] ?? "");
    }
    if (qt === "text") setTextVal(t);
    if (qt === "vcard") setVcard((editing.vcard_data ?? EMPTY_VCARD) as VCardData);
    if (qt === "multi") {
      setMulti(normalizeMultiLinkData((editing as any)?.dynamic_content));
    }
    if (qt === "menu") {
      const nextMenu = (((editing as any)?.dynamic_content as MenuData | null) ?? EMPTY_MENU_DATA);
      setMenu(nextMenu);
      setActiveMenuCategoryId(nextMenu.categories[0]?.id ?? "");
    }
    if (qt === "feedback") {
      setFeedback(normalizeFeedbackConfig((editing as any)?.dynamic_content));
    }
    if (qt === "booking") {
      setBooking(normalizeBookingConfig((editing as any)?.dynamic_content));
    }
    if (qt === "doc") {
      setDocQr(normalizeDocumentQrConfig((editing as any)?.dynamic_content));
    }
    if (qt === "appstore") {
      setAppQr(normalizeAppStoreQrConfig((editing as any)?.dynamic_content));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  useEffect(() => {
    if (qrType !== "menu") return;
    if (!menu.categories.length) return;
    if (!activeMenuCategoryId || !menu.categories.some(category => category.id === activeMenuCategoryId)) {
      setActiveMenuCategoryId(menu.categories[0]?.id ?? "");
    }
  }, [activeMenuCategoryId, menu.categories, qrType]);

  useEffect(() => {
    // Apply account-level defaults for new QR
    if (isEdit) return;
    getOrCreateSettings()
      .then(st => {
        if (!ga4Id && st.ga4_measurement_id) setGa4Id(st.ga4_measurement_id);
        if (!gtmId && st.gtm_container_id) setGtmId(st.gtm_container_id);
        if (!webhookUrl && st.webhook_url) setWebhookUrl(st.webhook_url);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isEdit || slugEdited || !title.trim()) return;
    const base = title.toLowerCase()
      .replace(/[ğ]/g,"g").replace(/[ü]/g,"u").replace(/[ş]/g,"s")
      .replace(/[ı]/g,"i").replace(/[ö]/g,"o").replace(/[ç]/g,"c")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,18);
    if (base) setSlug(base + "-" + slug7().slice(0,3));
  }, [title, isEdit, slugEdited]);

  const setV = useCallback(<K extends keyof VCardData>(k: K, v: VCardData[K]) => {
    setVcard(p => ({ ...p, [k]: v }));
  }, []);

  const setMenuField = useCallback(<K extends keyof MenuData>(k: K, v: MenuData[K]) => {
    setMenu(p => ({ ...p, [k]: v }));
  }, []);

  const setMultiField = useCallback(<K extends keyof MultiLinkData>(k: K, v: MultiLinkData[K]) => {
    setMulti(p => ({ ...p, [k]: v }));
  }, []);

  const setMultiLink = useCallback((linkId: string, patch: Partial<ReturnType<typeof createMultiLinkItem>>) => {
    setMulti(p => ({
      ...p,
      links: p.links.map(link => (link.id === linkId ? { ...link, ...patch } : link)),
    }));
  }, []);

  const addMultiLink = useCallback(() => {
    setMulti(p => ({
      ...p,
      links: [...p.links, createMultiLinkItem()],
    }));
  }, []);

  const removeMultiLink = useCallback((linkId: string) => {
    setMulti(p => ({
      ...p,
      links: p.links.length > 1 ? p.links.filter(link => link.id !== linkId) : [createMultiLinkItem()],
    }));
  }, []);

  const setMenuCategory = useCallback((catId: string, patch: Partial<MenuCategory>) => {
    setMenu(p => ({
      ...p,
      categories: p.categories.map(cat => cat.id === catId ? { ...cat, ...patch } : cat),
    }));
  }, []);

  const setMenuItem = useCallback((catId: string, itemId: string, patch: Partial<MenuItem>) => {
    setMenu(p => ({
      ...p,
      categories: p.categories.map(cat => cat.id === catId
        ? { ...cat, items: cat.items.map(item => item.id === itemId ? { ...item, ...patch } : item) }
        : cat),
    }));
  }, []);

  const addMenuCategory = useCallback(() => {
    const id = `cat-${Date.now()}`;
    setMenu(p => ({
      ...p,
      categories: [...p.categories, { id, name: "Yeni Kategori", items: [] }],
    }));
    setActiveMenuCategoryId(id);
  }, []);

  const addMenuItem = useCallback((catId: string) => {
    const id = `item-${Date.now()}`;
    setMenu(p => ({
      ...p,
      categories: p.categories.map(cat => cat.id === catId
        ? { ...cat, items: [...cat.items, { id, name: "", description: "", price: "", image: "", discountIds: [], calories: "", protein: "", carbs: "", fat: "", allergens: "" }] }
        : cat),
    }));
  }, []);

  const removeMenuCategory = useCallback((catId: string) => {
    setMenu(p => {
      const nextCategories = p.categories.filter(cat => cat.id !== catId);
      return { ...p, categories: nextCategories.length ? nextCategories : [{ id: `cat-${Date.now()}`, name: "Yeni Kategori", items: [] }] };
    });
  }, []);

  const removeMenuItem = useCallback((catId: string, itemId: string) => {
    setMenu(p => ({
      ...p,
      categories: p.categories.map(cat => cat.id === catId
        ? { ...cat, items: cat.items.filter(item => item.id !== itemId) }
        : cat),
    }));
  }, []);

  const uploadImageFile = useCallback(async (file: File, folder = "menu") => {
    const form = new FormData();
    form.set("file", file);
    form.set("folder", folder);
    const res = await fetch("/api/v1/uploads", { method: "POST", body: form, credentials: "same-origin" });
    const text = await res.text();
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
    if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : `Görsel yüklenemedi. HTTP ${res.status}`);
    if (!json?.url) throw new Error("Görsel yüklendi ama URL alınamadı.");
    return String(json.url || "");
  }, []);

  const addMenuDiscount = useCallback(() => {
    const id = `discount-${Date.now()}`;
    setMenu(p => ({
      ...p,
      discounts: [
        ...(p.discounts ?? []),
        { id, name: "Yeni İndirim", type: "percent", value: "20", scope: "all", targetIds: [], active: true },
      ],
    }));
  }, []);

  const setMenuDiscount = useCallback((discountId: string, patch: Partial<MenuDiscount>) => {
    setMenu(p => ({
      ...p,
      discounts: (p.discounts ?? []).map(discount => discount.id === discountId ? { ...discount, ...patch } : discount),
    }));
  }, []);

  const removeMenuDiscount = useCallback((discountId: string) => {
    setMenu(p => ({
      ...p,
      discounts: (p.discounts ?? []).filter(discount => discount.id !== discountId),
    }));
  }, []);

  const toggleDiscountTarget = useCallback((discountId: string, targetId: string) => {
    setMenu(p => ({
      ...p,
      discounts: (p.discounts ?? []).map(discount => {
        if (discount.id !== discountId) return discount;
        const current = new Set(discount.targetIds ?? []);
        if (current.has(targetId)) current.delete(targetId);
        else current.add(targetId);
        return { ...discount, targetIds: Array.from(current) };
      }),
    }));
  }, []);

  const getTargetUrl = useCallback((): string => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    switch (qrType) {
      case "url":      return url;
      case "product":  return url;
      case "vcard":    return `${origin}/card/${slug}`;
      case "multi":    return `${origin}/links/${slug}`;
      case "menu":     return `${origin}/menu/${slug}`;
      case "feedback": return `${origin}/feedback/${slug}`;
      case "booking":  return `${origin}/booking/${slug}`;
      case "doc":      return docQr.showLanding ? `${origin}/doc/${slug}` : docQr.documentUrl;
      case "appstore": return `${origin}/appstore/${slug}`;
      case "wifi":     return buildTargetUrl("wifi",     { ssid: wifiSsid, password: wifiSec === "nopass" ? "" : wifiPwd, security: wifiSec });
      case "sms":      return buildTargetUrl("sms",      { phone, message });
      case "email":    return buildTargetUrl("email",    { email: emailTo, subject: emailSub, body: emailBody });
      case "whatsapp": return buildTargetUrl("whatsapp", { phone, message });
      case "text":     return buildTargetUrl("text",     { text: textVal });
      case "phone":    return buildTargetUrl("phone",    { phone });
      default:         return url;
    }
  }, [qrType, url, slug, docQr.showLanding, docQr.documentUrl, wifiSsid, wifiPwd, wifiSec, phone, message, emailTo, emailSub, emailBody, textVal]);

  const previewUtm = useCallback((): string => {
    if ((qrType !== "url" && qrType !== "product") || !url) return getTargetUrl();
    return appendUtmParams(url, {
      source: utmSrc,
      medium: utmMed,
      campaign: utmCamp,
      term: utmTerm,
      content: utmCont,
    });
  }, [qrType, url, getTargetUrl, utmSrc, utmMed, utmCamp, utmTerm, utmCont]);

  const validate = useCallback((): boolean => {
    const e: Record<string,string> = {};
    if (!title.trim()) e.title = "Başlık zorunlu";
    if (!slug.trim())  e.slug  = "Slug zorunlu";
    else if (!/^[a-z0-9_-]+$/.test(slug)) e.slug = "Küçük harf, rakam, - veya _";

    if (qrType === "url" || qrType === "product") {
      if (!url.trim()) e.url = "URL zorunlu";
      else { try { new URL(url); } catch { e.url = "Geçerli URL girin (https://...)"; } }
    } else if (qrType === "vcard") {
      if (!vcard.firstName.trim()) e.vcFirst = "Ad zorunlu";
    } else if (qrType === "multi") {
      const validLinks = multi.links.filter(link => link.title.trim() && link.url.trim());
      if (!validLinks.length) {
        e.multiLinks = "En az bir link basligi ve URL'si girin";
      } else if (validLinks.some(link => {
        try {
          new URL(link.url);
          return false;
        } catch {
          return true;
        }
      })) {
        e.multiLinks = "Tüm link URL'leri https:// ile başlamalı";
      }
      if (multi.primaryButtonUrl.trim()) {
        try { new URL(multi.primaryButtonUrl); } catch { e.multiButtonUrl = "Buton için geçerli URL girin"; }
      }
    } else if (qrType === "menu") {
      if (!menu.restaurantName.trim()) e.menuRestaurant = "Restoran adı zorunlu";
      if (!menu.categories.some(cat => cat.name.trim() && cat.items.some(item => item.name.trim()))) {
        e.menuItems = "En az bir kategori ve ürün girin";
      }
    } else if (qrType === "feedback") {
      const computedLocation = feedback.locationLabel.trim() || buildLocationLabel(feedback.location);
      if (!computedLocation) e.feedbackLocation = "Lokasyon zorunlu";
      if (!feedback.formTitle.trim()) e.feedbackTitle = "Form başlığı zorunlu";
    } else if (qrType === "booking") {
      if (!booking.title.trim()) e.bookingTitle = "Rezervasyon başlığı zorunlu";
      if (!booking.dateFrom || !booking.dateTo) e.bookingDate = "Tarih aralığı zorunlu";
      if (!booking.timeFrom || !booking.timeTo) e.bookingTime = "Saat aralığı zorunlu";
    } else if (qrType === "doc") {
      if (!docQr.documentTitle.trim()) e.docTitle = "Doküman başlığı zorunlu";
      try { new URL(docQr.documentUrl); } catch { e.docUrl = "Geçerli doküman linki girin"; }
    } else if (qrType === "appstore") {
      if (!appQr.appName.trim()) e.appName = "Uygulama adı zorunlu";
      if (!appQr.appStoreUrl.trim() && !appQr.googlePlayUrl.trim() && !appQr.defaultUrl.trim()) e.appUrl = "En az bir mağaza veya web linki zorunlu";
      for (const candidate of [appQr.appStoreUrl, appQr.googlePlayUrl, appQr.defaultUrl].filter(Boolean)) {
        try { new URL(candidate); } catch { e.appUrl = "Mağaza/web linkleri geçerli URL olmalı"; }
      }
    } else if (qrType === "wifi") {
      if (!wifiSsid.trim()) e.wifiSsid = "Ağ adı zorunlu";
    } else if (["sms","whatsapp","phone"].includes(qrType)) {
      if (!phone.trim()) e.phone = "Telefon zorunlu";
    } else if (qrType === "email") {
      if (!emailTo.trim()) e.emailTo = "E-posta zorunlu";
    } else if (qrType === "text") {
      if (!textVal.trim()) e.text = "İçerik zorunlu";
    }
    if (qrType === "product") {
      if (!notes.trim()) e.sku = "SKU zorunlu";
    }
    if (pixelOn && !pixelId.trim()) e.pixelId = "Pixel ID gerekli";
    if (scanLimit && (isNaN(+scanLimit) || +scanLimit < 1)) e.scanLimit = "Pozitif sayı girin";
    if (abUrl) { try { new URL(abUrl); } catch { e.abUrl = "Geçerli URL girin"; } }

    setErrors(e);
    const keys = Object.keys(e);
    if (keys.length > 0) {
      if (keys.some(k => ["title","slug","url","vcFirst","multiLinks","multiButtonUrl","menuRestaurant","menuItems","feedbackLocation","feedbackTitle","bookingTitle","bookingDate","bookingTime","docTitle","docUrl","appName","appUrl","wifiSsid","phone","emailTo","text","sku"].includes(k))) setTab("content");
      else if (keys.includes("pixelId")) setTab("tracking");
      else setTab("settings");
      return false;
    }
    return true;
  }, [title, slug, qrType, url, notes, vcard.firstName, multi, menu, feedback, booking, docQr, appQr, wifiSsid, phone, emailTo, textVal, pixelOn, pixelId, scanLimit, abUrl]);

  const submit = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    // Build rules from UI
    const rules: Record<string, any> = {};
    const dev = {
      mobile: rMobile.trim() || undefined,
      tablet: rTablet.trim() || undefined,
      desktop: rDesktop.trim() || undefined,
    };
    if (dev.mobile || dev.tablet || dev.desktop) rules.device_redirect = dev;

    if (countryJson.trim()) {
      try {
        const parsed = JSON.parse(countryJson);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
        rules.country_redirect = parsed;
      } catch {
        setErrors({ rules: "Ülke yönlendirme JSON’u geçersiz. Örn: { \"TR\": \"https://...\" }" });
        setTab("settings");
        setLoading(false);
        return;
      }
    }

    const sched = scheduleRows
      .map(r => ({
        start: r.start ? new Date(r.start).toISOString() : null,
        end:   r.end ? new Date(r.end).toISOString() : null,
        url:   r.url.trim() || null,
      }))
      .filter(r => r.url && (r.start || r.end));
    if (sched.length > 0) rules.schedule_redirect = sched;

    let effectiveStyleId = styleId;
    if (customStyleDirty) {
      try {
        const styleName = `${title.trim() || slug.trim() || "QR"} özel tasarım`;
        const saved = await saveStyle(styleName, customStyleConfig);
        effectiveStyleId = saved.id;
        setStyleId(saved.id);
        setStyles(prev => [saved, ...prev.filter(style => style.id !== saved.id)]);
        setCustomStyleDirty(false);
      } catch (err) {
        setErrors({ form: err instanceof Error ? err.message : "QR tasarımı kaydedilemedi." });
        setTab("content");
        setLoading(false);
        return;
      }
    }

    const payload: QrPayload = {
      title:          title.trim(),
      short_slug:     slug.trim().toLowerCase(),
      target_url:     getTargetUrl(),
      qr_type:        qrType,
      password:       password.trim() || null,
      scan_limit:     scanLimit ? +scanLimit : null,
      expires_at:     expiresAt ? new Date(expiresAt).toISOString() : null,
      pixel_id:       pixelOn && pixelId.trim() ? pixelId.trim() : null,
      pixel_enabled:  pixelOn,
      is_active:      isActive,
      style_id:       effectiveStyleId,
      organization_id: organizationId,
      utm_source:     qrType === "url" ? utmSrc.trim()  || null : null,
      utm_medium:     qrType === "url" ? utmMed.trim()  || null : null,
      utm_campaign:   qrType === "url" ? utmCamp.trim() || null : null,
      utm_term:       qrType === "url" ? utmTerm.trim() || null : null,
      utm_content:    qrType === "url" ? utmCont.trim() || null : null,
      tags:           tags.length > 0 ? tags : [],
      notes:          notes.trim() || null,
      redirect_type:  redir,
      ab_test_url:    abUrl.trim() || null,
      ab_test_weight: abUrl.trim() ? +abWeight : null,
      vcard_data:     qrType === "vcard" ? vcard : null,
      is_dynamic:     true,
      dynamic_content: qrType === "menu"
        ? { ...menu, kind: "menu" }
        : qrType === "multi"
          ? { ...multi, kind: "multi" }
          : qrType === "feedback"
            ? {
                ...feedback,
                kind: "feedback",
                locationLabel: feedback.locationLabel.trim() || buildLocationLabel(feedback.location),
              }
            : qrType === "booking"
              ? { ...booking, kind: "booking" }
              : qrType === "doc"
                ? { ...docQr, kind: "doc" }
                : qrType === "appstore"
                  ? { ...appQr, kind: "appstore" }
            : null,
      folder_id:      folderId,
      ga4_measurement_id: ga4Id.trim() || null,
      gtm_container_id:   gtmId.trim() || null,
      webhook_url:        webhookUrl.trim() || null,
      rules,
    };
    try {
      const result = isEdit
        ? await updateQrCode(editing!.id, payload)
        : await createQrCode(payload);
      onSuccess(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      if (msg.includes("unique") || msg.includes("uq_") || msg.includes("duplicate")) {
        setErrors({ slug: "Bu slug zaten kullanımda" }); setTab("content");
      } else {
        setErrors({ form: msg });
      }
    } finally { setLoading(false); }
  }, [validate, title, slug, getTargetUrl, qrType, password, scanLimit, expiresAt, pixelOn, pixelId, isActive, styleId, customStyleDirty, customStyleConfig, organizationId, utmSrc, utmMed, utmCamp, utmTerm, utmCont, tags, notes, redir, abUrl, abWeight, vcard, multi, menu, feedback, booking, docQr, appQr, folderId, ga4Id, gtmId, webhookUrl, rMobile, rTablet, rDesktop, countryJson, scheduleRows, isEdit, editing, onSuccess]);

  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase()
      .replace(/[ğ]/g,"g").replace(/[ü]/g,"u").replace(/[ş]/g,"s")
      .replace(/[ı]/g,"i").replace(/[ö]/g,"o").replace(/[ç]/g,"c")
      .replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    if (t && !tags.includes(t) && tags.length < 10) setTags(p => [...p, t]);
    setTagInput("");
  }, [tagInput, tags]);

  const iCls = "w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 border-slate-200 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500";
  const lCls = "text-sm font-medium text-slate-800 dark:text-slate-300 mb-2 block";

  const Err = ({ msg }: { msg?: string }) => msg
    ? <p className="text-xs font-medium text-red-500 flex items-center gap-1.5 mt-1.5"><AlertCircle size={14}/>{msg}</p>
    : null;

  const Tog = ({ on, onChange, color="bg-black dark:bg-white" }: { on:boolean; onChange:()=>void; color?:string }) => (
    <button type="button" onClick={onChange}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-violet-600" : "bg-slate-200 dark:bg-white/10"}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ${on ? "translate-x-4 bg-white" : "bg-white"}`}/>
    </button>
  );

  const ImageUploadField = ({
    label,
    value,
    onChange,
    folder = "menu",
    compact = false,
    shape = "banner",
    recommendation,
  }: {
    label: string;
    value?: string;
    onChange: (url: string) => void;
    folder?: string;
    compact?: boolean;
    shape?: "banner" | "square";
    recommendation?: string;
  }) => {
    const key = `${folder}-${label}`;
    const busy = uploadingImage === key;
    const previewClass = shape === "square"
      ? "h-24 w-24"
      : compact ? "h-20 w-full" : "h-32 w-full";
    return (
      <div className="space-y-1.5">
        <label className={lCls}>{label}</label>
        {value ? (
          <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-950 ${previewClass}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
            <Button type="button" onClick={() => onChange("")} variant="danger" size="sm" className="absolute right-2 top-2 h-8 w-8 rounded-full">
              <X size={13}/>
            </Button>
          </div>
        ) : (
          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-3 transition-colors hover:border-violet-400 hover:bg-slate-50 dark:border-white/10 dark:hover:border-violet-500 dark:hover:bg-black/10 ${busy ? "pointer-events-none opacity-70" : ""}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5">
              {busy ? <Loader2 size={16} className="animate-spin text-violet-500"/> : <ImageIcon size={16} className="text-slate-500 dark:text-slate-400"/>}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{busy ? "Yükleniyor..." : "Görsel yükle"}</p>
              <p className="text-xs text-slate-500">PNG, JPG, WEBP - max 5 MB</p>
              {recommendation && <p className="mt-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">Öneri: {recommendation}</p>}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={async e => {
              const file = e.target.files?.[0];
              e.currentTarget.value = "";
              if (!file) return;
              if (!/^image\/(png|jpeg|jpg|webp|gif|avif)$/i.test(file.type || "")) {
                setErrors(prev => ({ ...prev, upload: "PNG, JPG, WEBP, GIF veya AVIF yükleyin." }));
                return;
              }
              if (file.size > 5 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, upload: "Görsel 5 MB'den küçük olmalı." }));
                return;
              }
              try {
                setUploadingImage(key);
                const url = await uploadImageFile(file, folder);
                onChange(url);
              } catch (err) {
                setErrors(prev => ({ ...prev, upload: err instanceof Error ? err.message : "Görsel yüklenemedi." }));
              } finally {
                setUploadingImage(null);
              }
            }}/>
          </label>
        )}
        {value && recommendation && <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Öneri: {recommendation}</p>}
        <Err msg={errors.upload}/>
      </div>
    );
  };

  const selectedPreset = activePresetId ? QR_STYLE_PRESETS.find(preset => preset.id === activePresetId) : null;
  const selectedStyleName = styleId ? styles.find(s => s.id === styleId)?.name ?? "Seçili tasarım" : selectedPreset?.name ?? "Varsayılan";
  const selectedFolderName = folderId ? folders.find(f => f.id === folderId)?.name ?? "Seçili klasör" : "Klasör yok";
  const editableOrganizations = organizations.filter(org => ["owner", "admin", "editor"].includes(org.my_role));
  const selectedOrganizationName = organizationId
    ? organizations.find(org => org.id === organizationId)?.name ?? "Seçili organizasyon"
    : "Kişisel QR";
  const selectedMenuCategory = menu.categories.find(category => category.id === activeMenuCategoryId) ?? menu.categories[0];
  const menuCategoryCount = menu.categories.length;
  const menuItemCount = menu.categories.reduce((sum, category) => sum + category.items.length, 0);

  const updateCustomStyle = useCallback((patch: Partial<InlineQrStyleConfig>) => {
    setCustomStyleConfig(prev => ({ ...prev, ...patch }));
    setCustomStyleDirty(true);
    setActivePresetId(null);
  }, []);

  // ── TYPE ICONS / COLORS ─────────────────────────────────────────────────
  const T_ICONS: Record<QrType, React.ReactNode> = {
    url: <Globe size={20}/>, product: <Tag size={20}/>, vcard: <User size={20}/>, multi: <UserCircle size={20}/>, menu: <FileText size={20}/>, feedback: <MessageSquare size={20}/>, wifi: <Wifi size={20}/>,
    booking: <CalendarCheck size={20}/>, doc: <FileText size={20}/>, appstore: <Smartphone size={20}/>,
    sms: <MessageSquare size={20}/>, email: <Mail size={20}/>,
    whatsapp: <Smartphone size={20}/>, text: <FileText size={20}/>, phone: <Phone size={20}/>,
  };
  const T_CLR: Record<QrType, string> = {
    url:"#6366f1", product:"#f97316", vcard:"#8b5cf6", multi:"#2563eb", menu:"#14b8a6", feedback:"#e11d48", wifi:"#06b6d4", sms:"#10b981",
    booking:"#0ea5e9", doc:"#4f46e5", appstore:"#7c3aed",
    email:"#f59e0b", whatsapp:"#25D366", text:"#64748b", phone:"#ef4444",
  };

  // ══════════════════════════════════════════════════════
  // STEP 1 — Type picker (section-based, no fixed positioning)
  // ══════════════════════════════════════════════════════
  if (!typePicked) {
    return (
      <div className={isPage ? "min-h-screen bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-white sm:p-6 lg:p-8" : "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in"} vaul-overlay={!isPage ? "" : undefined}>
        {!isPage && <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />}
        <div className={isPage ? "relative mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30 sm:p-8 lg:p-10" : "relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-slate-50 dark:bg-slate-900/80 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 sm:p-10 shadow-2xl animate-scale-in overflow-y-auto custom-scrollbar shadow-slate-400/20 dark:shadow-black/50"}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-violet-500/10 blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between mb-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Yeni QR Kod</p>
              <h2 className="font-black text-4xl mt-2 tracking-tighter text-slate-900 dark:text-white">Kampanya Türünü Seçin</h2>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm" className="w-12 h-12 rounded-full shrink-0">
              <X size={20} strokeWidth={2.5}/>
            </Button>
          </div>
          
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TYPES.map(t => {
              const info  = QR_TYPE_LABELS[t];
              const color = T_CLR[t];
              return (
                <button key={t} onClick={() => { setQrType(t); setTypePicked(true); }} className="surface interactive-hover group flex flex-col items-start gap-5 p-6 rounded-2xl text-left">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300"
                    style={{ background:`${color}20`, color }}>
                    {T_ICONS[t]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 dark:text-white">{info.label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{info.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // STEP 2 — Full form (section-based, no fixed positioning)
  // ══════════════════════════════════════════════════════
  const qrInfo = QR_TYPE_LABELS[qrType];

  return (
    <div className={isPage ? "min-h-screen bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-white sm:p-6 lg:p-8" : "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in"} vaul-overlay={!isPage ? "" : undefined}>
      {!isPage && <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />}
      
      <div className={isPage ? "relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30 sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]" : "relative w-full max-w-6xl max-h-[92vh] rounded-3xl bg-slate-50 dark:bg-slate-900/80 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 flex flex-col shadow-2xl animate-scale-in overflow-hidden shadow-slate-400/20 dark:shadow-black/50"}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-violet-500/10 blur-[100px] pointer-events-none" />
        
        {/* ── Header ── */}
        <div className="relative z-10 flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            {!isEdit && (
              <Button onClick={() => setTypePicked(false)} variant="ghost" size="sm" className="w-11 h-11 rounded-full shrink-0 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                <ArrowLeft size={16} />
              </Button>
            )}
            <div>
              <h2 className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                {isEdit ? "QR Kodunu Düzenle" : "Yeni QR Oluştur"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{qrInfo.label}</p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="w-12 h-12 rounded-full border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
            <X size={20} strokeWidth={2.5}/>
          </Button>
        </div>

        {/* ── Tabs ── */}
        <div className="relative z-10 grid grid-cols-3 gap-1.5 p-1.5 mx-5 sm:mx-6 mt-4 rounded-2xl border bg-white/85 dark:bg-slate-950/70 border-slate-200 dark:border-white/10 shadow-sm">
          {(["content","tracking","settings"] as Tab[]).map(t => {
            const TABS: Record<Tab, { label: string, icon: React.ReactNode }> = {
              content:  { label: "İçerik",   icon: <LinkIcon size={16}/> },
              tracking: { label: "Takip",  icon: <Activity size={16}/> },
              settings: { label: "Ayarlar",  icon: <Settings2 size={16}/> },
            };
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition-all ${
                  active
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                {TABS[t].icon}
                <span className="truncate">{TABS[t].label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex flex-1 flex-col space-y-6 px-5 sm:px-6 pt-6 pb-8 custom-scrollbar relative z-10">

          {/* ════ TAB: İÇERİK ════════════════════════════ */}
          {tab === "content" && (
            <div className="space-y-4">

              {/* Title */}
              <div className="space-y-1.5">
                <label className={lCls}>{qrType === "product" ? "Ürün İsmi *" : "Başlık *"}</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={qrType === "product" ? "Ürün ismini girin…" : `${qrInfo.label} için başlık…`} autoFocus
                  className={`${iCls} ${errors.title ? "border-red-500/60" : ""}`}/>
                <Err msg={errors.title}/>
              </div>

              {/* URL */}
              {(qrType === "url" || qrType === "product") && (
                <div className="space-y-1.5">
                  <label className={lCls}>Hedef URL *</label>
                  <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className={`${iCls} ${errors.url ? "border-red-500/60" : ""}`}/>
                  <Err msg={errors.url}/>
                </div>
              )}

              {/* WiFi */}
              {qrType === "wifi" && (
                <>
                  <div className="space-y-1.5">
                    <label className={lCls}>Ağ Adı (SSID) *</label>
                    <input value={wifiSsid} onChange={e => setWifiSsid(e.target.value)} placeholder="WiFi ağ adı"
                      className={`${iCls} ${errors.wifiSsid ? "border-red-500/60" : ""}`}/>
                    <Err msg={errors.wifiSsid}/>
                  </div>
                  <div className="space-y-1.5">
                    <label className={lCls}>Şifre</label>
                    <input value={wifiPwd} onChange={e => setWifiPwd(e.target.value)} placeholder="WiFi şifresi" className={iCls}/>
                  </div>
                  <div className="space-y-1.5">
                    <label className={lCls}>Güvenlik</label>
                    <div className="flex gap-2">
                      {["WPA","WEP","nopass"].map(s => (
                        <Button key={s} type="button" onClick={() => setWifiSec(s)} variant={wifiSec === s ? "primary" : "secondary"} size="sm" className="rounded-full">
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* SMS */}
              {qrType === "sms" && (
                <>
                  <div className="space-y-1.5">
                    <label className={lCls}>Telefon *</label>
                    <PhoneInput value={phone} onChange={setPhone} error={!!errors.phone} />
                    <Err msg={errors.phone}/>
                  </div>
                  <div className="space-y-1.5">
                    <label className={lCls}>Hazır Mesaj</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                      placeholder="Mesaj içeriği (opsiyonel)" className={`${iCls} resize-none`}/>
                  </div>
                </>
              )}

              {/* WhatsApp */}
              {qrType === "whatsapp" && (
                <>
                  <div className="space-y-1.5">
                    <label className={lCls}>WhatsApp Numarası *</label>
                    <PhoneInput value={phone} onChange={setPhone} error={!!errors.phone} />
                    <Err msg={errors.phone}/>
                  </div>
                  <div className="space-y-1.5">
                    <label className={lCls}>Başlangıç Mesajı</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                      placeholder="Merhaba! Bilgi almak istiyorum…" className={`${iCls} resize-none`}/>
                  </div>
                </>
              )}

              {/* Phone */}
              {qrType === "phone" && (
                <div className="space-y-1.5">
                  <label className={lCls}>Telefon Numarası *</label>
                  <PhoneInput value={phone} onChange={setPhone} error={!!errors.phone} />
                  <Err msg={errors.phone}/>
                </div>
              )}

              {/* Email */}
              {qrType === "email" && (
                <>
                  <div className="space-y-1.5">
                    <label className={lCls}>Alıcı E-posta *</label>
                    <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="ornek@gmail.com"
                      className={`${iCls} ${errors.emailTo ? "border-red-500/60" : ""}`}/>
                    <Err msg={errors.emailTo}/>
                  </div>
                  <div className="space-y-1.5">
                    <label className={lCls}>Konu</label>
                    <input value={emailSub} onChange={e => setEmailSub(e.target.value)} placeholder="E-posta konusu" className={iCls}/>
                  </div>
                  <div className="space-y-1.5">
                    <label className={lCls}>İçerik</label>
                    <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={2}
                      placeholder="E-posta metni" className={`${iCls} resize-none`}/>
                  </div>
                </>
              )}

              {/* Text */}
              {qrType === "text" && (
                <div className="space-y-1.5">
                  <label className={lCls}>Metin İçeriği *</label>
                  <textarea value={textVal} onChange={e => setTextVal(e.target.value)} rows={4}
                    placeholder="QR taranan kişiye gösterilecek metin…"
                    className={`${iCls} resize-none ${errors.text ? "border-red-500/60" : ""}`}/>
                  <Err msg={errors.text}/>
                </div>
              )}

              {qrType === "feedback" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Form ve Lokasyon</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      QR&apos;ın bulunduğu noktayı bina, kat, birim ve alan seviyesinde tanımlayın.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={lCls}>Form Başlığı *</label>
                        <input value={feedback.formTitle} onChange={e => setFeedback(p => ({ ...p, formTitle: e.target.value }))} className={`${iCls} ${errors.feedbackTitle ? "border-red-500/60" : ""}`} />
                        <Err msg={errors.feedbackTitle}/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={lCls}>Açıklama Metni</label>
                        <textarea
                          value={feedback.description}
                          onChange={e => setFeedback(p => ({ ...p, description: e.target.value }))}
                          rows={3}
                          placeholder="Kullanıcıya formun ne için olduğunu açıklayın."
                          className={`${iCls} resize-none`}
                        />
                      </div>
                      <div>
                        <label className={lCls}>Kurum / Marka</label>
                        <input value={feedback.organizationName ?? ""} onChange={e => setFeedback(p => ({ ...p, organizationName: e.target.value }))} placeholder="Örn: Acme Hastanesi" className={iCls} />
                      </div>
                      <div>
                        <label className={lCls}>Lokasyon Etiketi *</label>
                        <input value={feedback.locationLabel} onChange={e => setFeedback(p => ({ ...p, locationLabel: e.target.value }))} placeholder="E Blok - 2. Kat - Acil - Sarı 1 - Tuvalet" className={`${iCls} ${errors.feedbackLocation ? "border-red-500/60" : ""}`} />
                        <Err msg={errors.feedbackLocation}/>
                      </div>
                      {([
                        ["campus", "Kampüs / Şube", "Merkez Kampüs"],
                        ["building", "Blok / Bina", "E Blok"],
                        ["floor", "Kat", "2. Kat"],
                        ["unit", "Birim", "Acil Servis"],
                        ["room", "Oda / Alan", "Sarı 1"],
                        ["asset", "Nokta / Ekipman", "Tuvalet"],
                      ] as const).map(([key, label, placeholder]) => (
                        <div key={key}>
                          <label className={lCls}>{label}</label>
                          <input
                            value={feedback.location[key] ?? ""}
                            onChange={e => setFeedback(p => ({ ...p, location: { ...p.location, [key]: e.target.value } }))}
                            placeholder={placeholder}
                            className={iCls}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Form Seçenekleri</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className={lCls}>Bildirim Türleri</p>
                        <div className="grid gap-2">
                          {(Object.keys(FEEDBACK_KIND_LABEL) as FeedbackKind[]).map(kind => (
                            <label key={kind} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                              <input
                                type="checkbox"
                                checked={feedback.categories.includes(kind)}
                                onChange={() => setFeedback(p => ({
                                  ...p,
                                  categories: p.categories.includes(kind)
                                    ? p.categories.filter(item => item !== kind)
                                    : [...p.categories, kind],
                                }))}
                              />
                              {FEEDBACK_KIND_LABEL[kind]}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className={lCls}>Öncelik</p>
                        <div className="grid gap-2">
                          {(Object.keys(FEEDBACK_PRIORITY_LABEL) as FeedbackPriority[]).map(priority => (
                            <label key={priority} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                              <input
                                type="checkbox"
                                checked={feedback.priorities.includes(priority)}
                                onChange={() => setFeedback(p => ({
                                  ...p,
                                  priorities: p.priorities.includes(priority)
                                    ? p.priorities.filter(item => item !== priority)
                                    : [...p.priorities, priority],
                                }))}
                              />
                              {FEEDBACK_PRIORITY_LABEL[priority]}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className={lCls}>Konu Seçenekleri</label>
                        <textarea
                          value={feedback.subjects.join("\n")}
                          onChange={e => setFeedback(p => ({ ...p, subjects: listFromText(e.target.value) }))}
                          rows={7}
                          placeholder={"Temizlik\nBakım\nArıza\nGüvenlik\nDiğer"}
                          className={`${iCls} resize-y`}
                        />
                        <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Her satır ayrı konu olur. Mobilde uzun liste kaydırılabilir görünür.</p>
                      </div>
                      <div>
                        <label className={lCls}>Etiketler</label>
                        <textarea
                          value={feedback.tags.join("\n")}
                          onChange={e => setFeedback(p => ({ ...p, tags: listFromText(e.target.value) }))}
                          rows={7}
                          placeholder={"acil\nhijyen\nbakım\npersonel"}
                          className={`${iCls} resize-y`}
                        />
                        <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Etiketler panel araması ve filtrelemede kullanılabilir.</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                        Form aktif
                        <input type="checkbox" checked={feedback.formActive} onChange={e => setFeedback(p => ({ ...p, formActive: e.target.checked }))} />
                      </label>
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                        İletişim bilgisi alınabilir
                        <input type="checkbox" checked={feedback.allowContact} onChange={e => setFeedback(p => ({ ...p, allowContact: e.target.checked, requireContact: e.target.checked ? p.requireContact : false }))} />
                      </label>
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                        İletişim zorunlu
                        <input type="checkbox" disabled={!feedback.allowContact} checked={feedback.requireContact} onChange={e => setFeedback(p => ({ ...p, requireContact: e.target.checked, requiredFields: { ...p.requiredFields, contact: e.target.checked } }))} />
                      </label>
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                        Pozitif bildirim
                        <input type="checkbox" checked={feedback.positiveFeedbackEnabled} onChange={e => setFeedback(p => ({ ...p, positiveFeedbackEnabled: e.target.checked }))} />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={lCls}>Maksimum Konu Seçimi</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={feedback.maxSelections}
                          onChange={e => setFeedback(p => ({ ...p, maxSelections: Math.min(10, Math.max(1, Number(e.target.value) || 1)) }))}
                          className={iCls}
                        />
                      </div>
                      <div>
                        <label className={lCls}>Pozitif Geri Bildirim Metni</label>
                        <input value={feedback.positiveFeedbackLabel} onChange={e => setFeedback(p => ({ ...p, positiveFeedbackLabel: e.target.value }))} className={iCls} />
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className={lCls}>Zorunlu Alanlar</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {([
                          ["type", "Bildirim türü"],
                          ["subject", "Konu seçimi"],
                          ["message", "Açıklama"],
                          ["contact", "İletişim"],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200">
                            {label}
                            <input
                              type="checkbox"
                              checked={feedback.requiredFields[key]}
                              onChange={e => setFeedback(p => ({
                                ...p,
                                requiredFields: { ...p.requiredFields, [key]: e.target.checked },
                                requireContact: key === "contact" ? e.target.checked : p.requireContact,
                                allowContact: key === "contact" && e.target.checked ? true : p.allowContact,
                              }))}
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={lCls}>Gönder Butonu</label>
                        <input value={feedback.submitButtonText} onChange={e => setFeedback(p => ({ ...p, submitButtonText: e.target.value }))} className={iCls} />
                      </div>
                      <div>
                        <label className={lCls}>Temizle Butonu</label>
                        <input value={feedback.resetButtonText} onChange={e => setFeedback(p => ({ ...p, resetButtonText: e.target.value }))} className={iCls} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={lCls}>Kişisel Veri Uyarısı</label>
                        <textarea value={feedback.privacyNotice} onChange={e => setFeedback(p => ({ ...p, privacyNotice: e.target.value }))} rows={2} className={`${iCls} resize-none`} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={lCls}>Başarılı Gönderim Mesajı</label>
                        <textarea value={feedback.successMessage} onChange={e => setFeedback(p => ({ ...p, successMessage: e.target.value }))} rows={2} className={`${iCls} resize-none`} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {qrType === "booking" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Rezervasyon / Randevu QR</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Müşteri QR&apos;ı okuttuğunda tarih ve saat seçerek rezervasyon talebi bırakır.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={lCls}>Rezervasyon Başlığı *</label>
                        <input value={booking.title} onChange={e => setBooking(p => ({ ...p, title: e.target.value }))} className={`${iCls} ${errors.bookingTitle ? "border-red-500/60" : ""}`} />
                        <Err msg={errors.bookingTitle}/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={lCls}>Açıklama</label>
                        <textarea value={booking.description} onChange={e => setBooking(p => ({ ...p, description: e.target.value }))} rows={3} className={`${iCls} resize-none`} />
                      </div>
                      <div>
                        <label className={lCls}>Hizmet Türü</label>
                        <input value={booking.serviceType} onChange={e => setBooking(p => ({ ...p, serviceType: e.target.value }))} placeholder="Örn: Saç kesimi, muayene, masa rezervasyonu" className={iCls} />
                      </div>
                      <div>
                        <label className={lCls}>Lokasyon / Online Bağlantı</label>
                        <input value={booking.location} onChange={e => setBooking(p => ({ ...p, location: e.target.value }))} placeholder="Adres veya kısa lokasyon" className={iCls} />
                      </div>
                      <div>
                        <label className={lCls}>Online Link</label>
                        <input value={booking.onlineUrl} onChange={e => setBooking(p => ({ ...p, onlineUrl: e.target.value }))} placeholder="https://meet.google.com/..." className={iCls} />
                      </div>
                      <div>
                        <label className={lCls}>Saat Dilimi</label>
                        <input value={booking.timezone} onChange={e => setBooking(p => ({ ...p, timezone: e.target.value }))} className={iCls} />
                      </div>
                      <div>
                        <label className={lCls}>Başlangıç Tarihi *</label>
                        <input type="date" value={booking.dateFrom} onChange={e => setBooking(p => ({ ...p, dateFrom: e.target.value }))} className={`${iCls} ${errors.bookingDate ? "border-red-500/60" : ""}`} />
                      </div>
                      <div>
                        <label className={lCls}>Bitiş Tarihi *</label>
                        <input type="date" value={booking.dateTo} onChange={e => setBooking(p => ({ ...p, dateTo: e.target.value }))} className={`${iCls} ${errors.bookingDate ? "border-red-500/60" : ""}`} />
                        <Err msg={errors.bookingDate}/>
                      </div>
                      <div>
                        <label className={lCls}>Başlangıç Saati *</label>
                        <input type="time" value={booking.timeFrom} onChange={e => setBooking(p => ({ ...p, timeFrom: e.target.value }))} className={`${iCls} ${errors.bookingTime ? "border-red-500/60" : ""}`} />
                      </div>
                      <div>
                        <label className={lCls}>Bitiş Saati *</label>
                        <input type="time" value={booking.timeTo} onChange={e => setBooking(p => ({ ...p, timeTo: e.target.value }))} className={`${iCls} ${errors.bookingTime ? "border-red-500/60" : ""}`} />
                        <Err msg={errors.bookingTime}/>
                      </div>
                      <div>
                        <label className={lCls}>Randevu Süresi (dk)</label>
                        <input type="number" min={5} value={booking.durationMinutes} onChange={e => setBooking(p => ({ ...p, durationMinutes: Math.max(5, Number(e.target.value) || 30) }))} className={iCls} />
                      </div>
                      <div>
                        <label className={lCls}>Kontenjan</label>
                        <input type="number" min={1} value={booking.capacity} onChange={e => setBooking(p => ({ ...p, capacity: Math.max(1, Number(e.target.value) || 1) }))} className={iCls} />
                      </div>
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                        Form aktif
                        <input type="checkbox" checked={booking.active} onChange={e => setBooking(p => ({ ...p, active: e.target.checked }))} />
                      </label>
                      <div className="sm:col-span-2">
                        <label className={lCls}>Başarı Mesajı</label>
                        <textarea value={booking.successMessage} onChange={e => setBooking(p => ({ ...p, successMessage: e.target.value }))} rows={2} className={`${iCls} resize-none`} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {qrType === "doc" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Google Docs / Dosya QR</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={lCls}>Doküman Başlığı *</label>
                      <input value={docQr.documentTitle} onChange={e => setDocQr(p => ({ ...p, documentTitle: e.target.value }))} className={`${iCls} ${errors.docTitle ? "border-red-500/60" : ""}`} />
                      <Err msg={errors.docTitle}/>
                    </div>
                    <div>
                      <label className={lCls}>Buton Metni</label>
                      <input value={docQr.buttonText} onChange={e => setDocQr(p => ({ ...p, buttonText: e.target.value }))} className={iCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={lCls}>Google Docs / Drive / PDF Linki *</label>
                      <input value={docQr.documentUrl} onChange={e => setDocQr(p => ({ ...p, documentUrl: e.target.value }))} placeholder="https://docs.google.com/..." className={`${iCls} ${errors.docUrl ? "border-red-500/60" : ""}`} />
                      <Err msg={errors.docUrl}/>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={lCls}>Açıklama</label>
                      <textarea value={docQr.description} onChange={e => setDocQr(p => ({ ...p, description: e.target.value }))} rows={3} className={`${iCls} resize-none`} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={lCls}>Erişim Uyarısı</label>
                      <textarea value={docQr.accessNotice} onChange={e => setDocQr(p => ({ ...p, accessNotice: e.target.value }))} rows={2} className={`${iCls} resize-none`} />
                    </div>
                    <div>
                      <label className={lCls}>Kapak Görsel URL</label>
                      <input value={docQr.coverImageUrl} onChange={e => setDocQr(p => ({ ...p, coverImageUrl: e.target.value }))} className={iCls} />
                    </div>
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                      Markalı landing göster
                      <input type="checkbox" checked={docQr.showLanding} onChange={e => setDocQr(p => ({ ...p, showLanding: e.target.checked }))} />
                    </label>
                  </div>
                </div>
              )}

              {qrType === "appstore" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">App Store / Google Play QR</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">iOS kullanıcıları App Store&apos;a, Android kullanıcıları Google Play&apos;e, desktop kullanıcıları varsayılan sayfaya gider.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={lCls}>Uygulama Adı *</label>
                      <input value={appQr.appName} onChange={e => setAppQr(p => ({ ...p, appName: e.target.value }))} className={`${iCls} ${errors.appName ? "border-red-500/60" : ""}`} />
                      <Err msg={errors.appName}/>
                    </div>
                    <div>
                      <label className={lCls}>CTA Butonu</label>
                      <input value={appQr.ctaText} onChange={e => setAppQr(p => ({ ...p, ctaText: e.target.value }))} className={iCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={lCls}>Açıklama</label>
                      <textarea value={appQr.description} onChange={e => setAppQr(p => ({ ...p, description: e.target.value }))} rows={3} className={`${iCls} resize-none`} />
                    </div>
                    <div>
                      <label className={lCls}>App Store Linki</label>
                      <input value={appQr.appStoreUrl} onChange={e => setAppQr(p => ({ ...p, appStoreUrl: e.target.value }))} className={`${iCls} ${errors.appUrl ? "border-red-500/60" : ""}`} />
                    </div>
                    <div>
                      <label className={lCls}>Google Play Linki</label>
                      <input value={appQr.googlePlayUrl} onChange={e => setAppQr(p => ({ ...p, googlePlayUrl: e.target.value }))} className={`${iCls} ${errors.appUrl ? "border-red-500/60" : ""}`} />
                    </div>
                    <div>
                      <label className={lCls}>Varsayılan Web Linki</label>
                      <input value={appQr.defaultUrl} onChange={e => setAppQr(p => ({ ...p, defaultUrl: e.target.value }))} className={`${iCls} ${errors.appUrl ? "border-red-500/60" : ""}`} />
                      <Err msg={errors.appUrl}/>
                    </div>
                    <div>
                      <label className={lCls}>Logo URL</label>
                      <input value={appQr.logoUrl} onChange={e => setAppQr(p => ({ ...p, logoUrl: e.target.value }))} className={iCls} />
                    </div>
                  </div>
                </div>
              )}

              {/* vCard */}
              {qrType === "vcard" && (
                <div className="space-y-5">
                  <div className="surface rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 dark:text-white">Dijital Kartvizit Stüdyosu</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Link-in-bio tarzı gelişmiş sayfaya yönlendirme. Oluşturduktan sonra editör açılır.
                      </p>
                    </div>
                    {isEdit && (
                      <Link href={`/dashboard/vcard-builder?id=${editing!.id}`} className={getButtonClass("primary", "md")}>Stüdyoyu Aç</Link>
                    )}
                  </div>

                  {/* ── Two-pane: form (left) + mobile preview (right) ── */}
                  <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_300px]">

                    {/* LEFT: all form fields */}
                    <div className="flex-1 min-w-0 space-y-4">

                      {/* Template picker */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-base font-black text-slate-950 dark:text-white">Sayfa Şablonu</label>
                          <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400">(Beğendiğiniz şablona tıklayın)</span>
                        </div>
                        <label className={lCls}>Sayfa Şablonu</label>
                        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 custom-scrollbar">
                          {VCARD_TPLS.map(t => (
                            <button key={t.id} type="button" onClick={() => setV("template", t.id)} title={t.label} className="rounded-2xl text-left outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-violet-500">
                              <CardTemplateThumb template={t} active={vcard.template===t.id} />
                              <div className="hidden w-full h-full" style={{ background:t.bg }}/>
                              {vcard.template===t.id && (
                                <div className="hidden absolute inset-0 bg-black/40 items-center justify-center">
                                  <Check size={16} className="text-white"/>
                                </div>
                              )}
                              <span className="hidden absolute bottom-0 left-0 right-0 text-[10px] text-center py-0.5 font-semibold truncate bg-white/80 dark:bg-black/60 text-slate-800 dark:text-white/90">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Colors */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label:"Vurgu Rengi", key:"accentColor" as const, def:"#6366f1" },
                          { label:"Kapak Rengi", key:"coverColor"  as const, def:"#0f172a" },
                        ].map(c => (
                          <div key={c.key} className="space-y-1.5">
                            <label className={lCls}>{c.label}</label>
                            <div className="flex items-center gap-2 border rounded-lg px-2 py-1.5 transition-colors bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                              <input type="color" value={(vcard[c.key] as string)||c.def} onChange={e => setV(c.key, e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0"/>
                              <span className="text-sm font-mono truncate text-slate-500">{(vcard[c.key] as string)||c.def}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <ImageUploadField label="Banner / Kapak Görseli" value={vcard.coverImage} onChange={url => setV("coverImage", url)} folder="vcard-cover" compact recommendation="1200 x 480 px veya 5:2 oran" />
                      <ImageUploadField label="Avatar / Profil Fotoğrafı" value={vcard.avatar} onChange={url => setV("avatar", url)} folder="vcard-avatar" compact shape="square" recommendation="600 x 600 px kare" />
                      <div className="h-px bg-slate-200 dark:bg-white/10"/>
                      <p className={lCls}>Kişisel Bilgiler</p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className={lCls}>Ad *</label>
                          <input value={vcard.firstName} onChange={e => setV("firstName",e.target.value)} placeholder="Ad"
                            className={`${iCls} ${errors.vcFirst ? "border-red-500/60" : ""}`}/>
                          <Err msg={errors.vcFirst}/>
                        </div>
                        <div className="space-y-1.5">
                          <label className={lCls}>Soyad</label>
                          <input value={vcard.lastName} onChange={e => setV("lastName",e.target.value)} placeholder="Soyad" className={iCls}/>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className={lCls}>Ünvan / Pozisyon</label>
                        <input value={vcard.title||""} onChange={e => setV("title",e.target.value)} placeholder="CEO / Yazılım Müh." className={iCls}/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className={lCls}>Şirket</label>
                          <input value={vcard.company||""} onChange={e => setV("company",e.target.value)} placeholder="Şirket adı" className={iCls}/>
                        </div>
                        <div className="space-y-1.5">
                          <label className={lCls}>Departman</label>
                          <input value={vcard.department||""} onChange={e => setV("department",e.target.value)} placeholder="Pazarlama" className={iCls}/>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className={lCls}>Biyografi</label>
                        <textarea value={vcard.bio||""} onChange={e => setV("bio",e.target.value)} rows={2}
                          placeholder="Kısa tanıtım metni…" className={`${iCls} resize-none`}/>
                      </div>

                      <div className="h-px bg-slate-200 dark:bg-white/10"/>
                      <p className={lCls}>İletişim Bilgileri</p>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label:"E-posta",     key:"email"  as const, type:"email", ph:"ornek@mail.com" },
                          { label:"2. E-posta",  key:"email2" as const, type:"email", ph:"is@sirket.com" },
                        ].map(f => (
                          <div key={f.key} className="space-y-1.5">
                            <label className={lCls}>{f.label}</label>
                            <input type={f.type} value={(vcard[f.key]||"") as string}
                              onChange={e => setV(f.key, e.target.value)} placeholder={f.ph} className={iCls}/>
                          </div>
                        ))}
                        {/* Telefon alanları - bayrak seçici ile */}
                        <div className="space-y-1.5">
                          <label className={lCls}>Telefon</label>
                          <PhoneInput value={vcard.phone||""} onChange={v => setV("phone", v)} />
                        </div>
                        <div className="space-y-1.5">
                          <label className={lCls}>İş Telefonu</label>
                          <PhoneInput value={vcard.phone2||""} onChange={v => setV("phone2", v)} />
                        </div>
                      </div>
                      {/* Multi-website */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className={lCls}>Web Siteleri</label>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setV("websites", [...(vcard.websites||[]), { label:"", url:"" }])}>
                            <Plus size={12}/> Ekle
                          </Button>
                        </div>
                        {(vcard.websites||[]).map((ws, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <div className="flex-1 space-y-1">
                              <input value={ws.label} onChange={e => {
                                const arr = [...(vcard.websites||[])]; arr[idx]={...arr[idx],label:e.target.value}; setV("websites",arr);
                              }} placeholder="Etiket (örn: Portfolio)" className={`${iCls} py-2`}/>
                              <input type="url" value={ws.url} onChange={e => {
                                const arr = [...(vcard.websites||[])]; arr[idx]={...arr[idx],url:e.target.value}; setV("websites",arr);
                              }} placeholder="https://example.com" className={`${iCls} py-2`}/>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => { const arr=(vcard.websites||[]).filter((_,i)=>i!==idx); setV("websites",arr); }} className="mt-1 shrink-0 text-slate-400 hover:text-red-500">
                              <X size={14}/>
                            </Button>
                          </div>
                        ))}
                        {(!vcard.websites || vcard.websites.length === 0) &&
                          <p className="text-sm text-slate-500">Henüz web sitesi eklenmedi.</p>
                        }
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className={lCls}>Şehir</label>
                          <input value={vcard.city||""} onChange={e => setV("city",e.target.value)} placeholder="İstanbul" className={iCls}/>
                        </div>
                        <div className="space-y-1.5">
                          <label className={lCls}>Ülke</label>
                          <input value={vcard.country||""} onChange={e => setV("country",e.target.value)} placeholder="Türkiye" className={iCls}/>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200 dark:bg-white/10"/>
                      <p className={lCls}>Sosyal Medya</p>
                      <div className="grid grid-cols-2 gap-3">
                        {(["linkedin","instagram","twitter","github","facebook","youtube","whatsapp"] as const).map(k => (
                          <div key={k} className="space-y-1.5">
                            <label className={lCls}>{k.charAt(0).toUpperCase()+k.slice(1)}</label>
                            <input value={(vcard[k]||"") as string} onChange={e => setV(k,e.target.value)}
                              placeholder={k==="linkedin"?"kullaniciadi":k==="whatsapp"?"+905xx":"@kullaniciadi"}
                              className={`${iCls}`}/>
                          </div>
                        ))}
                      </div>
                      {!isEdit && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border bg-slate-100 dark:bg-black/20 border-slate-200 dark:border-white/10">
                          <Download size={14} className="text-slate-500"/>
                          <p className="text-sm text-slate-500">
                            Kaydedilince: <span className="font-mono">/card/{slug}</span>
                          </p>
                        </div>
                      )}

                    </div>{/* end LEFT */}

                    {/* RIGHT: live mobile preview */}
                    <div className="w-full shrink-0 flex flex-col items-center gap-3 lg:sticky lg:top-4">
                      <p className="text-sm font-semibold text-slate-500 text-center">Önizleme</p>
                      {/* phone shell */}
                      <div className="relative rounded-[2rem] border-[6px] overflow-hidden border-slate-300 bg-slate-200 shadow-2xl shadow-slate-400/30 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/40"
                        style={{width:"min(100%, 270px)", height:540}}>
                        {/* notch */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-2 rounded-full z-10 bg-slate-200/90 dark:bg-slate-800"/>
                        {/* screen */}
                        <div className="absolute inset-0 overflow-y-auto custom-scrollbar" style={{top:10}}>
                          <VCardMiniPreview vcard={vcard}/>
                        </div>
                      </div>
                      <p className="text-xs text-center text-slate-500">Anlık güncellenir</p>
                    </div>{/* end RIGHT */}

                  </div>{/* end two-pane flex */}

                </div>
              )}

              {qrType === "multi" && (
                <div className="space-y-5">
                  <div className="surface rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 dark:text-white">Multi URL Landing Page</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Profil, link ve iletişim bloklarıyla tek QR altında toplanan mobil odaklı sayfa tipi.
                      </p>
                    </div>
                    {!isEdit && (
                      <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                        Kaydedilince: /links/{slug}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-base font-black text-slate-950 dark:text-white">Sayfa Sablonu</label>
                          <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400">(Mobil vitrin tasarimi)</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {MULTI_LINK_TEMPLATES.map(template => {
                            const active = multi.template === template.id;
                            return (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() => setMultiField("template", template.id)}
                                className={`rounded-2xl border p-3 text-left transition-all ${active ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"}`}
                              >
                                <div className="h-20 rounded-xl" style={{ background: template.preview }} />
                                <div className="mt-3 flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white">{template.title}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{template.desc}</p>
                                  </div>
                                  {active ? <Check size={16} className="text-blue-500" /> : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className={lCls}>Vurgu Rengi</label>
                          <div className="flex items-center gap-2 border rounded-lg px-2 py-1.5 transition-colors bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                            <input type="color" value={multi.accentColor} onChange={e => setMultiField("accentColor", e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0" />
                            <span className="text-sm font-mono truncate text-slate-500">{multi.accentColor}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className={lCls}>Arka Plan</label>
                          <div className="flex items-center gap-2 border rounded-lg px-2 py-1.5 transition-colors bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                            <input type="color" value={multi.backgroundColor} onChange={e => setMultiField("backgroundColor", e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0" />
                            <span className="text-sm font-mono truncate text-slate-500">{multi.backgroundColor}</span>
                          </div>
                        </div>
                      </div>

                      <ImageUploadField label="Kapak Gorseli" value={multi.coverImage} onChange={url => setMultiField("coverImage", url)} folder="multi-cover" compact recommendation="1200 x 1600 px veya 3:4 oran" />
                      <ImageUploadField label="Profil Gorseli" value={multi.avatar} onChange={url => setMultiField("avatar", url)} folder="multi-avatar" compact shape="square" recommendation="600 x 600 px kare" />

                      <div className="h-px bg-slate-200 dark:bg-white/10"/>
                      <p className={lCls}>Profil Alanı</p>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Profil bloğunu göster</p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avatar, isim ve iki satır açıklama alanını kontrol eder.</p>
                        </div>
                        <Tog on={multi.showProfile} onChange={() => setMultiField("showProfile", !multi.showProfile)} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className={lCls}>Gorunen Isim</label>
                          <input value={multi.profileName} onChange={e => setMultiField("profileName", e.target.value)} placeholder="Orn: Heka Homes" className={iCls} />
                        </div>
                        <div className="space-y-1.5">
                          <label className={lCls}>Alt Baslik</label>
                          <input value={multi.headline} onChange={e => setMultiField("headline", e.target.value)} placeholder="Description" className={iCls} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className={lCls}>Ek Bilgi</label>
                        <input value={multi.subheadline} onChange={e => setMultiField("subheadline", e.target.value)} placeholder="Extra information" className={iCls} />
                      </div>

                      <div className="h-px bg-slate-200 dark:bg-white/10"/>
                      <div className="flex items-center justify-between">
                        <p className={lCls}>Linkler</p>
                        <Button type="button" variant="secondary" size="sm" onClick={addMultiLink}>
                          <Plus size={12}/> Link Ekle
                        </Button>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Link listesini goster</p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kartlar sayfada buton olarak gosterilir.</p>
                        </div>
                        <Tog on={multi.showLinks} onChange={() => setMultiField("showLinks", !multi.showLinks)} />
                      </div>
                      <Err msg={errors.multiLinks}/>
                      <div className="space-y-3">
                        {multi.links.map((link, index) => (
                          <div key={link.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-sm font-black text-slate-900 dark:text-white">Link {index + 1}</p>
                              <Button type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-red-500" onClick={() => removeMultiLink(link.id)}>
                                <X size={14}/>
                              </Button>
                            </div>
                            <div className="space-y-3">
                              <input value={link.title} onChange={e => setMultiLink(link.id, { title: e.target.value })} placeholder="Başlık" className={iCls} />
                              <input value={link.description} onChange={e => setMultiLink(link.id, { description: e.target.value })} placeholder="Kısa açıklama" className={iCls} />
                              <input type="url" value={link.url} onChange={e => setMultiLink(link.id, { url: e.target.value })} placeholder="https://example.com" className={iCls} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="h-px bg-slate-200 dark:bg-white/10"/>
                      <p className={lCls}>One-click Buton</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className={lCls}>Buton Metni</label>
                          <input value={multi.primaryButtonLabel} onChange={e => setMultiField("primaryButtonLabel", e.target.value)} placeholder="Örn: Hemen Ulaş" className={iCls} />
                        </div>
                        <div className="space-y-1.5">
                          <label className={lCls}>Buton URL</label>
                          <input type="url" value={multi.primaryButtonUrl} onChange={e => setMultiField("primaryButtonUrl", e.target.value)} placeholder="https://example.com/form" className={`${iCls} ${errors.multiButtonUrl ? "border-red-500/60" : ""}`} />
                          <Err msg={errors.multiButtonUrl}/>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200 dark:bg-white/10"/>
                      <p className={lCls}>İletişim Bloğu</p>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">İletişim kartını göster</p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Telefon, e-posta ve WhatsApp çipleri alt bölümde listelenir.</p>
                        </div>
                        <Tog on={multi.showContact} onChange={() => setMultiField("showContact", !multi.showContact)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={lCls}>İletişim Başlığı</label>
                        <input value={multi.contactTitle} onChange={e => setMultiField("contactTitle", e.target.value)} placeholder="İletişim" className={iCls} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={lCls}>İletişim Açıklaması</label>
                        <textarea value={multi.contactDescription} onChange={e => setMultiField("contactDescription", e.target.value)} rows={2} placeholder="Bize ulaşmak için aşağıdaki kanalları kullanın." className={`${iCls} resize-none`} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className={lCls}>Telefon</label>
                          <PhoneInput value={multi.contactPhone} onChange={value => setMultiField("contactPhone", value)} />
                        </div>
                        <div className="space-y-1.5">
                          <label className={lCls}>E-posta</label>
                          <input type="email" value={multi.contactEmail} onChange={e => setMultiField("contactEmail", e.target.value)} placeholder="hello@example.com" className={iCls} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className={lCls}>WhatsApp URL</label>
                        <input value={multi.contactWhatsapp} onChange={e => setMultiField("contactWhatsapp", e.target.value)} placeholder="https://wa.me/90555..." className={iCls} />
                      </div>
                    </div>

                    <div className="w-full shrink-0 flex flex-col items-center gap-3 lg:sticky lg:top-4">
                      <p className="text-sm font-semibold text-slate-500 text-center">Canli Onizleme</p>
                      <div className="w-full rounded-[2rem] border border-slate-200 bg-slate-100 p-3 shadow-2xl shadow-slate-400/20 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/40">
                        <MultiLinkPageView data={multi} title={title} preview />
                      </div>
                      <p className="text-xs text-center text-slate-500">Mobil gorunum odakli anlik onizleme</p>
                    </div>
                  </div>
                </div>
              )}

              {qrType === "menu" && (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                  <div className="space-y-5">
                    <div className="surface rounded-xl p-5">
                      <p className="text-base font-bold text-slate-900 dark:text-white">Menü QR Oluştur</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Restoran menünüzü QR ile açılan mobil sayfaya dönüştürün. Kategori, ürün, fiyat ve besin değerlerini buradan yönetin.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={lCls}>Restoran Adı *</label>
                      <input value={menu.restaurantName} onChange={e => setMenuField("restaurantName", e.target.value)} placeholder="Örn: Heka Bistro" className={`${iCls} ${errors.menuRestaurant ? "border-red-500/60" : ""}`} />
                      <Err msg={errors.menuRestaurant}/>
                    </div>
                    <div className="space-y-1.5">
                      <label className={lCls}>Alt Başlık</label>
                      <input value={menu.subtitle || ""} onChange={e => setMenuField("subtitle", e.target.value)} placeholder="Kahvaltı · Kahve · Tatlı" className={iCls} />
                    </div>
                    <ImageUploadField label="Restoran Logosu" value={menu.logo} onChange={url => setMenuField("logo", url)} folder="menu-logo" compact shape="square" recommendation="600 x 600 px kare" />
                    <ImageUploadField label="Kapak Görseli" value={menu.coverImage} onChange={url => setMenuField("coverImage", url)} folder="menu-cover" recommendation="1200 x 675 px veya 16:9 oran" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_160px] gap-3">
                    <div className="space-y-1.5">
                      <label className={lCls}>Tema</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["classic", "dark"] as const).map(theme => (
                          <button key={theme} type="button" onClick={() => setMenuField("theme", theme)} className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${menu.theme === theme ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"}`}>
                            {theme === "classic" ? "Gündüz" : "Gece"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className={lCls}>Arka Plan</label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-white/10 dark:bg-slate-950/80">
                        <input type="color" value={menu.backgroundColor || "#f8fafc"} onChange={e => setMenuField("backgroundColor", e.target.value)} disabled={menu.theme === "dark"} className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0 disabled:opacity-40" />
                        <input value={menu.backgroundColor || "#f8fafc"} onChange={e => setMenuField("backgroundColor", e.target.value)} disabled={menu.theme === "dark"} className="min-w-0 flex-1 bg-transparent text-sm font-mono text-slate-900 outline-none disabled:opacity-40 dark:text-white" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className={lCls}>Para Birimi</label>
                      <select value={menu.currency || "TL"} onChange={e => setMenuField("currency", e.target.value)} className={iCls}>
                        {MENU_CURRENCIES.map(currency => (
                          <option key={currency.value} value={currency.value}>{currency.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px]">
                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <div>
                        <span className="block text-sm font-black text-slate-900 dark:text-white">Masadan Sipariş</span>
                        <span className="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Müşteri menüden sepet oluşturup masa numarasıyla gönderebilir.</span>
                      </div>
                      <Tog on={menu.ordersEnabled !== false} onChange={() => setMenuField("ordersEnabled", menu.ordersEnabled === false)} />
                    </label>
                    <div className="space-y-1.5">
                      <label className={lCls}>Masa Sayısı</label>
                      <input type="number" min={1} max={999} value={menu.tableCount ?? 10} onChange={e => setMenuField("tableCount", Math.max(1, Math.min(999, Number(e.target.value || 1))))} className={iCls} />
                      {isEdit ? (
                        <Link
                          href={`/print/qrcodes/tables?slug=${encodeURIComponent(slug)}&count=${encodeURIComponent(String(menu.tableCount ?? 10))}&title=${encodeURIComponent(menu.restaurantName || title || "Menü QR")}`}
                          target="_blank"
                          className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-black text-teal-600 hover:bg-teal-500/15 dark:text-teal-300"
                        >
                          Masa QR&apos;larını Yazdır
                        </Link>
                      ) : (
                        <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                          Masa QR çıktısı için önce menüyü oluşturup kaydedin.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className={lCls}>Menü Şablonu</label>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      {MENU_TEMPLATE_OPTIONS.map(tpl => (
                        <button key={tpl.id} type="button" onClick={() => setMenu(prev => ({
                          ...prev,
                          template: tpl.id,
                          categoryShowcase: tpl.id === "catalog" ? "both" : prev.categoryShowcase,
                          categoryNavStyle: tpl.id === "compact" ? "compact" : prev.categoryNavStyle,
                        }))} className={`rounded-xl border p-3 text-left transition-all ${menu.template === tpl.id ? "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/20" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"}`}>
                          <span className="block text-sm font-black text-slate-900 dark:text-white">{tpl.title}</span>
                          <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">{tpl.desc}</span>
                          <span className="mt-2 block min-h-[32px] text-[11px] font-semibold leading-snug text-slate-400 dark:text-slate-500">{tpl.hint}</span>
                          <span className="mt-3 block h-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                            {tpl.id === "hero" && <span className="block h-full bg-gradient-to-br from-slate-950 via-slate-800 to-teal-500"><span className="ml-3 mt-6 block h-2 w-20 rounded bg-white/90" /></span>}
                            {tpl.id === "catalog" && <span className="grid h-full grid-cols-2 gap-1 p-1"><span className="rounded bg-teal-500" /><span className="rounded bg-slate-300 dark:bg-slate-700" /></span>}
                            {tpl.id === "compact" && <span className="block h-full p-2"><span className="mb-1 block h-1.5 rounded bg-slate-400" /><span className="mb-1 block h-1.5 rounded bg-slate-300 dark:bg-slate-700" /><span className="block h-1.5 rounded bg-slate-300 dark:bg-slate-700" /></span>}
                            {tpl.id === "premium" && <span className="grid h-full grid-cols-[42%_1fr] gap-1 p-1"><span className="rounded bg-orange-500" /><span className="space-y-1 p-1"><span className="block h-1.5 rounded bg-slate-400" /><span className="block h-1.5 rounded bg-slate-300 dark:bg-slate-700" /></span></span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Görünüm</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Müşterinin menüde nasıl gezeceğini seçin.</p>
                    </div>
                    <div className="space-y-2">
                      <label className={lCls}>Logo</label>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        {MENU_LOGO_OPTIONS.map(opt => (
                          <button key={opt.id} type="button" onClick={() => setMenuField("logoMode", opt.id)} className={`rounded-xl border px-3 py-2 text-left transition-all ${((menu.logoMode ?? "small-left") === opt.id) ? "border-teal-500 bg-teal-500/10 text-teal-700 ring-2 ring-teal-500/10 dark:text-teal-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>
                            <span className="block text-xs font-black">{opt.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-3">
                      <div className="space-y-2">
                        <label className={lCls}>Kategori Barı</label>
                        <div className="grid grid-cols-2 gap-2">
                          {MENU_NAV_OPTIONS.map(opt => (
                            <button key={opt.id} type="button" onClick={() => setMenuField("categoryNavStyle", opt.id)} className={`rounded-xl border px-3 py-2 text-left transition-all ${((menu.categoryNavStyle ?? (menu.template === "compact" ? "compact" : "chips")) === opt.id) ? "border-teal-500 bg-teal-500/10 text-teal-700 ring-2 ring-teal-500/10 dark:text-teal-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>
                              <span className="block text-xs font-black">{opt.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={lCls}>Kategori Vitrini</label>
                        <div className="grid grid-cols-2 gap-2">
                          {MENU_SHOWCASE_OPTIONS.map(opt => (
                            <button key={opt.id} type="button" onClick={() => setMenuField("categoryShowcase", opt.id)} className={`rounded-xl border px-3 py-2 text-left transition-all ${((menu.categoryShowcase ?? (menu.template === "catalog" ? "both" : "hidden")) === opt.id) ? "border-teal-500 bg-teal-500/10 text-teal-700 ring-2 ring-teal-500/10 dark:text-teal-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>
                              <span className="block text-xs font-black">{opt.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={lCls}>Ürün Kartı</label>
                        <div className="grid grid-cols-2 gap-2">
                          {MENU_PRODUCT_LAYOUT_OPTIONS.map(opt => (
                            <button key={opt.id} type="button" onClick={() => setMenuField("productLayout", opt.id)} className={`rounded-xl border px-3 py-2 text-left transition-all ${((menu.productLayout ?? (menu.template === "premium" ? "image-top" : "image-left")) === opt.id) ? "border-teal-500 bg-teal-500/10 text-teal-700 ring-2 ring-teal-500/10 dark:text-teal-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>
                              <span className="block text-xs font-black">{opt.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">Menü İçeriği</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{menuCategoryCount} kategori · {menuItemCount} ürün</p>
                      </div>
                      <Button type="button" variant="secondary" size="sm" onClick={addMenuCategory} className="border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                        <Plus size={14}/> Kategori Ekle
                      </Button>
                    </div>
                    <Err msg={errors.menuItems}/>
                    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                      <aside className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.03] xl:sticky xl:top-4 xl:self-start">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Kategoriler</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">{menuCategoryCount}</span>
                        </div>
                        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                          {menu.categories.map((category, index) => {
                            const active = selectedMenuCategory?.id === category.id;
                            return (
                              <button
                                key={category.id}
                                type="button"
                                onClick={() => setActiveMenuCategoryId(category.id)}
                                className={`group flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-all ${active ? "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/10" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/30 dark:hover:bg-white/[0.06]"}`}
                              >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xs font-black text-slate-400 dark:bg-white/5">
                                  {category.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={category.image} alt="" className="h-full w-full object-cover" />
                                  ) : index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">{category.name || "Adsız kategori"}</p>
                                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{category.items.length} ürün</p>
                                </div>
                                {menu.categories.length > 1 && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.stopPropagation(); removeMenuCategory(category.id); }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeMenuCategory(category.id);
                                      }
                                    }}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                                  >
                                    <X size={13}/>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </aside>

                      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        {selectedMenuCategory ? (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-300">Seçili Kategori</p>
                                <h3 className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">{selectedMenuCategory.name || "Adsız kategori"}</h3>
                              </div>
                              <Button type="button" variant="primary" size="sm" onClick={() => addMenuItem(selectedMenuCategory.id)}>
                                <Plus size={14}/> Ürün Ekle
                              </Button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                              <div className="space-y-1.5">
                                <label className={lCls}>Kategori Adı</label>
                                <input value={selectedMenuCategory.name} onChange={e => setMenuCategory(selectedMenuCategory.id, { name: e.target.value })} placeholder="Kategori adı" className={`${iCls} font-bold`} />
                              </div>
                              <ImageUploadField label="Kategori Görseli" value={selectedMenuCategory.image} onChange={url => setMenuCategory(selectedMenuCategory.id, { image: url })} folder="menu-category" compact shape="square" recommendation="800 x 800 px kare" />
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-slate-950/30">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-white/10">
                                <p className="text-sm font-black text-slate-900 dark:text-white">Ürünler</p>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{selectedMenuCategory.items.length} ürün</span>
                              </div>
                              <div className="max-h-[760px] space-y-3 overflow-y-auto p-3 custom-scrollbar">
                                {selectedMenuCategory.items.length === 0 ? (
                                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-sm font-black text-slate-900 dark:text-white">Bu kategoride ürün yok</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">İlk ürünü ekleyip menüyü doldurmaya başlayın.</p>
                                    <Button type="button" variant="secondary" size="sm" onClick={() => addMenuItem(selectedMenuCategory.id)} className="mt-3 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                                      <Plus size={14}/> İlk Ürünü Ekle
                                    </Button>
                                  </div>
                                ) : selectedMenuCategory.items.map((item, index) => (
                                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/50">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-xs font-black uppercase tracking-wider text-slate-400">Ürün {index + 1}</p>
                                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">{item.name || "Yeni ürün"}</p>
                                      </div>
                                      <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeMenuItem(selectedMenuCategory.id, item.id)}>
                                        Sil
                                      </Button>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-[116px_minmax(0,1fr)]">
                                      <ImageUploadField label="Görsel" value={item.image} onChange={url => setMenuItem(selectedMenuCategory.id, item.id, { image: url })} folder="menu-item" compact shape="square" recommendation="800 x 800 px" />
                                      <div className="min-w-0 space-y-2">
                                        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_120px]">
                                          <input value={item.name} onChange={e => setMenuItem(selectedMenuCategory.id, item.id, { name: e.target.value })} placeholder="Ürün adı" className={iCls} />
                                          <input value={item.price || ""} onChange={e => setMenuItem(selectedMenuCategory.id, item.id, { price: e.target.value })} placeholder={`Fiyat (${menu.currency})`} className={iCls} />
                                        </div>
                                        <textarea value={item.description || ""} onChange={e => setMenuItem(selectedMenuCategory.id, item.id, { description: e.target.value })} rows={2} placeholder="Ürün açıklaması" className={`${iCls} resize-none`} />
                                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                                          <input value={item.calories || ""} onChange={e => setMenuItem(selectedMenuCategory.id, item.id, { calories: e.target.value })} placeholder="Kalori" className={iCls} />
                                          <input value={item.protein || ""} onChange={e => setMenuItem(selectedMenuCategory.id, item.id, { protein: e.target.value })} placeholder="Protein" className={iCls} />
                                          <input value={item.carbs || ""} onChange={e => setMenuItem(selectedMenuCategory.id, item.id, { carbs: e.target.value })} placeholder="Karbonhidrat" className={iCls} />
                                          <input value={item.fat || ""} onChange={e => setMenuItem(selectedMenuCategory.id, item.id, { fat: e.target.value })} placeholder="Yağ" className={iCls} />
                                          <input value={item.allergens || ""} onChange={e => setMenuItem(selectedMenuCategory.id, item.id, { allergens: e.target.value })} placeholder="Alerjen" className={iCls} />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-white/10">
                            <p className="text-sm font-black text-slate-900 dark:text-white">Kategori yok</p>
                            <Button type="button" variant="secondary" size="sm" onClick={addMenuCategory} className="mt-3 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                              <Plus size={14}/> Kategori Ekle
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">İndirimler</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Genel, kategori veya ürün bazlı zamanlı kampanya tanımlayın.</p>
                      </div>
                      <Button type="button" variant="secondary" size="sm" onClick={addMenuDiscount} className="border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                        <Plus size={14}/> İndirim Ekle
                      </Button>
                    </div>
                    {(menu.discounts ?? []).length === 0 && (
                      <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500 dark:bg-slate-950/40">Henüz indirim yok.</p>
                    )}
                    {(menu.discounts ?? []).map(discount => (
                      <div key={discount.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-950/40">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_110px_90px_110px]">
                          <input value={discount.name} onChange={e => setMenuDiscount(discount.id, { name: e.target.value })} placeholder="İndirim adı" className={iCls} />
                          <select value={discount.type} onChange={e => setMenuDiscount(discount.id, { type: e.target.value as MenuDiscount["type"] })} className={iCls}>
                            <option value="percent">Yüzde</option>
                            <option value="amount">Tutar</option>
                          </select>
                          <input value={discount.value} onChange={e => setMenuDiscount(discount.id, { value: e.target.value })} placeholder={discount.type === "percent" ? "%20" : "50"} className={iCls} />
                          <select value={discount.scope} onChange={e => setMenuDiscount(discount.id, { scope: e.target.value as MenuDiscount["scope"], targetIds: [] })} className={iCls}>
                            <option value="all">Tümü</option>
                            <option value="category">Kategori</option>
                            <option value="item">Ürün</option>
                          </select>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className={lCls}>Başlangıç</label>
                            <input type="date" value={discount.startDate || ""} onChange={e => setMenuDiscount(discount.id, { startDate: e.target.value })} className={iCls} />
                          </div>
                          <div className="space-y-1.5">
                            <label className={lCls}>Bitiş</label>
                            <input type="date" value={discount.endDate || ""} onChange={e => setMenuDiscount(discount.id, { endDate: e.target.value })} className={iCls} />
                          </div>
                        </div>
                        {discount.scope !== "all" && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(discount.scope === "category"
                              ? menu.categories.map(category => ({ id: category.id, label: category.name || "Kategori" }))
                              : menu.categories.flatMap(category => category.items.map(item => ({ id: item.id, label: item.name || "Ürün" })))
                            ).map(target => {
                              const active = (discount.targetIds ?? []).includes(target.id);
                              return (
                                <button key={target.id} type="button" onClick={() => toggleDiscountTarget(discount.id, target.id)} className={`rounded-lg border px-2.5 py-1 text-xs font-black transition-colors ${active ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"}`}>
                                  {target.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                            <input type="checkbox" checked={discount.active !== false} onChange={e => setMenuDiscount(discount.id, { active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 accent-teal-500" />
                            Aktif
                          </label>
                          <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeMenuDiscount(discount.id)}>Sil</Button>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                  <div className="w-full shrink-0 lg:sticky lg:top-20 lg:self-start">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">Canlı Menü Önizleme</p>
                        <p className="text-xs font-semibold text-slate-500">Şablon, kategori, ürün ve indirimler anında yansır.</p>
                      </div>
                    </div>
                    <div className="mx-auto w-full max-w-[320px] rounded-[2rem] border-[6px] border-slate-300 bg-slate-200 shadow-2xl shadow-slate-400/30 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/40">
                      <div className="relative h-[620px] overflow-hidden rounded-[1.55rem] bg-white dark:bg-slate-950">
                        <div className="absolute left-1/2 top-2 z-10 h-2 w-16 -translate-x-1/2 rounded-full bg-slate-200/90 dark:bg-slate-800" />
                        <div className="absolute inset-0 overflow-y-auto custom-scrollbar pt-3">
                          <MenuMiniPreview menu={menu} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Slug ── */}
              <div className="space-y-1.5">
                <label className={lCls}>Kısa Slug</label>
                <div className={`flex items-center border rounded-xl overflow-hidden transition-all focus-within:border-violet-500 bg-slate-100 dark:bg-black/20 border-slate-200 dark:border-white/10 ${errors.slug ? "!border-red-500/60" : ""}`}>
                  <span className="px-3 py-2.5 text-sm font-mono border-r border-slate-200 dark:border-white/10 text-slate-500 whitespace-nowrap shrink-0">/q/</span>
                  <input value={slug} readOnly={isEdit}
                    onChange={e => { if (!isEdit) { setSlug(e.target.value.toLowerCase()); setSlugEdited(true); setErrors(prev => ({ ...prev, slug: "" })); }}}
                    className={`flex-1 bg-transparent px-3 py-2.5 text-sm font-mono text-slate-900 dark:text-white outline-none min-w-0 ${isEdit ? "opacity-50 cursor-not-allowed" : ""}`}/>
                  {isEdit
                    ? <Lock size={14} className="mr-3 text-slate-500 shrink-0"/>
                    : (
                      <button
                        type="button"
                        onClick={() => { setSlug(slug7()); setSlugEdited(true); setErrors(prev => ({ ...prev, slug: "" })); }}
                        className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        title="Slug yenile"
                      >
                        <RefreshCw size={15}/>
                      </button>
                    )
                  }
                </div>
                <Err msg={errors.slug}/>
              </div>

              {/* Style picker */}
              <div className="space-y-1.5">
                <label className={lCls}>QR Kod Tasarımı</label>
                <div className="relative flex gap-2">
                  <button type="button" onClick={() => setStylePickerOpen(p => !p)} className={`${iCls} flex-1 text-left flex items-center justify-between bg-white text-slate-900 dark:bg-slate-950 dark:text-white`}>
                    <span className="truncate">{selectedStyleName}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${stylePickerOpen ? "rotate-180" : ""}`} />
                  </button>
                  {stylePickerOpen && (
                    <div className="absolute left-0 right-12 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-white/10 dark:bg-slate-950">
                      <button type="button" onClick={() => { setStyleId(null); setCustomStyleConfig(DEFAULT_INLINE_QR_STYLE); setCustomStyleDirty(false); setStylePickerOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                        Varsayılan
                      </button>
                      {styles.map(s => (
                        <button key={s.id} type="button" onClick={() => { setStyleId(s.id); setCustomStyleConfig(normalizeInlineQrStyle(s.config)); setCustomStyleDirty(false); setStylePickerOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <select value={styleId ?? ""} onChange={e => setStyleId(e.target.value || null)}
                    className="hidden">
                    <option value="">Varsayılan</option>
                    {styles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {styleId && (
                    <Button onClick={() => { setStyleId(null); setCustomStyleConfig(DEFAULT_INLINE_QR_STYLE); setCustomStyleDirty(false); }} variant="secondary" size="sm"><X size={14}/></Button>
                  )}
                </div>
                {styles.length === 0 && (
                  <Link href="/dashboard/templates" onClick={onClose} className="text-sm text-violet-500 hover:underline flex items-center gap-1.5 mt-1">
                    <Palette size={14}/> Yeni tasarım şablonu oluştur
                  </Link>
                )}
              </div>

              {/* Folder / Campaign */}
              <div className="space-y-1.5">
                <label className={lCls}>Klasör</label>
                <div className="relative flex gap-2">
                  <button type="button" onClick={() => setFolderPickerOpen(p => !p)} className={`${iCls} flex-1 text-left flex items-center justify-between bg-white text-slate-900 dark:bg-slate-950 dark:text-white`}>
                    <span className="truncate">{selectedFolderName}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${folderPickerOpen ? "rotate-180" : ""}`} />
                  </button>
                  {folderPickerOpen && (
                    <div className="absolute left-0 right-12 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-slate-950">
                      <button type="button" onClick={() => { setFolderId(null); setFolderPickerOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                        Klasör yok
                      </button>
                      {foldersLoading ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-400">
                          <Loader2 size={14} className="animate-spin" /> Klasörler yükleniyor...
                        </div>
                      ) : foldersError ? (
                        <p className="px-3 py-2 text-sm font-semibold text-red-500">Klasörler yüklenemedi.</p>
                      ) : (
                        folders.map(f => (
                          <button key={f.id} type="button" onClick={() => { setFolderId(f.id); setFolderPickerOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                            {f.name}
                          </button>
                        ))
                      )}
                      <div className="mt-2 border-t border-slate-200 pt-2 dark:border-white/10">
                        <input value={inlineFolderName} onChange={e => setInlineFolderName(e.target.value)} placeholder="Yeni klasör adı" className={`${iCls} mb-2 w-full`} />
                        <Button type="button" variant="secondary" size="sm" className="w-full" onClick={async () => {
                          const name = inlineFolderName.trim();
                          if (!name) return;
                          const created = await createFolder(name);
                          setFolders(prev => [created, ...prev]);
                          setFolderId(created.id);
                          setInlineFolderName("");
                          setFolderPickerOpen(false);
                        }}>
                          Oluştur
                        </Button>
                      </div>
                    </div>
                  )}
                  <select value={folderId ?? ""} onChange={e => setFolderId(e.target.value || null)}
                    className="hidden">
                    <option value="">Klasör yok</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <Button type="button" variant="secondary" size="sm" title="Yeni klasör" onClick={() => setFolderPickerOpen(true)}>
                    <Plus size={16}/>
                  </Button>
                </div>
                <p className="text-sm mt-1 text-slate-500">
                  QR’ları kampanya bazında gruplayın. Dashboard filtreleme/raporlama için kullanılır.
                </p>
              </div>

              {/* Organization sharing */}
              <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className={lCls}>Organizasyon Paylaşımı</label>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Organizasyona bağlanan QR&apos;lar üyelerin panelinde görünür. Editor ve üzeri roller düzenleyebilir.
                    </p>
                  </div>
                  <Building2 size={18} className="mt-1 text-violet-500" />
                </div>
                <select
                  value={organizationId ?? ""}
                  onChange={(e) => setOrganizationId(e.target.value || null)}
                  className={`${iCls} mt-3`}
                >
                  <option value="">Kişisel QR</option>
                  {editableOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.my_role})
                    </option>
                  ))}
                </select>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Seçim: {selectedOrganizationName}
                  {organizations.length > 0 && editableOrganizations.length === 0 ? " - Bu organizasyonlarda sadece görüntüleme yetkiniz var." : ""}
                </p>
              </div>

              {/* Active */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border bg-slate-100 dark:bg-black/20 border-slate-200 dark:border-white/10">
                <span className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`}/>
                  {isActive ? "Aktif" : "Pasif"}
                </span>
                <Tog on={isActive} onChange={() => setIsActive(p => !p)} color="bg-emerald-500"/>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className={lCls}>Etiketler</label>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); addTag(); }}}
                    placeholder="etiket-ekle…" className={`flex-1 ${iCls}`}/>
                  <Button onClick={addTag} variant="secondary">Ekle</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {tags.map(t => (
                      <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                        #{t}
                        <button onClick={() => setTags(p => p.filter(x => x!==t))} className="hover:text-red-400 ml-0.5"><X size={10}/></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className={lCls}>{qrType === "product" ? "SKU" : "Dahili Not"}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder={qrType === "product" ? "Örn: SKU-12345" : "Sadece siz göreceksiniz…"} className={`${iCls} resize-none`}/>
                {qrType === "product" && <Err msg={errors.sku}/>}
              </div>
            </div>
          )}

          {/* QR Stüdyosu tüm QR türlerinde doğrudan görünür. */}
          <div className="order-first grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-5">
                <div className="surface overflow-hidden rounded-[1.75rem]">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 p-5 dark:border-white/10">
                    <div>
                      <h3 className="text-lg font-black text-slate-950 dark:text-white">QR Stüdyosu</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Şablonlar ekranındaki aynı düzenle QR rengini, modül şeklini, gözleri ve logoyu ayarlayın.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStyleId(null);
                          setActivePresetId(null);
                          setCustomStyleConfig(DEFAULT_INLINE_QR_STYLE);
                          setCustomStyleDirty(true);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        Sıfırla
                      </button>
                      <span className="inline-flex items-center rounded-xl bg-violet-100 px-3 py-2 text-xs font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">Bu QR&apos;a özel</span>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Hazır Tasarımlar ve Tasarımlarım</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                          {selectedStyleName}{customStyleDirty ? " · özel" : ""}
                        </span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => { setStyleId(null); setActivePresetId(null); setCustomStyleConfig(DEFAULT_INLINE_QR_STYLE); setCustomStyleDirty(false); }}
                          className={`min-w-[150px] rounded-[1.35rem] border p-3 text-left transition ${!styleId && !customStyleDirty ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200" : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200"}`}
                        >
                          <div className="mb-3 flex aspect-square items-center justify-center rounded-2xl bg-white shadow-inner dark:bg-black/30">
                            <Palette size={28} className="text-violet-500" />
                          </div>
                          <p className="truncate text-sm font-black">Varsayılan</p>
                          <p className="mt-1 text-[10px] font-bold text-slate-400">Temiz QR</p>
                        </button>
                        {QR_STYLE_PRESETS.map((preset) => {
                          const cfg = normalizeInlineQrStyle(preset.config as Record<string, unknown>);
                          const active = activePresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              title={preset.description}
                              onClick={() => { setStyleId(null); setActivePresetId(preset.id); setCustomStyleConfig(cfg); setCustomStyleDirty(true); }}
                              className={`min-w-[124px] rounded-[1.2rem] border p-2.5 text-left transition ${active ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200" : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-violet-300 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200"}`}
                            >
                              <div className="mb-2 flex h-20 items-center justify-center rounded-xl p-3 shadow-inner" style={{ backgroundColor: cfg.bgColor }}>
                                <div className="grid h-full w-full grid-cols-5 gap-1">
                                  {Array.from({ length: 25 }).map((_, i) => (
                                    <span key={i} className={cfg.dotType === "dots" ? "rounded-full" : cfg.dotType.includes("rounded") ? "rounded-sm" : ""} style={{ background: i % 4 === 0 || i < 5 || i > 19 ? cfg.useGradient ? `linear-gradient(${cfg.gradientAngle}deg, ${cfg.color1}, ${cfg.color2})` : cfg.dotColor : "transparent" }} />
                                  ))}
                                </div>
                              </div>
                              <p className="truncate text-xs font-black">{preset.name}</p>
                              <p className="mt-1 truncate text-[9px] font-bold text-slate-400">Hazır tasarım</p>
                            </button>
                          );
                        })}
                        {styles.map((style) => {
                          const active = styleId === style.id && !customStyleDirty;
                          const cfg = normalizeInlineQrStyle(style.config as Record<string, unknown>);
                          return (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => { setStyleId(style.id); setActivePresetId(null); setCustomStyleConfig(cfg); setCustomStyleDirty(false); }}
                              className={`min-w-[150px] rounded-[1.35rem] border p-3 text-left transition ${active ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200" : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-violet-300 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200"}`}
                            >
                              <div className="mb-3 flex aspect-square items-center justify-center rounded-2xl p-4 shadow-inner" style={{ backgroundColor: cfg.bgColor }}>
                                <div className="grid h-full w-full grid-cols-5 gap-1">
                                  {Array.from({ length: 25 }).map((_, i) => (
                                    <span
                                      key={i}
                                      className={cfg.dotType === "dots" ? "rounded-full" : cfg.dotType.includes("rounded") ? "rounded-sm" : ""}
                                      style={{
                                        background: i % 4 === 0 || i < 5 || i > 19
                                          ? cfg.useGradient
                                            ? `linear-gradient(${cfg.gradientAngle}deg, ${cfg.color1}, ${cfg.color2})`
                                            : cfg.dotColor
                                          : "transparent",
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="truncate text-sm font-black">{style.name}</p>
                              <p className="mt-1 text-[10px] font-bold text-slate-400">Şablondan uygula</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-black/20">
                      {[
                        { id: "dots", label: "Noktalar", icon: <Sparkles size={14} /> },
                        { id: "eyes", label: "Gözler", icon: <Eye size={14} /> },
                        { id: "colors", label: "Renkler", icon: <Palette size={14} /> },
                        { id: "logo", label: "Logo", icon: <ImageIcon size={14} /> },
                        { id: "advanced", label: "Gelişmiş", icon: <Sliders size={14} /> },
                      ].map((panel) => (
                        <button
                          key={panel.id}
                          type="button"
                          onClick={() => setDesignPanel(panel.id as typeof designPanel)}
                          className={`inline-flex min-w-[112px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition ${designPanel === panel.id ? "bg-white text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-200" : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"}`}
                        >
                          {panel.icon}
                          {panel.label}
                        </button>
                      ))}
                    </div>

                    <div className="min-h-[310px] rounded-[1.5rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950/40">
                      {designPanel === "dots" && (
                        <div className="space-y-6">
                          <div>
                            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Nokta Şekli</p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {(["square","rounded","extra-rounded","dots","classy","classy-rounded"] as InlineQrStyleConfig["dotType"][]).map((type) => (
                                <button key={type} type="button" onClick={() => updateCustomStyle({ dotType: type })} className={`rounded-2xl border p-4 text-center transition ${customStyleConfig.dotType === type ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>
                                  <span className="block text-2xl font-black">{type === "square" ? "▪" : type === "rounded" ? "●" : type === "extra-rounded" ? "⬬" : type === "dots" ? "•" : type === "classy" ? "◆" : "◈"}</span>
                                  <span className="mt-2 block text-xs font-black">{({ square:"Kare", rounded:"Yuvarlak", "extra-rounded":"Ekstra", dots:"Nokta", classy:"Klasik", "classy-rounded":"Klasik Y." } as Record<string,string>)[type]}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {designPanel === "eyes" && (
                        <div className="space-y-6">
                          <div>
                            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Göz Çerçevesi</p>
                            <div className="grid grid-cols-3 gap-3">
                              {([{ v:"square", l:"Kare" }, { v:"extra-rounded", l:"Yuvarlak" }, { v:"dot", l:"Daire" }] as const).map((item) => (
                                <button key={item.v} type="button" onClick={() => updateCustomStyle({ eyeFrameType: item.v })} className={`rounded-2xl border p-4 text-center transition ${customStyleConfig.eyeFrameType === item.v ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>
                                  <span className={`mx-auto block h-8 w-8 border-[3px] ${item.v === "dot" ? "rounded-full" : item.v === "extra-rounded" ? "rounded-xl" : "rounded-sm"}`} />
                                  <span className="mt-3 block text-xs font-black">{item.l}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Göz Merkezi</p>
                            <div className="grid grid-cols-2 gap-3">
                              {([{ v:"square", l:"Kare" }, { v:"dot", l:"Daire" }] as const).map((item) => (
                                <button key={item.v} type="button" onClick={() => updateCustomStyle({ eyeDotType: item.v })} className={`rounded-2xl border p-4 text-center transition ${customStyleConfig.eyeDotType === item.v ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>
                                  <span className={`mx-auto block h-5 w-5 bg-current ${item.v === "dot" ? "rounded-full" : "rounded-sm"}`} />
                                  <span className="mt-3 block text-xs font-black">{item.l}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white">Özel Göz Rengi</p>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">QR renginden bağımsız göz rengi kullan.</p>
                              </div>
                              <Tog on={customStyleConfig.useCustomEyeColor} onChange={() => updateCustomStyle({ useCustomEyeColor: !customStyleConfig.useCustomEyeColor })} />
                            </div>
                            {customStyleConfig.useCustomEyeColor && <input type="color" value={customStyleConfig.eyeColor} onChange={(e) => updateCustomStyle({ eyeColor: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-950" />}
                          </div>
                        </div>
                      )}

                      {designPanel === "colors" && (
                        <div className="space-y-6">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white">Gradient Renk</p>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Aç/kapa yapınca tek renk ve gradient düzeni net ayrılır.</p>
                              </div>
                              <Tog on={customStyleConfig.useGradient} onChange={() => updateCustomStyle({ useGradient: !customStyleConfig.useGradient })} />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {customStyleConfig.useGradient ? (
                                <>
                                  <input type="color" value={customStyleConfig.color1} onChange={(e) => updateCustomStyle({ color1: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-950" />
                                  <input type="color" value={customStyleConfig.color2} onChange={(e) => updateCustomStyle({ color2: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-950" />
                                  <select value={customStyleConfig.gradientType} onChange={(e) => updateCustomStyle({ gradientType: e.target.value as InlineQrStyleConfig["gradientType"] })} className={iCls}>
                                    <option value="linear">Doğrusal</option>
                                    <option value="radial">Radyal</option>
                                  </select>
                                  <label className="space-y-2">
                                    <span className={lCls}>Açı: {customStyleConfig.gradientAngle}°</span>
                                    <input type="range" min={0} max={360} step={5} value={customStyleConfig.gradientAngle} onChange={(e) => updateCustomStyle({ gradientAngle: Number(e.target.value) })} className="w-full accent-violet-600" />
                                  </label>
                                </>
                              ) : (
                                <>
                                  <label className="space-y-2">
                                    <span className={lCls}>QR Rengi</span>
                                    <input type="color" value={customStyleConfig.dotColor} onChange={(e) => updateCustomStyle({ dotColor: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-950" />
                                  </label>
                                  <label className="space-y-2">
                                    <span className={lCls}>Arka Plan</span>
                                    <input type="color" disabled={customStyleConfig.bgTransparent} value={customStyleConfig.bgColor} onChange={(e) => updateCustomStyle({ bgColor: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1 disabled:opacity-40 dark:border-white/10 dark:bg-slate-950" />
                                  </label>
                                </>
                              )}
                            </div>
                            <label className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                              <span className={lCls}>Şeffaf arka plan (PNG/SVG indirmede)</span>
                              <input type="checkbox" checked={customStyleConfig.bgTransparent} onChange={(e) => updateCustomStyle({ bgTransparent: e.target.checked })} className="h-4 w-4 accent-violet-600" />
                            </label>
                          </div>
                          <div>
                            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Hazır Tema Renkleri</p>
                            <div className="grid grid-cols-4 gap-3">
                              {[
                                { l:"Klasik", dot:"#000000", bg:"#ffffff" },
                                { l:"Lacivert", dot:"#1e3a5f", bg:"#f0f7ff" },
                                { l:"Mor", dot:"#6d28d9", bg:"#faf5ff" },
                                { l:"Yeşil", dot:"#059669", bg:"#f0fdf4" },
                                { l:"Gece", dot:"#e2e8f0", bg:"#0f172a" },
                                { l:"Çelik", dot:"#374151", bg:"#f9fafb" },
                                { l:"Kırmızı", dot:"#dc2626", bg:"#fff5f5" },
                                { l:"Turuncu", dot:"#d97706", bg:"#fffbeb" },
                              ].map((preset) => (
                                <button key={preset.l} type="button" onClick={() => { setStyleId(null); updateCustomStyle({ dotColor: preset.dot, bgColor: preset.bg, useGradient: false }); }} className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-violet-300 dark:border-white/10 dark:bg-white/5">
                                  <span className="mx-auto mb-2 flex justify-center gap-1">
                                    <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: preset.dot }} />
                                    <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: preset.bg }} />
                                  </span>
                                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-300">{preset.l}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Gradient Presetleri</p>
                            <div className="grid grid-cols-4 gap-3">
                              {[
                                { l:"Sunset", c1:"#f97316", c2:"#ec4899", a:135 },
                                { l:"Ocean", c1:"#06b6d4", c2:"#3b82f6", a:135 },
                                { l:"Neon", c1:"#8b5cf6", c2:"#06b6d4", a:90 },
                                { l:"Fire", c1:"#ef4444", c2:"#f97316", a:45 },
                                { l:"Forest", c1:"#10b981", c2:"#06b6d4", a:135 },
                                { l:"Galaxy", c1:"#6366f1", c2:"#ec4899", a:135 },
                                { l:"Gold", c1:"#f59e0b", c2:"#ef4444", a:90 },
                                { l:"Minty", c1:"#34d399", c2:"#60a5fa", a:135 },
                              ].map((preset) => (
                                <button key={preset.l} type="button" onClick={() => { setStyleId(null); updateCustomStyle({ useGradient: true, gradientType: "linear", color1: preset.c1, color2: preset.c2, gradientAngle: preset.a }); }} className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-violet-300 dark:border-white/10 dark:bg-white/5">
                                  <span className="mx-auto mb-2 block h-5 rounded-md" style={{ background: `linear-gradient(${preset.a}deg, ${preset.c1}, ${preset.c2})` }} />
                                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-300">{preset.l}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {designPanel === "logo" && (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-dashed border-slate-300 p-5 dark:border-white/15">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white">QR Logo</p>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">PNG/JPG/WebP önerilir. Okunabilirlik için logo boyutu sınırlı tutulur.</p>
                              </div>
                              <label className="cursor-pointer rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white hover:bg-violet-500">
                                Logo Yükle
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 750_000) {
                                      setErrors(prev => ({ ...prev, form: "QR logosu en fazla 750 KB olabilir." }));
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onload = () => updateCustomStyle({ savedLogoData: String(reader.result ?? "") });
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </label>
                            </div>
                            {customStyleConfig.savedLogoData && (
                              <div className="mt-4 flex items-center gap-3">
                                <img src={customStyleConfig.savedLogoData} alt="" className="h-14 w-14 rounded-2xl border border-slate-200 bg-white object-contain p-1 dark:border-white/10" />
                                <button type="button" onClick={() => updateCustomStyle({ savedLogoData: undefined })} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200">
                                  Logoyu kaldır
                                </button>
                              </div>
                            )}
                          </div>
                          <label className="space-y-2">
                            <span className={lCls}>Logo Boyutu: %{Math.round(customStyleConfig.logoSize * 100)}</span>
                            <input type="range" min={10} max={24} value={Math.round(customStyleConfig.logoSize * 100)} onChange={(e) => updateCustomStyle({ logoSize: Number(e.target.value) / 100 })} className="w-full accent-violet-600" />
                          </label>
                        </div>
                      )}

                      {designPanel === "advanced" && (
                        <div className="space-y-5">
                          <label className="space-y-2">
                            <span className={lCls}>Kenar Boşluğu: {customStyleConfig.margin}px</span>
                            <input type="range" min={8} max={72} value={customStyleConfig.margin} onChange={(e) => updateCustomStyle({ margin: Number(e.target.value) })} className="w-full accent-violet-600" />
                          </label>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                            <p className="text-sm font-black text-slate-900 dark:text-white">Not</p>
                            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                              Bu QR&apos;a özel değişiklik yaparsanız kaydederken otomatik özel şablon oluşturulur ve QR render servisi PNG/SVG üretiminde aynı ayarları kullanır.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="surface sticky top-4 h-fit rounded-[1.75rem] p-5">
                <p className="mb-3 text-sm font-black text-slate-900 dark:text-white">Canlı QR Önizleme</p>
                <div
                  className="relative mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center rounded-[1.5rem] border border-slate-200 p-5 shadow-inner dark:border-white/10"
                  style={
                    customStyleConfig.bgTransparent
                      ? { backgroundImage: "linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)", backgroundSize: "16px 16px", backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px" }
                      : { backgroundColor: customStyleConfig.bgColor }
                  }
                >
                  <div className="grid h-full w-full grid-cols-7 gap-1">
                    {Array.from({ length: 49 }).map((_, i) => {
                      const finder = i < 14 || i % 7 < 2 || i > 34;
                      const active = finder || (i * 7) % 5 === 0 || i % 3 === 0;
                      return (
                        <span
                          key={i}
                          className={customStyleConfig.dotType === "dots" ? "rounded-full" : customStyleConfig.dotType.includes("rounded") ? "rounded-sm" : ""}
                          style={{
                            background: active
                              ? customStyleConfig.useGradient
                                ? customStyleConfig.gradientType === "radial"
                                  ? `radial-gradient(circle, ${customStyleConfig.color1}, ${customStyleConfig.color2})`
                                  : `linear-gradient(${customStyleConfig.gradientAngle}deg, ${customStyleConfig.color1}, ${customStyleConfig.color2})`
                                : customStyleConfig.dotColor
                              : "transparent",
                          }}
                        />
                      );
                    })}
                  </div>
                  {customStyleConfig.savedLogoData && (
                    <img src={customStyleConfig.savedLogoData} alt="" className="absolute h-12 w-12 rounded-xl bg-white object-contain p-1 shadow-lg" />
                  )}
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  Seçili: <span className="text-slate-900 dark:text-white">{selectedStyleName}</span>
                  {customStyleDirty && <span className="text-violet-600 dark:text-violet-300"> · özel değişiklik</span>}
                </div>
              </div>
            </div>

          {/* ════ TAB: TAKİP ═══════════════════════════ */}
          {tab === "tracking" && (
            <div className="space-y-5">
              {/* Pixel */}
              <div className="surface rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Facebook size={14} className="text-blue-400"/>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Meta Pixel</span>
                  </div>
                  <Tog on={pixelOn} onChange={() => setPixelOn(p => !p)} color="bg-blue-500"/>
                </div>
                {pixelOn && (
                  <div className="space-y-1.5">
                    <label className={lCls}>Pixel ID</label>
                    <input value={pixelId} onChange={e => setPixelId(e.target.value)} placeholder="123456789012345" className={`${iCls} font-mono ${errors.pixelId ? "border-red-500/60" : ""}`}/>
                    <Err msg={errors.pixelId}/>
                  </div>
                )}
              </div>

              {/* GA4 / GTM */}
              <div className="surface rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">GA4 / GTM</p>
                <div className="space-y-1.5">
                  <label className={lCls}>GA4 Measurement ID (opsiyonel)</label>
                  <input value={ga4Id} onChange={e => setGa4Id(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className={`${iCls} font-mono`}/>
                  <p className="text-xs text-slate-500">Tarama anında `qr_scan` event’i gönderilir.</p>
                </div>
                <div className="space-y-1.5">
                  <label className={lCls}>GTM Container ID (opsiyonel)</label>
                  <input value={gtmId} onChange={e => setGtmId(e.target.value)}
                    placeholder="GTM-XXXXXXX"
                    className={`${iCls} font-mono`}/>
                  <p className="text-xs text-slate-500">Pixel/GA olmayan senaryolarda bile bridge sayfası çalışır.</p>
                </div>
              </div>

              {/* Webhook */}
              <div className="surface rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Webhook</p>
                <div className="space-y-1.5">
                  <label className={lCls}>Webhook URL (opsiyonel)</label>
                  <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    className={`${iCls} font-mono`}/>
                  <p className="text-xs text-slate-500">
                    Her taramada <span className="font-mono">{'{"event":"qr_scan","qr_id","slug","device","os","country"}'}</span> POST edilir.
                  </p>
                </div>
              </div>

              {/* UTM */}
              {(qrType === "url" || qrType === "product") && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">UTM Parametreleri</p>
                  {[
                    { k:"utm_source",   v:utmSrc,  s:setUtmSrc,  p:UTM_SRC  },
                    { k:"utm_medium",   v:utmMed,  s:setUtmMed,  p:UTM_MED  },
                    { k:"utm_campaign", v:utmCamp, s:setUtmCamp, p:UTM_CAMP },
                    { k:"utm_term",     v:utmTerm, s:setUtmTerm               },
                    { k:"utm_content",  v:utmCont, s:setUtmCont               },
                  ].map(f => (
                    <div key={f.k} className="space-y-1.5">
                      <label className={lCls}>{f.k}</label>
                      <input value={f.v} onChange={e => f.s(e.target.value)}
                        placeholder={f.k} className={`${iCls} font-mono`}/>
                      {"p" in f && f.p && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {f.p.map((o: string) => (
                            <Button key={o} type="button" onClick={() => f.s(f.v===o ? "" : o)} variant={f.v === o ? "primary" : "secondary"} size="sm" className="rounded-full h-7 text-xs">
                              {o}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {(url || utmSrc) && (
                    <div className="surface-soft rounded-xl p-3 space-y-2">
                      <p className={lCls}>Önizleme URL</p>
                      <p className="text-xs font-mono break-all leading-relaxed text-slate-600 dark:text-slate-400">{previewUtm()}</p>
                      <Button onClick={async () => { await copyToClipboard(previewUtm()); setCopied(true); setTimeout(()=>setCopied(false),2000); }} variant="ghost" size="sm" className="text-violet-500 p-0 h-auto">
                        {copied ? <><Check size={12} className="mr-1"/>Kopyalandı</> : <><Copy size={12} className="mr-1"/>Kopyala</>}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB: AYARLAR ══════════════════════════════ */}
          {tab === "settings" && (
            <div className="space-y-4">
              {/* Conditional routing */}
              <div className="surface rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Bot size={16}/> Koşullu Yönlendirme (opsiyonel)</p>
                <p className="text-sm text-slate-500">Cihaza göre farklı URL’e yönlendirebilirsiniz. Boş bırakırsanız normal hedef çalışır.</p>
                <div className="space-y-1.5">
                  <label className={lCls}>Mobile URL</label>
                  <input value={rMobile} onChange={e => setRMobile(e.target.value)} placeholder="https://m.example.com"
                    className={`${iCls} font-mono`}/>
                </div>
                <div className="space-y-1.5">
                  <label className={lCls}>Tablet URL</label>
                  <input value={rTablet} onChange={e => setRTablet(e.target.value)} placeholder="https://tablet.example.com"
                    className={`${iCls} font-mono`}/>
                </div>
                <div className="space-y-1.5">
                  <label className={lCls}>Desktop URL</label>
                  <input value={rDesktop} onChange={e => setRDesktop(e.target.value)} placeholder="https://www.example.com"
                    className={`${iCls} font-mono`}/>
                </div>
              </div>

              {/* Country-based redirect */}
              <div className="surface rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2"><MapPin size={16}/> Ülkeye Göre Yönlendirme (opsiyonel)</p>
                <p className="text-sm text-slate-500">
                  ISO ülke koduna göre URL tanımlayabilirsiniz. Örn: TR, DE, US. JSON formatında girilir.
                </p>
                <div className="space-y-1.5">
                  <label className={lCls}>country_redirect (JSON)</label>
                  <textarea value={countryJson} onChange={e => setCountryJson(e.target.value)}
                    placeholder={"{\n  \"TR\": \"https://example.com/tr\",\n  \"DE\": \"https://example.com/de\"\n}"}
                    rows={5}
                    className={`${iCls} font-mono leading-relaxed`} />
                  <Err msg={errors.rules}/>
                </div>
              </div>

              {/* Time-based redirect */}
              <div className="surface rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Zamana Göre Yönlendirme (opsiyonel)</p>
                <p className="text-sm text-slate-500">
                  Belirli tarih aralığında farklı bir URL’e yönlendirin. Başlangıç veya bitişten biri doluysa URL zorunludur.
                </p>
                <div className="space-y-2">
                  {scheduleRows.length === 0 && (
                    <p className="text-sm text-slate-500">Kural eklemek için “Kural Ekle”ye basın.</p>
                  )}
                  {scheduleRows.map((r, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className={lCls}>Başlangıç</label>
                          <input type="datetime-local" value={r.start}
                            onChange={e => setScheduleRows(p => p.map((x, i) => i===idx ? ({...x, start: e.target.value}) : x))}
                            className={iCls}/>
                        </div>
                        <div className="space-y-1">
                          <label className={lCls}>Bitiş</label>
                          <input type="datetime-local" value={r.end}
                            onChange={e => setScheduleRows(p => p.map((x, i) => i===idx ? ({...x, end: e.target.value}) : x))}
                            className={iCls}/>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className={lCls}>URL</label>
                        <input value={r.url}
                          onChange={e => setScheduleRows(p => p.map((x, i) => i===idx ? ({...x, url: e.target.value}) : x))}
                          placeholder="https://example.com/campaign"
                          className={`${iCls} font-mono`}/>
                      </div>
                      <div className="flex justify-end mt-1">
                        <Button type="button" onClick={() => setScheduleRows(p => p.filter((_, i) => i !== idx))} variant="ghost" className="text-red-500 h-auto p-0">
                          Sil
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" onClick={() => setScheduleRows(p => [...p, { start:"", end:"", url:"" }])} variant="secondary" size="sm">
                    <Plus size={12}/> Kural Ekle
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={lCls}>Şifre Koruması</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Opsiyonel" className={`${iCls} pr-10`}/>
                  <Button type="button" onClick={() => setShowPwd(p => !p)} variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500">
                    {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={lCls}>Max Tarama</label>
                <input type="number" min={1} value={scanLimit} onChange={e => setScanLimit(e.target.value)}
                  placeholder="Sınırsız" className={`${iCls} ${errors.scanLimit ? "border-red-500/60" : ""}`}/>
                <Err msg={errors.scanLimit}/>
              </div>

              <div className="space-y-1.5">
                <label className={lCls}>Son Kullanma</label>
                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className={iCls}/>
              </div>

              <div className="space-y-1.5">
                <label className={lCls}>Yönlendirme Türü</label>
                <div className="flex gap-2">
                  {(["302", "301"] as const).map(t => (
                    <Button key={t} type="button" onClick={() => setRedir(t)} variant={redir === t ? "primary" : "secondary"} className="flex-1">
                      {t}{t==="302" ? " · Geçici" : " · Kalıcı (SEO)"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="surface rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Shuffle size={14} className="text-emerald-400"/> A/B Test
                </p>
                <div className="space-y-1.5">
                  <label className={lCls}>B URL</label>
                  <input type="url" value={abUrl} onChange={e => setAbUrl(e.target.value)}
                    placeholder="https://alternative.com"
                    className={`${iCls} ${errors.abUrl ? "border-red-500/60" : ""}`}/>
                  <Err msg={errors.abUrl}/>
                </div>
                {abUrl && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">A: %{abWeight} · B: %{100-+abWeight}</p>
                    <input type="range" min={10} max={90} step={5} value={abWeight}
                      onChange={e => setAbWeight(e.target.value)} className="w-full accent-violet-500"/>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plan limiti uyarısı */}
          {!isEdit && planAtLimit && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-600 dark:text-amber-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5"/>
              <div className="flex-1">
                <p className="font-semibold text-sm">QR limitine ulaştınız</p>
                <p className="text-sm mt-0.5 opacity-80">Yeni QR oluşturmak için planınızı yükseltin.</p>
              </div>
              <Link href="/pricing" className="text-sm font-semibold underline shrink-0">Planı Yenile</Link>
            </div>
          )}

          {/* Global error */}
          {errors.form && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-500 dark:text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5"/>
              <div>
                <p className="font-semibold text-sm">Hata</p>
                <p className="text-sm mt-0.5 opacity-80">{errors.form}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-4 p-4 border-t border-slate-200 dark:border-white/10 shrink-0 bg-slate-50/50 dark:bg-black/20">
          <div className="text-sm font-medium text-slate-500 truncate min-w-0">
            {isEdit
              ? <span className="text-slate-500 flex items-center gap-1.5"><Lock size={14}/> Slug korunuyor</span>
              : <span className="font-mono">/q/{slug}</span>
            }
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={onClose} variant="ghost" className="border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">İptal</Button>
            <Button onClick={submit} disabled={loading || (!isEdit && planAtLimit)}>
              {loading && <Loader2 size={14} className="animate-spin"/>}
              {!isEdit && planAtLimit ? "Limit Doldu" : isEdit ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </div>
      </div>
    </div>
    );
}
