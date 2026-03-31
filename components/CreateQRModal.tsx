"use client";
import { useState, useCallback, useEffect } from "react";
import {
  X, Loader2, Sparkles, Palette, Check, Lock, Plus, Shuffle,
  AlertCircle, Eye, EyeOff, Facebook,
  Copy, RefreshCw, Globe, Smartphone, Wifi,
  MessageSquare, Mail, Phone, FileText, User, Download,
  Image as ImageIcon, UserCircle, Building2, MapPin, Tag,
  ArrowLeft, Settings2, Link as LinkIcon, Shield, Bot,
} from "lucide-react";
import Image from "next/image";
import {
  createQrCode, updateQrCode, fetchStyles, buildTargetUrl,
  QR_TYPE_LABELS,
  fetchFolders, createFolder,
  getOrCreateSettings,
  type QrCode, type QrPayload, type QrStyle, type QrType, type QrFolder,
} from "@/lib/supabase";
import type { VCardData } from "@/app/card/[slug]/VCardPageClient";
import Link from "next/link";
import { appendUtmParams } from "@/lib/utils/urlBuilder";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import PhoneInput from "@/components/PhoneInput";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

function slug7() {
  const c = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 7 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

const VCARD_TPLS = [
  { id: "modern"   as const, label: "Modern",   bg: "#0f172a" },
  { id: "classic"  as const, label: "Klasik",   bg: "#ffffff" },
  { id: "minimal"  as const, label: "Minimal",  bg: "#f9fafb" },
  { id: "dark"     as const, label: "Dark Pro", bg: "#030712" },
  { id: "gradient" as const, label: "Gradient", bg: "linear-gradient(135deg,#6d28d9,#4f46e5)" },
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
  };
  const t = themes[tmpl] || themes.modern;
  const fullName = `${vcard.firstName||""} ${vcard.lastName||""}`.trim() || "Adınız";
  const initials = ((vcard.firstName?.[0]??"") + (vcard.lastName?.[0]??"")).toUpperCase() || "?";

  return (
    <div style={{ width:"100%", height:"100%", background:t.page, fontFamily:"system-ui,sans-serif", overflowY:"auto", display:"flex", flexDirection:"column" }}>
      {/* Cover */}
      <div style={{ position:"relative", height:64, flexShrink:0, overflow:"visible",
        background: tmpl==="gradient" ? `linear-gradient(135deg,${cover},${accent})` : t.cover }}>
        {/* clip inner background but not avatar */}
        <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
        {vcard.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vcard.coverImage} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
        )}
        {/* Avatar */}
        <div style={{ position:"absolute", bottom:-22, left:"50%", transform:"translateX(-50%)",
          width:44, height:44, borderRadius:10, overflow:"hidden",
          border:`3px solid ${t.card}`,
          background: vcard.avatar ? undefined : `linear-gradient(135deg,${accent},${cover})`,
          boxShadow:"0 4px 12px rgba(0,0,0,0.3)" }}>
          {vcard.avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={vcard.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                color:"#fff", fontSize:14, fontWeight:900 }}>{initials}</div>}
        </div>
        </div>{/* end clip inner */}
      </div>
      {/* Content */}
      <div style={{ background:t.card, flex:1, paddingTop:28, paddingBottom:12, paddingLeft:10, paddingRight:10 }}>
        <div style={{ textAlign:"center", marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:900, color:t.name }}>{fullName}</div>
          {vcard.title && <div style={{ fontSize:9, color:t.role, marginTop:2 }}>{vcard.title}</div>}
          {vcard.company && <div style={{ fontSize:8, color:t.role, opacity:.7, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center", gap:2 }}>
            <Building2 size={7}/> {vcard.company}
          </div>}
        </div>
        {/* CTA button */}
        <div style={{ background:accent, borderRadius:8, padding:"6px 0", textAlign:"center",
          color:"#fff", fontSize:9, fontWeight:700, marginBottom:8 }}>
          Rehbere Kaydet
        </div>
        {/* Contact rows */}
        {[
          vcard.phone  && { icon:"📞", val:vcard.phone },
          vcard.email  && { icon:"✉️", val:vcard.email },
          vcard.website && { icon:"🌐", val:vcard.website.replace(/^https?:\/\//,"") },
        ].filter(Boolean).slice(0,3).map((item, i) => item && (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 6px",
            borderRadius:6, background:tmpl==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",
            border:`1px solid ${t.border}`, marginBottom:4, fontSize:8, color:t.text, overflow:"hidden" }}>
            <span style={{flexShrink:0}}>{item.icon}</span>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.val}</span>
          </div>
        ))}
        {/* Social chips */}
        {["instagram","linkedin","twitter","github"].filter(k => vcard[k as keyof VCardData]).length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginTop:4 }}>
            {["instagram","linkedin","twitter","github"].filter(k => vcard[k as keyof VCardData]).slice(0,4).map(k => (
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

const UTM_MED  = ["cpc","social","email","organic","qr","display","sms"];
const UTM_CAMP = ["brand","launch","sale","retargeting","influencer","seasonal"];

type Tab = "basic" | "tracking" | "rules";
type ScheduleRow = { start: string; end: string; url: string };

interface Props {
  onClose: () => void;
  onSuccess: (qr: QrCode) => void;
  editing?: QrCode | null;
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
  template: z.enum(["modern", "classic", "minimal", "dark", "gradient"]).default("modern"),
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

export default function CreateQRModal({ onClose, onSuccess, editing }: Props) {
  const isEdit = !!editing;

  const [qrType,      setQrType]      = useState<QrType>(editing?.qr_type ?? "url");
  const [typePicked,  setTypePicked]  = useState(isEdit);
  const [tab,         setTab]         = useState<Tab>("content");

  const [title,       setTitle]       = useState(editing?.title ?? "");
  const [slug,        setSlug]        = useState(editing?.short_slug ?? slug7());
  const [slugEdited,  setSlugEdited]  = useState(false);

  const [url,         setUrl]         = useState(
    !editing || editing.qr_type === "url" || editing.qr_type === "product" ? (editing?.target_url ?? "") : ""
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
  const [folders,     setFolders]     = useState<QrFolder[]>([]);
  // eslint-disable-next-line
  const [folderId,    setFolderId]    = useState<string|null>((editing as any)?.folder_id ?? null);

  // Conditional routing rules (simple)
  // eslint-disable-next-line
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
  // eslint-disable-next-line
  const [ga4Id, setGa4Id] = useState<string>(((editing as any)?.ga4_measurement_id ?? "") as string);
  // eslint-disable-next-line
  const [gtmId, setGtmId] = useState<string>(((editing as any)?.gtm_container_id ?? "") as string);
  // eslint-disable-next-line
  const [webhookUrl, setWebhookUrl] = useState<string>(((editing as any)?.webhook_url ?? "") as string);
  const [tags,        setTags]        = useState<string[]>(editing?.tags ?? []);
  const [tagInput,    setTagInput]    = useState("");
  const [notes,       setNotes]       = useState(editing?.notes ?? "");
  const [styles,      setStyles]      = useState<QrStyle[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Record<string,string>>({});
  const [copied,      setCopied]      = useState(false);

  useEffect(() => { fetchStyles().then(setStyles).catch(() => {}); }, []);
  useEffect(() => { fetchFolders().then(setFolders).catch(() => {}); }, []);

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
    setQrType(editing.qr_type ?? "url");
    setTitle(editing.title ?? "");
    setSlug(editing.short_slug ?? "");
    setIsActive(editing.is_active ?? true);

    // Fill type-specific fields from stored target_url (or vcard_data)
    const t = String(editing.target_url ?? "");
    const qt = (editing.qr_type ?? "url") as QrType;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

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

  const getTargetUrl = useCallback((): string => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    switch (qrType) {
      case "url":      return url;
      case "product":  return url;
      case "vcard":    return `${origin}/card/${slug}`;
      case "wifi":     return buildTargetUrl("wifi",     { ssid: wifiSsid, password: wifiSec === "nopass" ? "" : wifiPwd, security: wifiSec });
      case "sms":      return buildTargetUrl("sms",      { phone, message });
      case "email":    return buildTargetUrl("email",    { email: emailTo, subject: emailSub, body: emailBody });
      case "whatsapp": return buildTargetUrl("whatsapp", { phone, message });
      case "text":     return buildTargetUrl("text",     { text: textVal });
      case "phone":    return buildTargetUrl("phone",    { phone });
      default:         return url;
    }
  }, [qrType, url, slug, wifiSsid, wifiPwd, wifiSec, phone, message, emailTo, emailSub, emailBody, textVal]);

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
      if (keys.some(k => ["title","slug","url","vcFirst","wifiSsid","phone","emailTo","text","sku"].includes(k))) setTab("content");
      else if (keys.includes("pixelId")) setTab("settings");
      else setTab("settings");
      return false;
    }
    return true;
  }, [title, slug, qrType, url, notes, vcard.firstName, wifiSsid, phone, emailTo, textVal, pixelOn, pixelId, scanLimit, abUrl]);

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
      style_id:       styleId,
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
  }, [validate, title, slug, getTargetUrl, qrType, password, scanLimit, expiresAt, pixelOn, pixelId, isActive, styleId, utmSrc, utmMed, utmCamp, utmTerm, utmCont, tags, notes, redir, abUrl, abWeight, vcard, folderId, ga4Id, gtmId, webhookUrl, rMobile, rTablet, rDesktop, countryJson, scheduleRows, isEdit, editing, onSuccess]);

  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase()
      .replace(/[ğ]/g,"g").replace(/[ü]/g,"u").replace(/[ş]/g,"s")
      .replace(/[ı]/g,"i").replace(/[ö]/g,"o").replace(/[ç]/g,"c")
      .replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    if (t && !tags.includes(t) && tags.length < 10) setTags(p => [...p, t]);
    setTagInput("");
  }, [tagInput, tags]);

  const iCls = "w-full rounded-xl border bg-white/5 px-3 py-2.5 text-sm outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 border-slate-200 dark:border-white/10 placeholder:text-slate-400 dark:placeholder:text-slate-500";
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

  // ── TYPE ICONS / COLORS ─────────────────────────────────────────────────
  const T_ICONS: Record<QrType, React.ReactNode> = {
    url: <Globe size={20}/>, product: <Tag size={20}/>, vcard: <User size={20}/>, wifi: <Wifi size={20}/>,
    sms: <MessageSquare size={20}/>, email: <Mail size={20}/>,
    whatsapp: <Smartphone size={20}/>, text: <FileText size={20}/>, phone: <Phone size={20}/>,
  };
  const T_CLR: Record<QrType, string> = {
    url:"#6366f1", product:"#f97316", vcard:"#8b5cf6", wifi:"#06b6d4", sms:"#10b981",
    email:"#f59e0b", whatsapp:"#25D366", text:"#64748b", phone:"#ef4444",
  };

  // ══════════════════════════════════════════════════════
  // STEP 1 — Type picker (section-based, no fixed positioning)
  // ══════════════════════════════════════════════════════
  if (!typePicked) {
    const TYPES: QrType[] = ["url","product","vcard","wifi","sms","whatsapp","email","phone","text"];
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in" vaul-overlay="">
        <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-slate-50 dark:bg-slate-900/80 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 sm:p-10 shadow-2xl animate-scale-in overflow-y-auto custom-scrollbar shadow-slate-400/20 dark:shadow-black/50">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-violet-500/10 blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between mb-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Yeni QR Kod</p>
              <h2 className="font-black text-4xl mt-2 tracking-tighter text-slate-900 dark:text-white">Kampanya Türünü Seçin</h2>
            </div>
            <Button onClick={onClose} variant="ghost" size="icon" className="w-12 h-12 rounded-full shrink-0">
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in" vaul-overlay="">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-slate-50 dark:bg-slate-900/80 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 flex flex-col shadow-2xl animate-scale-in overflow-hidden shadow-slate-400/20 dark:shadow-black/50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-violet-500/10 blur-[100px] pointer-events-none" />
        
        {/* ── Header ── */}
        <div className="relative z-10 flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            {!isEdit && (
              <Button onClick={() => setTypePicked(false)} variant="outline" size="icon" className="w-11 h-11 rounded-full shrink-0">
                <ArrowLeft size={16} />
              </Button>
            )}
            <div>
              <h2 className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                {isEdit ? "Kampanyayı Düzenle" : "Yeni Kampanya Oluştur"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{qrInfo.label}</p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon" className="w-12 h-12 rounded-full">
            <X size={20} strokeWidth={2.5}/>
          </Button>
        </div>

        {/* ── Tabs ── */}
        <div className="relative z-10 flex items-center gap-2 p-1.5 mx-5 sm:mx-6 mt-4 rounded-full border bg-slate-100/80 dark:bg-black/20 border-slate-200/80 dark:border-white/10 shadow-sm">
          {(["content","design","settings"] as Tab[]).map(t => {
            const TABS: Record<Tab, { label: string, icon: React.ReactNode }> = {
              content:  { label: "İçerik",   icon: <LinkIcon size={16}/> },
              design:   { label: "Tasarım",  icon: <Palette size={16}/> },
              settings: { label: "Ayarlar",  icon: <Settings2 size={16}/> },
            };
            return (
              <Button key={t} onClick={() => setTab(t)} variant={tab === t ? "secondary" : "ghost"} className="flex-1 h-11 rounded-full text-sm">
                {TABS[t].icon}
                <span className="ml-2">{TABS[t].label}</span>
              </Button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 space-y-6 px-5 sm:px-6 pt-6 pb-8 custom-scrollbar relative z-10">

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
                        <Button key={s} type="button" onClick={() => setWifiSec(s)} variant={wifiSec === s ? "default" : "outline"} size="sm" className="rounded-full">
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
                      <Button asChild><Link href={`/dashboard/vcard-builder?id=${editing!.id}`}>Stüdyoyu Aç</Link></Button>
                    )}
                  </div>

                  {/* ── Two-pane: form (left) + mobile preview (right) ── */}
                  <div className="flex gap-4 items-start">

                    {/* LEFT: all form fields */}
                    <div className="flex-1 min-w-0 space-y-4">

                      {/* Template picker */}
                      <div className="space-y-1.5">
                        <label className={lCls}>Sayfa Şablonu</label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {VCARD_TPLS.map(t => (
                            <button key={t.id} type="button" onClick={() => setV("template", t.id)} title={t.label} className={`relative h-12 rounded-lg border-2 overflow-hidden transition-colors ${vcard.template===t.id ? "border-violet-500 ring-2 ring-violet-500/30" : "border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-slate-500"}`}>
                              <div className="w-full h-full" style={{ background:t.bg }}/>
                              {vcard.template===t.id && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Check size={16} className="text-white"/>
                                </div>
                              )}
                              <span className="absolute bottom-0 left-0 right-0 text-[10px] text-center py-0.5 font-semibold truncate bg-white/80 dark:bg-black/60 text-slate-800 dark:text-white/90">{t.label}</span>
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

                      {/* Banner upload */}
                      <div className="space-y-1.5">
                        <label className={lCls}>Banner / Kapak Görseli</label>
                        {vcard.coverImage ? (
                          <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10" style={{height:72}}>
                            <Image src={vcard.coverImage} alt="banner" fill className="object-cover" unoptimized />
                            <Button type="button" onClick={() => setV("coverImage", "")} variant="destructive" size="icon" className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full">
                              <X size={11}/>
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-slate-300 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-black/10">
                            <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-slate-100 dark:bg-white/5">
                              <ImageIcon size={16} className="text-slate-500 dark:text-slate-400"/>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">Banner Yükle</p>
                              <p className="text-xs text-slate-500">Kapak görseli · PNG/JPG</p>
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const r = new FileReader(); r.onload = ev => setV("coverImage", ev.target?.result as string ?? ""); r.readAsDataURL(f);
                            }}/>
                          </label>
                        )}
                      </div>

                      {/* Avatar upload */}
                      <div className="space-y-1.5">
                        <label className={lCls}>Avatar / Profil Fotoğrafı</label>
                        {vcard.avatar ? (
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 dark:border-white/10">
                              <Image src={vcard.avatar} alt="avatar" width={48} height={48} className="w-12 h-12 object-cover" unoptimized />
                            </div>
                            <Button type="button" onClick={() => setV("avatar", "")} variant="link" className="text-red-500">Kaldır</Button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-slate-300 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-black/10">
                            <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-slate-100 dark:bg-white/5">
                              <UserCircle size={16} className="text-slate-500 dark:text-slate-400"/>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">Avatar Yükle</p>
                              <p className="text-xs text-slate-500">Profil fotoğrafı · PNG/JPG</p>
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const r = new FileReader(); r.onload = ev => setV("avatar", ev.target?.result as string ?? ""); r.readAsDataURL(f);
                            }}/>
                          </label>
                        )}
                      </div>

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
                            <Button type="button" variant="ghost" size="icon" onClick={() => { const arr=(vcard.websites||[]).filter((_,i)=>i!==idx); setV("websites",arr); }} className="mt-1 shrink-0 text-slate-400 hover:text-red-500">
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
                    <div className="w-40 shrink-0 flex flex-col items-center gap-2 sticky top-4">
                      <p className="text-sm font-semibold text-slate-500 text-center">Önizleme</p>
                      {/* phone shell */}
                      <div className="relative rounded-3xl border-4 overflow-hidden border-slate-300 dark:border-slate-700"
                        style={{width:144, height:296, boxShadow:"0 8px 20px rgba(0,0,0,0.05)"}}>
                        {/* notch */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full z-10 bg-slate-200 dark:bg-slate-800"/>
                        {/* screen */}
                        <div className="absolute inset-0 overflow-hidden" style={{top:8}}>
                          <VCardMiniPreview vcard={vcard}/>
                        </div>
                      </div>
                      <p className="text-xs text-center text-slate-500">Anlık güncellenir</p>
                    </div>{/* end RIGHT */}

                  </div>{/* end two-pane flex */}

                </div>
              )}

              {/* ── Slug ── */}
              <div className="space-y-1.5">
                <label className={lCls}>Kısa Slug</label>
                <div className={`flex items-center border rounded-xl overflow-hidden transition-all focus-within:border-violet-500 bg-slate-100 dark:bg-black/20 border-slate-200 dark:border-white/10 ${errors.slug ? "!border-red-500/60" : ""}`}>
                  <span className="px-3 py-2.5 text-sm font-mono border-r border-slate-200 dark:border-white/10 text-slate-500 whitespace-nowrap shrink-0">/q/</span>
                  <input value={slug} readOnly={isEdit}
                    onChange={e => { if (!isEdit) { setSlug(e.target.value.toLowerCase()); setSlugEdited(true); }}}
                    className={`flex-1 bg-transparent px-3 py-2.5 text-sm font-mono text-slate-900 dark:text-white outline-none min-w-0 ${isEdit ? "opacity-50 cursor-not-allowed" : ""}`}/>
                  {isEdit
                    ? <Lock size={14} className="mr-3 text-slate-500 shrink-0"/>
                    : <Button onClick={() => { setSlug(slug7()); setSlugEdited(true); }} variant="ghost" size="icon" className="mr-1 shrink-0">
                        <RefreshCw size={14}/>
                      </Button>
                  }
                </div>
                <Err msg={errors.slug}/>
              </div>

              {/* Style picker */}
              <div className="space-y-1.5">
                <label className={lCls}>QR Kod Tasarımı</label>
                <div className="flex gap-2">
                  <select value={styleId ?? ""} onChange={e => setStyleId(e.target.value || null)}
                    className={`${iCls} flex-1`}>
                    <option value="">Varsayılan</option>
                    {styles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {styleId && (
                    <Button onClick={() => setStyleId(null)} variant="outline" size="icon"><X size={14}/></Button>
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
                <div className="flex gap-2">
                  <select value={folderId ?? ""} onChange={e => setFolderId(e.target.value || null)}
                    className={`${iCls} flex-1`}>
                    <option value="">Klasör yok</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <Button type="button" variant="outline" size="icon" title="Yeni klasör" onClick={async () => {
                    const name = prompt("Klasör adı (örn: 2026 Bahar Kampanyası)");
                    if (!name?.trim()) return;
                    const created = await createFolder(name.trim());
                    setFolders(prev => [created, ...prev]);
                    setFolderId(created.id);
                  }}>
                    <Plus size={16}/>
                  </Button>
                </div>
                <p className="text-sm mt-1 text-slate-500">
                  QR’ları kampanya bazında gruplayın. Dashboard filtreleme/raporlama için kullanılır.
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
                  <Button onClick={addTag} variant="outline">Ekle</Button>
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

          {/* ════ TAB: TASARIM ═══════════════════════════ */}
          {tab === "design" && (
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
                            <Button key={o} type="button" onClick={() => f.s(f.v===o ? "" : o)} variant={f.v === o ? "default" : "outline"} size="sm" className="rounded-full h-7 text-xs">
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
                      <Button onClick={async () => { await copyToClipboard(previewUtm()); setCopied(true); setTimeout(()=>setCopied(false),2000); }} variant="link" size="sm" className="text-violet-500 p-0 h-auto">
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
                        <Button type="button" onClick={() => setScheduleRows(p => p.filter((_, i) => i !== idx))} variant="link" className="text-red-500 h-auto p-0">
                          Sil
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" onClick={() => setScheduleRows(p => [...p, { start:"", end:"", url:"" }])} variant="outline" size="sm">
                    <Plus size={12}/> Kural Ekle
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={lCls}>Şifre Koruması</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Opsiyonel" className={`${iCls} pr-10`}/>
                  <Button type="button" onClick={() => setShowPwd(p => !p)} variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500">
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
                    <Button key={t} type="button" onClick={() => setRedir(t)} variant={redir === t ? "default" : "outline"} className="flex-1">
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
            <Button onClick={onClose} variant="ghost">İptal</Button>
            <Button onClick={submit} disabled={loading}>
              {loading && <Loader2 size={14} className="animate-spin"/>}
              {isEdit ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </div>
      </div>
    </div>
    );
}
