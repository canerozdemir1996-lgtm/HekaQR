"use client";
import { useState, useCallback, useEffect } from "react";
import {
  X, Loader2, Sparkles, Palette, Check, Lock, Plus,
  AlertCircle, Eye, EyeOff, Facebook, Shuffle,
  Copy, RefreshCw, Globe, Smartphone, Wifi,
  MessageSquare, Mail, Phone, FileText, User, Download,
  Image as ImageIcon, UserCircle, Building2, MapPin, Tag,
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
import { copyToClipboard } from "@/lib/clipboard";
import PhoneInput from "@/components/PhoneInput";

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
  theme?: "dark" | "light";
}

const EMPTY_VCARD: VCardData = {
  firstName: "", lastName: "", title: "", company: "", department: "", bio: "",
  phone: "", phone2: "", email: "", email2: "", website: "",
  address: "", city: "", country: "",
  instagram: "", linkedin: "", twitter: "", facebook: "", youtube: "", github: "", whatsapp: "",
  template: "modern", accentColor: "#6366f1", coverColor: "#0f172a", avatar: "", coverImage: "",
  websites: [],
};

export default function CreateQRModal({ onClose, onSuccess, editing, theme = "dark" }: Props) {
  const isEdit = !!editing;
  const dk = theme === "dark";

  const [qrType,      setQrType]      = useState<QrType>(editing?.qr_type ?? "url");
  const [typePicked,  setTypePicked]  = useState(isEdit);
  const [tab,         setTab]         = useState<Tab>("basic");

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
    try {
      const u = new URL(url);
      if (utmSrc)  u.searchParams.set("utm_source",   utmSrc);
      if (utmMed)  u.searchParams.set("utm_medium",   utmMed);
      if (utmCamp) u.searchParams.set("utm_campaign", utmCamp);
      if (utmTerm) u.searchParams.set("utm_term",     utmTerm);
      if (utmCont) u.searchParams.set("utm_content",  utmCont);
      return u.toString();
    } catch { return url; }
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
      if (keys.some(k => ["title","slug","url","vcFirst","wifiSsid","phone","emailTo","text","sku"].includes(k))) setTab("basic");
      else if (keys.includes("pixelId")) setTab("tracking");
      else setTab("rules");
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
        setTab("rules");
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
        setErrors({ slug: "Bu slug zaten kullanımda" }); setTab("basic");
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

  // ── Theme helpers ────────────────────────────────────────────────────────
  const bg   = dk ? "bg-[#0c0f1a]"        : "bg-white";
  const bdr  = dk ? "border-white/[0.08]" : "border-slate-200";
  const tx   = dk ? "text-slate-100"      : "text-slate-900";
  const sub  = dk ? "text-slate-500"      : "text-slate-400";
  const pnl  = dk ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200";
  const inpC = dk
    ? "bg-white/[0.05] border-white/[0.10] focus:border-violet-500 text-slate-100 placeholder:text-slate-600"
    : "bg-slate-50 border-slate-200 focus:border-violet-400 text-slate-900 placeholder:text-slate-400";
  const iCls = `w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${inpC}`;
  const lCls = `text-[10px] font-bold uppercase tracking-widest ${dk ? "text-slate-500" : "text-slate-400"}`;

  const Err = ({ msg }: { msg?: string }) => msg
    ? <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1"><AlertCircle size={10}/>{msg}</p>
    : null;

  const Tog = ({ on, onChange, color="bg-violet-600" }: { on:boolean; onChange:()=>void; color?:string }) => (
    <button type="button" onClick={onChange}
      className={`relative w-10 h-[22px] rounded-full transition-all shrink-0 ${on ? color : dk ? "bg-white/10" : "bg-slate-200"}`}>
      <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : ""}`}/>
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
      <div className={`rounded-2xl ${bg} border ${bdr} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className={`text-[10px] font-black tracking-widest ${dk ? "text-slate-500" : "text-slate-400"}`}>QR TİPİ</p>
            <h2 className={`font-black text-lg mt-2 ${dk ? "text-white" : "text-slate-900"}`}>QR Tipi Seç</h2>
            <p className={`text-sm mt-1 ${dk ? "text-slate-500" : "text-slate-600"}`}>QR kodun ne yapacağını belirle</p>
          </div>
          <button onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${dk ? "text-slate-500 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100"}`}>
            <X size={16}/>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TYPES.map(t => {
            const info  = QR_TYPE_LABELS[t];
            const color = T_CLR[t];
            return (
              <button key={t} onClick={() => { setQrType(t); setTypePicked(true); }}
                className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${dk ? "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background:`${color}18`, color }}>
                  {T_ICONS[t]}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tx}`}>{info.label}</p>
                  <p className={`text-[11px] ${sub} mt-0.5 leading-relaxed`}>{info.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // STEP 2 — Full form (section-based, no fixed positioning)
  // ══════════════════════════════════════════════════════
  const qrInfo = QR_TYPE_LABELS[qrType];

  return (
    <div className={`rounded-2xl ${bg} border ${bdr} p-6 flex flex-col`} style={{ maxHeight:"calc(100vh - 8rem)" }}>
      {/* ── Header ── */}
      <div className={`flex items-center justify-between pb-4 border-b ${bdr} shrink-0 mb-4`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white"/>
          </div>
          <div>
            <h2 className={`font-bold text-sm ${tx}`}>
              {isEdit ? "QR Düzenle" : `${qrInfo.emoji} ${qrInfo.label}`}
            </h2>
            {!isEdit && (
              <button onClick={() => setTypePicked(false)}
                className={`text-[10px] ${sub} hover:text-violet-400 transition-colors`}>
                ← Tip değiştir
              </button>
            )}
          </div>
        </div>
        <button onClick={onClose}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${dk ? "text-slate-500 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
          <X size={15}/>
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className={`flex border-b ${bdr} px-0 mb-4 shrink-0 gap-4`}>
        {(["basic","tracking","rules"] as Tab[]).map(t => {
          const labels: Record<Tab,string> = { basic:"İçerik", tracking:"Takip & UTM", rules:"Kurallar" };
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`px-0 py-2 text-xs font-semibold border-b-2 transition-all ${tab===t ? "border-violet-500 text-violet-400" : `border-transparent ${sub}`}`}>
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* ── Body ── */}
      <div className="overflow-y-auto flex-1 space-y-4 pr-2">

          {/* ════ TAB: CONTENT ════════════════════════════ */}
          {tab === "basic" && (
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
                        <button key={s} type="button" onClick={() => setWifiSec(s)}
                          className={`text-[11px] px-3 py-1.5 rounded-full border transition-all font-medium ${wifiSec===s ? "border-violet-500 bg-violet-500/15 text-violet-400" : dk ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                          {s}
                        </button>
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
                    <PhoneInput value={phone} onChange={setPhone} error={!!errors.phone} dark={dk}/>
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
                    <PhoneInput value={phone} onChange={setPhone} error={!!errors.phone} dark={dk}/>
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
                  <PhoneInput value={phone} onChange={setPhone} error={!!errors.phone} dark={dk}/>
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
                <div className="space-y-4">
                  <div className={`rounded-xl border ${pnl} p-4 flex items-center justify-between gap-4`}>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${tx}`}>vCard Builder (Yeni)</p>
                      <p className={`text-[11px] ${sub}`}>
                        SmartBio tarzı blok bazlı düzenleme için QR’ı oluşturduktan sonra builder otomatik açılır.
                      </p>
                    </div>
                    {isEdit && (
                      <Link
                        href={`/dashboard/vcard-builder?id=${editing!.id}`}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-white btn-premium focus-premium"
                      >
                        Builder’ı Aç
                      </Link>
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
                            <button key={t.id} type="button" onClick={() => setV("template", t.id)} title={t.label}
                              className={`relative h-12 rounded-xl border-2 overflow-hidden transition-all ${vcard.template===t.id ? "border-violet-500" : dk ? "border-white/10 hover:border-white/20" : "border-slate-200 hover:border-slate-300"}`}>
                              <div className="w-full h-full" style={{ background:t.bg }}/>
                              {vcard.template===t.id && (
                                <div className="absolute inset-0 bg-violet-600/40 flex items-center justify-center">
                                  <Check size={12} className="text-white"/>
                                </div>
                              )}
                              <span className={`absolute bottom-0 left-0 right-0 text-[8px] text-center py-0.5 font-bold truncate ${dk ? "bg-black/60 text-white/80" : "bg-white/70 text-slate-700"}`}>{t.label}</span>
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
                            <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${dk ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                              <input type="color" value={(vcard[c.key] as string)||c.def} onChange={e => setV(c.key, e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0"/>
                              <span className={`text-xs font-mono truncate ${tx}`}>{(vcard[c.key] as string)||c.def}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Banner upload */}
                      <div className="space-y-1.5">
                        <label className={lCls}>Banner / Kapak Görseli</label>
                        {vcard.coverImage ? (
                          <div className={`relative rounded-xl overflow-hidden border ${dk?"border-white/10":"border-slate-200"}`} style={{height:72}}>
                            <Image src={vcard.coverImage} alt="banner" fill className="object-cover" unoptimized />
                            <button type="button" onClick={() => setV("coverImage", "")}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors">
                              <X size={11}/>
                            </button>
                          </div>
                        ) : (
                          <label className={`flex items-center gap-3 p-3 border border-dashed rounded-xl cursor-pointer transition-all ${dk?"border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5":"border-slate-200 hover:border-violet-300 hover:bg-violet-50/50"}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dk?"bg-white/5":"bg-slate-100"}`}>
                              <ImageIcon size={14} className="text-violet-400"/>
                            </div>
                            <div>
                              <p className={`text-xs font-semibold ${dk?"text-slate-300":"text-slate-600"}`}>Banner Yükle</p>
                              <p className={`text-[10px] ${dk?"text-slate-600":"text-slate-400"}`}>Kapak görseli · PNG/JPG</p>
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
                            <div className="w-12 h-12 rounded-xl overflow-hidden border-2" style={{borderColor:dk?"rgba(255,255,255,0.15)":"#e2e8f0"}}>
                              <Image src={vcard.avatar} alt="avatar" width={48} height={48} className="w-12 h-12 object-cover" unoptimized />
                            </div>
                            <button type="button" onClick={() => setV("avatar", "")}
                              className={`text-xs ${dk?"text-slate-500 hover:text-red-400":"text-slate-400 hover:text-red-500"} transition-colors`}>Kaldır</button>
                          </div>
                        ) : (
                          <label className={`flex items-center gap-3 p-3 border border-dashed rounded-xl cursor-pointer transition-all ${dk?"border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5":"border-slate-200 hover:border-violet-300 hover:bg-violet-50/50"}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dk?"bg-white/5":"bg-slate-100"}`}>
                              <UserCircle size={14} className="text-violet-400"/>
                            </div>
                            <div>
                              <p className={`text-xs font-semibold ${dk?"text-slate-300":"text-slate-600"}`}>Avatar Yükle</p>
                              <p className={`text-[10px] ${dk?"text-slate-600":"text-slate-400"}`}>Profil fotoğrafı · PNG/JPG</p>
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const r = new FileReader(); r.onload = ev => setV("avatar", ev.target?.result as string ?? ""); r.readAsDataURL(f);
                            }}/>
                          </label>
                        )}
                      </div>

                      <div className={`h-px ${dk ? "bg-white/[0.07]" : "bg-slate-200"}`}/>
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

                      <div className={`h-px ${dk ? "bg-white/[0.07]" : "bg-slate-200"}`}/>
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
                          <PhoneInput value={vcard.phone||""} onChange={v => setV("phone", v)} dark={dk}/>
                        </div>
                        <div className="space-y-1.5">
                          <label className={lCls}>İş Telefonu</label>
                          <PhoneInput value={vcard.phone2||""} onChange={v => setV("phone2", v)} dark={dk}/>
                        </div>
                      </div>
                      {/* Multi-website */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className={lCls}>Web Siteleri</label>
                          <button type="button"
                            onClick={() => setV("websites", [...(vcard.websites||[]), { label:"", url:"" }])}
                            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${dk?"bg-violet-500/15 text-violet-400 hover:bg-violet-500/25":"bg-violet-50 text-violet-600 hover:bg-violet-100"}`}>
                            <Plus size={10}/> Ekle
                          </button>
                        </div>
                        {(vcard.websites||[]).map((ws, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <div className="flex-1 space-y-1">
                              <input value={ws.label} onChange={e => {
                                const arr = [...(vcard.websites||[])]; arr[idx]={...arr[idx],label:e.target.value}; setV("websites",arr);
                              }} placeholder="Etiket (örn: Portfolio)" className={`${iCls} text-xs`}/>
                              <input type="url" value={ws.url} onChange={e => {
                                const arr = [...(vcard.websites||[])]; arr[idx]={...arr[idx],url:e.target.value}; setV("websites",arr);
                              }} placeholder="https://example.com" className={`${iCls} text-xs`}/>
                            </div>
                            <button type="button"
                              onClick={() => { const arr=(vcard.websites||[]).filter((_,i)=>i!==idx); setV("websites",arr); }}
                              className={`mt-1 p-1.5 rounded-lg transition-colors ${dk?"text-slate-600 hover:text-red-400 hover:bg-red-500/10":"text-slate-400 hover:text-red-500 hover:bg-red-50"}`}>
                              <X size={12}/>
                            </button>
                          </div>
                        ))}
                        {(!vcard.websites || vcard.websites.length === 0) && (
                          <p className={`text-[10px] ${dk?"text-slate-700":"text-slate-400"}`}>Henüz web sitesi eklenmedi.</p>
                        )}
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

                      <div className={`h-px ${dk ? "bg-white/[0.07]" : "bg-slate-200"}`}/>
                      <p className={lCls}>Sosyal Medya</p>
                      <div className="grid grid-cols-2 gap-3">
                        {(["linkedin","instagram","twitter","github","facebook","youtube","whatsapp"] as const).map(k => (
                          <div key={k} className="space-y-1.5">
                            <label className={lCls}>{k.charAt(0).toUpperCase()+k.slice(1)}</label>
                            <input value={(vcard[k]||"") as string} onChange={e => setV(k,e.target.value)}
                              placeholder={k==="linkedin"?"kullaniciadi":k==="whatsapp"?"+905xx":"@kullaniciadi"}
                              className={`${iCls} text-xs`}/>
                          </div>
                        ))}
                      </div>
                      {!isEdit && (
                        <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border ${pnl}`}>
                          <Download size={12} className="text-violet-400 shrink-0 mt-0.5"/>
                          <p className={`text-xs ${sub}`}>
                            Kaydedilince: <span className="text-violet-400 font-mono">/card/{slug}</span>
                          </p>
                        </div>
                      )}

                    </div>{/* end LEFT */}

                    {/* RIGHT: live mobile preview */}
                    <div className="w-40 shrink-0 flex flex-col items-center gap-2 sticky top-4">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${dk?"text-slate-500":"text-slate-400"} text-center`}>Önizleme</p>
                      {/* phone shell */}
                      <div className={`relative rounded-[22px] border-[4px] overflow-hidden ${dk?"border-slate-700":"border-slate-300"}`}
                        style={{width:144, height:296, boxShadow:dk?"0 8px 32px rgba(0,0,0,0.6)":"0 8px 32px rgba(0,0,0,0.15)"}}>
                        {/* notch */}
                        <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full z-10 ${dk?"bg-slate-900":"bg-slate-400"}`}/>
                        {/* screen */}
                        <div className="absolute inset-0 overflow-hidden" style={{top:8}}>
                          <VCardMiniPreview vcard={vcard}/>
                        </div>
                      </div>
                      <p className={`text-[9px] text-center leading-relaxed ${dk?"text-slate-600":"text-slate-400"}`}>Anlık güncellenir</p>
                    </div>{/* end RIGHT */}

                  </div>{/* end two-pane flex */}

                </div>
              )}

              {/* ── Slug ── */}
              <div className="space-y-1.5">
                <label className={lCls}>Kısa Slug</label>
                <div className={`flex items-center border rounded-xl overflow-hidden transition-all focus-within:border-violet-500 ${dk ? "bg-white/[0.05] border-white/[0.10]" : "bg-slate-50 border-slate-200"} ${errors.slug ? "!border-red-500/60" : ""}`}>
                  <span className={`px-3 py-2.5 text-[11px] font-mono border-r ${bdr} ${sub} whitespace-nowrap shrink-0`}>/q/</span>
                  <input value={slug} readOnly={isEdit}
                    onChange={e => { if (!isEdit) { setSlug(e.target.value.toLowerCase()); setSlugEdited(true); }}}
                    className={`flex-1 bg-transparent px-3 py-2.5 text-sm font-mono ${tx} outline-none min-w-0 ${isEdit ? "opacity-50 cursor-not-allowed" : ""}`}/>
                  {isEdit
                    ? <Lock size={12} className={`mr-3 ${sub} shrink-0`}/>
                    : <button onClick={() => { setSlug(slug7()); setSlugEdited(true); }}
                        className={`p-2 mr-1 rounded-lg shrink-0 transition-all ${dk ? "text-slate-500 hover:text-violet-400 hover:bg-white/10" : "text-slate-400 hover:text-violet-500 hover:bg-slate-200"}`}>
                        <RefreshCw size={12}/>
                      </button>
                  }
                </div>
                <Err msg={errors.slug}/>
              </div>

              {/* Style picker */}
              <div className="space-y-1.5">
                <label className={lCls}>QR Tasarım Şablonu</label>
                <div className="flex gap-2">
                  <select value={styleId ?? ""} onChange={e => setStyleId(e.target.value || null)}
                    className={`flex-1 border rounded-xl px-3 py-2.5 text-sm outline-none transition-all ${inpC}`}>
                    <option value="">Varsayılan</option>
                    {styles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {styleId && (
                    <button onClick={() => setStyleId(null)}
                      className={`px-3 rounded-xl border transition-all ${dk ? "border-white/10 text-slate-400 hover:text-red-400" : "border-slate-200 text-slate-400 hover:text-red-500"}`}>
                      <X size={13}/>
                    </button>
                  )}
                </div>
                {styles.length === 0 && (
                  <Link href="/dashboard/templates" onClick={onClose}
                    className="text-xs text-violet-400 hover:underline flex items-center gap-1">
                    <Palette size={10}/> Şablon oluştur
                  </Link>
                )}
              </div>

              {/* Folder / Campaign */}
              <div className="space-y-1.5">
                <label className={lCls}>Klasör / Kampanya</label>
                <div className="flex gap-2">
                  <select value={folderId ?? ""} onChange={e => setFolderId(e.target.value || null)}
                    className={`flex-1 border rounded-xl px-3 py-2.5 text-sm outline-none transition-all ${inpC}`}>
                    <option value="">Klasör yok</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      const name = prompt("Klasör adı (örn: 2026 Bahar Kampanyası)");
                      if (!name?.trim()) return;
                      const created = await createFolder(name.trim());
                      setFolders(prev => [created, ...prev]);
                      setFolderId(created.id);
                    }}
                    className={`px-3 rounded-xl border transition-all text-sm font-bold ${dk ? "border-white/10 text-slate-400 hover:text-violet-300 hover:border-violet-500/40" : "border-slate-200 text-slate-500 hover:border-violet-400"}`}
                    title="Yeni klasör"
                  >
                    +
                  </button>
                </div>
                <p className={`text-[11px] mt-1 ${sub}`}>
                  QR’ları kampanya bazında gruplayın. Dashboard filtreleme/raporlama için kullanılır.
                </p>
              </div>

              {/* Active */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${pnl}`}>
                <span className={`text-sm font-medium ${tx} flex items-center gap-2`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : dk ? "bg-slate-600" : "bg-slate-300"}`}/>
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
                    placeholder="etiket ekle…" className={`flex-1 ${iCls}`}/>
                  <button onClick={addTag}
                    className={`px-3.5 rounded-xl border text-sm font-bold transition-all ${dk ? "border-white/10 text-slate-500 hover:border-violet-500 hover:text-violet-400" : "border-slate-200 text-slate-400 hover:border-violet-400"}`}>+</button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {tags.map(t => (
                      <span key={t} className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${dk ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                        #{t}
                        <button onClick={() => setTags(p => p.filter(x => x!==t))} className="hover:text-red-400 ml-0.5"><X size={9}/></button>
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

          {/* ════ TAB: TRACKING ═══════════════════════════ */}
          {tab === "tracking" && (
            <div className="space-y-5">
              {/* Pixel */}
              <div className={`rounded-xl border ${pnl} p-4 space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Facebook size={14} className="text-blue-400"/>
                    <span className={`text-sm font-semibold ${tx}`}>Meta Pixel</span>
                  </div>
                  <Tog on={pixelOn} onChange={() => setPixelOn(p => !p)} color="bg-blue-500"/>
                </div>
                {pixelOn && (
                  <div className="space-y-1.5">
                    <label className={lCls}>Pixel ID</label>
                    <input value={pixelId} onChange={e => setPixelId(e.target.value)}
                      placeholder="123456789012345"
                      className={`${iCls} font-mono ${errors.pixelId ? "border-red-500/60" : ""}`}/>
                    <Err msg={errors.pixelId}/>
                  </div>
                )}
              </div>

              {/* GA4 / GTM */}
              <div className={`rounded-xl border ${pnl} p-4 space-y-3`}>
                <p className={`text-xs font-semibold ${tx}`}>GA4 / GTM</p>
                <div className="space-y-1.5">
                  <label className={lCls}>GA4 Measurement ID (opsiyonel)</label>
                  <input value={ga4Id} onChange={e => setGa4Id(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className={`${iCls} font-mono`}/>
                  <p className={`text-[11px] ${sub}`}>Tarama anında `qr_scan` event’i gönderilir.</p>
                </div>
                <div className="space-y-1.5">
                  <label className={lCls}>GTM Container ID (opsiyonel)</label>
                  <input value={gtmId} onChange={e => setGtmId(e.target.value)}
                    placeholder="GTM-XXXXXXX"
                    className={`${iCls} font-mono`}/>
                  <p className={`text-[11px] ${sub}`}>Pixel/GA olmayan senaryolarda bile bridge sayfası çalışır.</p>
                </div>
              </div>

              {/* Webhook */}
              <div className={`rounded-xl border ${pnl} p-4 space-y-3`}>
                <p className={`text-xs font-semibold ${tx}`}>Webhook</p>
                <div className="space-y-1.5">
                  <label className={lCls}>Webhook URL (opsiyonel)</label>
                  <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    className={`${iCls} font-mono`}/>
                  <p className={`text-[11px] ${sub}`}>
                    Her taramada <span className="font-mono">{'{"event":"qr_scan","qr_id","slug","device","os","country"}'}</span> POST edilir.
                  </p>
                </div>
              </div>

              {/* UTM */}
              {qrType === "url" && (
                <div className="space-y-3">
                  <p className={lCls}>UTM Parametreleri</p>
                  {[
                    { k:"utm_source",   v:utmSrc,  s:setUtmSrc,  p:UTM_SRC  },
                    { k:"utm_medium",   v:utmMed,  s:setUtmMed,  p:UTM_MED  },
                    { k:"utm_campaign", v:utmCamp, s:setUtmCamp, p:UTM_CAMP },
                    { k:"utm_term",     v:utmTerm, s:setUtmTerm               },
                    { k:"utm_content",  v:utmCont, s:setUtmCont               },
                  ].map(f => (
                    <div key={f.k} className="space-y-1">
                      <label className={lCls}>{f.k}</label>
                      <input value={f.v} onChange={e => f.s(e.target.value)}
                        placeholder={f.k} className={`${iCls} font-mono`}/>
                      {"p" in f && f.p && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {f.p.map((o: string) => (
                            <button key={o} type="button" onClick={() => f.s(f.v===o ? "" : o)}
                              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium ${f.v===o ? "border-violet-500 bg-violet-500/15 text-violet-400" : dk ? "border-white/10 text-slate-500 hover:border-violet-400/40 hover:text-violet-400" : "border-slate-200 text-slate-400"}`}>
                              {o}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {(url || utmSrc) && (
                    <div className={`rounded-xl border ${bdr} p-3 space-y-2 ${dk ? "bg-white/[0.02]" : "bg-slate-50"}`}>
                      <p className={lCls}>Önizleme URL</p>
                      <p className={`text-[11px] font-mono break-all leading-relaxed ${dk ? "text-slate-400" : "text-slate-600"}`}>{previewUtm()}</p>
                      <button onClick={async () => { await copyToClipboard(previewUtm()); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
                        className="text-xs text-violet-400 flex items-center gap-1">
                        {copied ? <><Check size={11}/>Kopyalandı</> : <><Copy size={11}/>Kopyala</>}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB: RULES ══════════════════════════════ */}
          {tab === "rules" && (
            <div className="space-y-4">
              {/* Conditional routing */}
              <div className={`rounded-xl border ${pnl} p-4 space-y-3`}>
                <p className={`text-xs font-semibold ${tx}`}>Koşullu Yönlendirme (opsiyonel)</p>
                <p className={`text-[11px] ${sub}`}>Cihaza göre farklı URL’e yönlendirebilirsiniz. Boş bırakırsanız normal hedef çalışır.</p>
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
              <div className={`rounded-xl border ${pnl} p-4 space-y-3`}>
                <p className={`text-xs font-semibold ${tx}`}>Ülkeye Göre Yönlendirme (opsiyonel)</p>
                <p className={`text-[11px] ${sub}`}>
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
              <div className={`rounded-xl border ${pnl} p-4 space-y-3`}>
                <p className={`text-xs font-semibold ${tx}`}>Zamana Göre Yönlendirme (opsiyonel)</p>
                <p className={`text-[11px] ${sub}`}>
                  Belirli tarih aralığında farklı bir URL’e yönlendirin. Başlangıç veya bitişten biri doluysa URL zorunludur.
                </p>
                <div className="space-y-2">
                  {scheduleRows.length === 0 && (
                    <p className={`text-[11px] ${sub}`}>Kural eklemek için “Kural Ekle”ye basın.</p>
                  )}
                  {scheduleRows.map((r, idx) => (
                    <div key={idx} className={`rounded-xl border ${dk ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50"} p-3 space-y-2`}>
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
                      <div className="flex justify-end">
                        <button type="button"
                          onClick={() => setScheduleRows(p => p.filter((_, i) => i !== idx))}
                          className={`text-xs font-semibold ${dk ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-600"}`}>
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setScheduleRows(p => [...p, { start:"", end:"", url:"" }])}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${dk ? "border-white/10 text-slate-400 hover:border-violet-400/40 hover:text-violet-300 bg-white/5" : "border-slate-200 text-slate-500 bg-slate-50 hover:border-violet-300"}`}>
                    <Plus size={12}/> Kural Ekle
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={lCls}>Şifre Koruması</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Opsiyonel" className={`${iCls} pr-10`}/>
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${sub}`}>
                    {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
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
                  {(["302","301"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setRedir(t)}
                      className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${redir===t ? "border-violet-500 bg-violet-500/15 text-violet-400" : dk ? "bg-white/5 border-white/10 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                      {t}{t==="302" ? " · Geçici" : " · Kalıcı (SEO)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl border ${pnl} p-4 space-y-3`}>
                <p className={`text-xs font-semibold ${tx} flex items-center gap-1.5`}>
                  <Shuffle size={12} className="text-emerald-400"/> A/B Test
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
                    <p className={`text-xs ${sub} mb-1`}>A: %{abWeight} · B: %{100-+abWeight}</p>
                    <input type="range" min={10} max={90} step={5} value={abWeight}
                      onChange={e => setAbWeight(e.target.value)} className="w-full accent-violet-500"/>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Global error */}
          {errors.form && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5"/>
              <div>
                <p className="font-semibold text-sm">Hata</p>
                <p className="text-xs mt-0.5 opacity-80">{errors.form}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={`flex items-center justify-between gap-3 pt-4 border-t ${bdr} shrink-0`}>
          <div className={`text-[11px] ${sub} truncate min-w-0`}>
            {isEdit
              ? <span className="text-amber-500/80 flex items-center gap-1"><Lock size={10}/> Slug korunuyor</span>
              : <span className="text-violet-500/60 font-mono">/q/{slug}</span>
            }
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onClose} className={`px-4 py-2 text-sm ${sub} transition-colors hover:text-slate-300`}>İptal</button>
            <button onClick={submit} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white disabled:opacity-50 transition-all btn-premium focus-premium">
              {loading && <Loader2 size={13} className="animate-spin"/>}
              {isEdit ? "Güncelle" : "Oluştur"}
            </button>
          </div>
        </div>
      </div>
    );
}
