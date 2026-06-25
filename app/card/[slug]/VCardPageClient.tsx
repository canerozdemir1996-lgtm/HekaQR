"use client";
import Link from "next/link";
import { useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import {
  Phone, Mail, Globe, MapPin, Building2,
  Download, Instagram, Linkedin, Twitter, Facebook,
  Youtube, Github, MessageCircle, Share2, Check, ExternalLink,
} from "lucide-react";

export interface VCardData {
  firstName:    string;
  lastName:     string;
  title?:       string;
  company?:     string;
  department?:  string;
  bio?:         string;
  phone?:       string;
  phone2?:      string;
  email?:       string;
  email2?:      string;
  website?:     string;
  websites?:    { label: string; url: string }[];  // multiple websites
  address?:     string;
  city?:        string;
  country?:     string;
  instagram?:   string;
  linkedin?:    string;
  twitter?:     string;
  facebook?:    string;
  youtube?:     string;
  github?:      string;
  whatsapp?:    string;
  avatar?:      string;
  coverImage?:  string;   // banner image (base64 or URL)
  coverColor?:  string;
  accentColor?: string;
  template?:    "classic" | "modern" | "minimal" | "dark" | "gradient" | "executive" | "portrait" | "clean" | "brand" | "soft";
  blocks?:      VCardBlock[];
  leadCaptureEnabled?: boolean;
  leadCaptureTitle?:   string;
  leadCaptureCta?:     string;
  leadCapturePhone?:   boolean;
}

export type VCardBlock =
  | { id: string; type: "text"; title?: string; text: string }
  | { id: string; type: "button"; label: string; url: string; style?: "solid" | "soft" }
  | { id: string; type: "image"; url: string; caption?: string }
  | { id: string; type: "divider" }
  | { id: string; type: "social"; title?: string }
  | { id: string; type: "contact"; title?: string }
  | { id: string; type: "map"; title?: string; query: string };

interface Props {
  qr: { id: string; title: string; short_slug: string; vcard_data: VCardData };
}

function LeadCaptureForm({ qrId, d, t, accent }: { qrId: string; d: VCardData; t: ReturnType<typeof getTheme>; accent: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async () => {
    if (!name.trim() || (!email.trim() && !phone.trim())) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_id: qrId, name: name.trim(), email: email.trim(), phone: phone.trim() }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div style={{ padding: "16px", borderRadius: "16px", background: t.row, border: `1px solid ${t.border}`, textAlign: "center" }}>
        <Check size={18} style={{ color: accent, marginBottom: 6 }} />
        <p style={{ fontSize: "13px", fontWeight: 700, color: t.text, margin: 0 }}>Teşekkürler, bilgileriniz iletildi!</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", borderRadius: "16px", background: t.row, border: `1px solid ${t.border}` }}>
      {d.leadCaptureTitle && (
        <p style={{ fontSize: "13px", fontWeight: 800, color: t.text, margin: "0 0 10px" }}>{d.leadCaptureTitle}</p>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adınız Soyadınız"
          style={{ padding: "10px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontSize: "13px", outline: "none" }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta"
          type="email"
          style={{ padding: "10px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontSize: "13px", outline: "none" }}
        />
        {d.leadCapturePhone && (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefon (opsiyonel)"
            type="tel"
            style={{ padding: "10px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontSize: "13px", outline: "none" }}
          />
        )}
        <button
          onClick={submit}
          disabled={status === "sending" || !name.trim() || !email.trim()}
          style={{ padding: "11px", borderRadius: "10px", background: accent, color: "#fff", border: "none", fontWeight: 800, fontSize: "13px", cursor: "pointer", opacity: status === "sending" ? 0.7 : 1 }}
        >
          {status === "sending" ? "Gönderiliyor..." : (d.leadCaptureCta || "Bilgilerimi Gönder")}
        </button>
        {status === "error" && (
          <p style={{ fontSize: "11px", color: "#dc2626", margin: 0 }}>Gönderilemedi, lütfen tekrar deneyin.</p>
        )}
      </div>
    </div>
  );
}

// VCF generator
function generateVCF(d: VCardData): string {
  const lines = ["BEGIN:VCARD","VERSION:3.0",
    `FN:${d.firstName} ${d.lastName}`.trim(),
    `N:${d.lastName};${d.firstName};;;`];
  if (d.title)    lines.push(`TITLE:${d.title}`);
  if (d.company)  lines.push(`ORG:${d.company}${d.department ? `;${d.department}` : ""}`);
  if (d.phone)    lines.push(`TEL;TYPE=CELL:${d.phone}`);
  if (d.phone2)   lines.push(`TEL;TYPE=WORK:${d.phone2}`);
  if (d.email)    lines.push(`EMAIL;TYPE=WORK:${d.email}`);
  if (d.email2)   lines.push(`EMAIL;TYPE=HOME:${d.email2}`);
  if (d.website)  lines.push(`URL:${d.website}`);
  if (d.linkedin) lines.push(`URL;TYPE=linkedin:${d.linkedin.startsWith("http") ? d.linkedin : "https://linkedin.com/in/"+d.linkedin}`);
  if (d.city || d.country) lines.push(`ADR;TYPE=WORK:;;${d.address??""};${d.city??""};  ;${d.country??""}`);
  if (d.bio)      lines.push(`NOTE:${d.bio}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

const SOCIAL = [
  { key:"linkedin",  Icon:Linkedin,      color:"#0A66C2", label:"LinkedIn",  prefix:"https://linkedin.com/in/" },
  { key:"instagram", Icon:Instagram,     color:"#E1306C", label:"Instagram", prefix:"https://instagram.com/" },
  { key:"twitter",   Icon:Twitter,       color:"#1DA1F2", label:"X / Twitter",prefix:"https://twitter.com/" },
  { key:"facebook",  Icon:Facebook,      color:"#1877F2", label:"Facebook",  prefix:"https://facebook.com/" },
  { key:"youtube",   Icon:Youtube,       color:"#FF0000", label:"YouTube",   prefix:"https://youtube.com/@" },
  { key:"github",    Icon:Github,        color:"#333",    label:"GitHub",    prefix:"https://github.com/" },
  { key:"whatsapp",  Icon:MessageCircle, color:"#25D366", label:"WhatsApp",  prefix:"https://wa.me/" },
] as const;

type Template = NonNullable<VCardData["template"]>;

function getTheme(template: Template, accent: string, cover: string) {
  const a = accent || "#6366f1";
  const c = cover  || "#1e1b4b";
  const themes = {
    modern:   { page:"#0f172a", card:"#1e293b",      cover:a,        coverText:"#fff",
                name:"#f1f5f9", role:"#94a3b8", co:"#64748b",
                text:"#cbd5e1", sub:"#475569",  border:"#334155", row:"#1e293b", rowH:"#273449",
                btn:a,          btnT:"#fff",    social_bg:`${a}18`, social_c:a, social_b:`${a}30` },
    classic:  { page:"#f8fafc", card:"#ffffff",      cover:c,        coverText:"#fff",
                name:"#0f172a", role:"#475569", co:"#64748b",
                text:"#334155", sub:"#94a3b8",  border:"#e2e8f0", row:"#f8fafc", rowH:"#f1f5f9",
                btn:a,          btnT:"#fff",    social_bg:`${a}10`, social_c:a, social_b:`${a}20` },
    minimal:  { page:"#fafafa", card:"#ffffff",      cover:"#f3f4f6",coverText:"#1f2937",
                name:"#111827", role:"#6b7280", co:"#9ca3af",
                text:"#374151", sub:"#9ca3af",  border:"#f3f4f6", row:"#fafafa", rowH:"#f3f4f6",
                btn:"#111827",  btnT:"#fff",    social_bg:"#f3f4f6", social_c:"#374151", social_b:"#e5e7eb" },
    dark:     { page:"#030712", card:"#080f1e",      cover:"#000",   coverText:"#fff",
                name:"#f8fafc", role:"#94a3b8", co:"#475569",
                text:"#cbd5e1", sub:"#1e293b",  border:"#0f172a", row:"#0a1020", rowH:"#0f1a2e",
                btn:a,          btnT:"#fff",    social_bg:`${a}18`, social_c:a, social_b:`${a}25` },
    gradient: { page:`linear-gradient(140deg,${c} 0%,${a} 100%)`, card:"rgba(255,255,255,0.07)",
                cover:"transparent", coverText:"#fff",
                name:"#fff",    role:"rgba(255,255,255,0.7)", co:"rgba(255,255,255,0.5)",
                text:"rgba(255,255,255,0.85)", sub:"rgba(255,255,255,0.3)", border:"rgba(255,255,255,0.1)",
                row:"rgba(255,255,255,0.06)", rowH:"rgba(255,255,255,0.1)",
                btn:"rgba(255,255,255,0.15)", btnT:"#fff",
                social_bg:"rgba(255,255,255,0.1)", social_c:"#fff", social_b:"rgba(255,255,255,0.15)" },
    executive:{ page:"#e8edf3", card:"#ffffff",      cover:"#111827", coverText:"#fff",
                name:"#111827", role:"#4b5563", co:"#6b7280",
                text:"#1f2937", sub:"#9ca3af",  border:"#e5e7eb", row:"#f8fafc", rowH:"#eef2f7",
                btn:a,          btnT:"#fff",    social_bg:`${a}12`, social_c:a, social_b:`${a}24` },
    portrait: { page:"#f5f7fb", card:"#ffffff",      cover:a,        coverText:"#fff",
                name:"#101828", role:"#667085", co:"#98a2b3",
                text:"#344054", sub:"#98a2b3",  border:"#e4e7ec", row:"#f9fafb", rowH:"#f2f4f7",
                btn:"#101828",  btnT:"#fff",    social_bg:"#f2f4f7", social_c:"#344054", social_b:"#e4e7ec" },
    clean:    { page:"#ffffff", card:"#ffffff",      cover:"#ffffff", coverText:"#111827",
                name:"#111827", role:"#6b7280", co:"#9ca3af",
                text:"#374151", sub:"#9ca3af",  border:"#e5e7eb", row:"#ffffff", rowH:"#f9fafb",
                btn:a,          btnT:"#fff",    social_bg:`${a}10`, social_c:a, social_b:`${a}22` },
    brand:    { page:"#08111f", card:"#0b1220",      cover:`linear-gradient(135deg,${a},${c})`, coverText:"#fff",
                name:"#f8fafc", role:"#cbd5e1", co:"#94a3b8",
                text:"#dbeafe", sub:"#64748b",  border:"#1e293b", row:"#111c2f", rowH:"#17243a",
                btn:a,          btnT:"#fff",    social_bg:`${a}20`, social_c:"#dbeafe", social_b:`${a}35` },
    soft:     { page:"#f7f3ff", card:"#ffffff",      cover:"#ede9fe", coverText:"#312e81",
                name:"#1f2937", role:"#6b7280", co:"#8b5cf6",
                text:"#374151", sub:"#a78bfa",  border:"#ede9fe", row:"#fbfaff", rowH:"#f5f3ff",
                btn:a,          btnT:"#fff",    social_bg:"#f5f3ff", social_c:a, social_b:"#ddd6fe" },
  };
  return themes[template] || themes.modern;
}

export default function VCardPageClient({ qr }: Props) {
  const d = qr.vcard_data;
  const tmpl: Template = d.template || "modern";
  const accent = d.accentColor || "#6366f1";
  const cover  = d.coverColor  || "#1e1b4b";
  const t = getTheme(tmpl, accent, cover);
  const layouts: Partial<Record<Template, { coverH: number; avatar: number; radius: number; left: string; align: "center" | "left"; identityTop: number; contact: string }>> = {
    modern: { coverH: 170, avatar: 88, radius: 22, left: "50%", align: "center" as const, identityTop: 56, contact: "list" },
    executive: { coverH: 112, avatar: 82, radius: 18, left: "82px", align: "left" as const, identityTop: 52, contact: "lined" },
    portrait: { coverH: 250, avatar: 96, radius: 24, left: "50%", align: "center" as const, identityTop: 62, contact: "list" },
    clean: { coverH: 82, avatar: 88, radius: 999, left: "50%", align: "center" as const, identityTop: 62, contact: "flat" },
    brand: { coverH: 166, avatar: 88, radius: 24, left: "calc(100% - 78px)", align: "left" as const, identityTop: 28, contact: "grid" },
  };
  const layout = layouts[tmpl] ?? layouts.modern!;

  const [saved, setSaved]   = useState(false);
  const [copied, setCopied] = useState(false);

  const fullName = `${d.firstName || ""} ${d.lastName || ""}`.trim() || "İsimsiz";
  const initials = ((d.firstName?.[0] ?? "") + (d.lastName?.[0] ?? "")).toUpperCase() || "?";

  const downloadVCF = () => {
    const vcf  = generateVCF(d);
    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download:`${fullName.replace(/\s+/g,"-")}.vcf` });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  const share = async () => {
    if (navigator.share) { await navigator.share({ title: fullName, url: window.location.href }).catch(() => {}); return; }
    await copyToClipboard(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const contactItems = [
    d.phone  && { icon:<Phone size={16}/>,  label:"Telefon",     val:d.phone,   href:`tel:${d.phone}` },
    d.phone2 && { icon:<Phone size={16}/>,  label:"İş Tel.",     val:d.phone2,  href:`tel:${d.phone2}` },
    d.email  && { icon:<Mail size={16}/>,   label:"E-posta",     val:d.email,   href:`mailto:${d.email}` },
    d.email2 && { icon:<Mail size={16}/>,   label:"2. E-posta",  val:d.email2,  href:`mailto:${d.email2}` },
    d.website && { icon:<Globe size={16}/>, label:"Web",         val:d.website.replace(/^https?:\/\//,""), href:d.website.startsWith("http")?d.website:"https://"+d.website },
    (d.city||d.address) && { icon:<MapPin size={16}/>, label:"Konum",
      val:[d.address,d.city,d.country].filter(Boolean).join(", "),
      href:`https://maps.google.com?q=${encodeURIComponent([d.address,d.city,d.country].filter(Boolean).join(", "))}` },
  ].filter(Boolean) as { icon:React.ReactNode; label:string; val:string; href:string }[];

  const socialItems = SOCIAL.filter(s => d[s.key as keyof VCardData]);
  const blocks = Array.isArray(d.blocks) ? d.blocks : null;

  return (
    <div style={{ minHeight:"100vh", background:t.page, fontFamily:"'Inter',system-ui,sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start" }}>
      <div style={{ width:"100%", maxWidth:"420px", minHeight:"100vh", display:"flex", flexDirection:"column",
        background:t.card, border:`1px solid ${t.border}`, boxShadow:"0 25px 60px rgba(0,0,0,0.4)" }}>

        {/* Cover + Avatar */}
        <div style={{ position:"relative", height:layout.coverH,
          background: tmpl === "gradient" ? `linear-gradient(140deg,${cover},${accent})` : (tmpl === "minimal" ? t.cover : t.cover),
          flexShrink:0, overflow:"visible" }}>
          {/* clip cover background but not avatar */}
          <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
            {/* Banner image overlay */}
            {d.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.coverImage} alt="banner"
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", zIndex:0 }}/>
            )}
          </div>
          {/* share btn */}
          <button onClick={share}
            style={{ position:"absolute", top:"12px", right:"12px", width:"34px", height:"34px",
              borderRadius:"50%", background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.15)",
              color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2 }}>
            {copied ? <Check size={14}/> : <Share2 size={14}/>}
          </button>
          {/* Avatar */}
          <div style={{ position:"absolute", bottom:-(layout.avatar / 2), left:layout.left, transform:"translateX(-50%)", zIndex:2,
            width:layout.avatar, height:layout.avatar, borderRadius:layout.radius, overflow:"hidden",
            border:`4px solid ${t.card}`,
            background: d.avatar ? undefined : `linear-gradient(135deg,${accent},${cover})`,
            boxShadow:"0 8px 30px rgba(0,0,0,0.35)", flexShrink:0 }}>
            {d.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={d.avatar} alt={fullName} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#fff", fontSize:"28px", fontWeight:900 }}>{initials}</div>}
          </div>
        </div>

        {/* Identity */}
        <div style={{ paddingTop:layout.identityTop, paddingBottom:"20px", paddingLeft:"24px", paddingRight:"24px", textAlign:layout.align }}>
          <h1 style={{ fontSize:"22px", fontWeight:900, color:t.name, margin:0 }}>{fullName}</h1>
          {d.title && <p style={{ fontSize:"14px", color:t.role, marginTop:"4px", fontWeight:500 }}>{d.title}</p>}
          {(d.company || d.department) && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:layout.align === "center" ? "center" : "flex-start", gap:"6px", marginTop:"8px" }}>
              <Building2 size={12} style={{ color:t.co }}/>
              <span style={{ fontSize:"12px", color:t.co }}>
                {d.company}{d.department ? ` · ${d.department}` : ""}
              </span>
            </div>
          )}
          {d.bio && <p style={{ fontSize:"13px", color:t.text, marginTop:"12px", lineHeight:"1.6", opacity:.85 }}>{d.bio}</p>}
        </div>

        {/* Save button */}
        <div style={{ paddingLeft:"20px", paddingRight:"20px", paddingBottom:"16px" }}>
          <button onClick={downloadVCF}
            style={{ width:"100%", padding:"14px", borderRadius:"16px", background:t.btn, color:t.btnT,
              border:"none", fontWeight:800, fontSize:"15px", cursor:"pointer", display:"flex",
              alignItems:"center", justifyContent:"center", gap:"8px", transition:"opacity .15s" }}
            onMouseEnter={e=>(e.currentTarget.style.opacity=".85")}
            onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
            {saved ? <><Check size={17}/> Rehbere Kaydedildi!</> : <><Download size={17}/> Rehbere Kaydet</>}
          </button>
        </div>

        {d.leadCaptureEnabled && (
          <div style={{ paddingLeft:"20px", paddingRight:"20px", paddingBottom:"16px" }}>
            <LeadCaptureForm qrId={qr.id} d={d} t={t} accent={accent} />
          </div>
        )}

        {/* Builder blocks (if present) */}
        {blocks ? (
          <div style={{ padding:"0 16px 20px" }}>
            <div style={{ display:"grid", gap:10 }}>
              {blocks.map((b) => {
                if (b.type === "divider") return <div key={b.id} style={{ height:1, background:t.border, opacity:0.7, margin:"6px 2px" }}/>;
                if (b.type === "text") {
                  return (
                    <div key={b.id} style={{ padding:"12px 12px", borderRadius:"14px", background:t.row, border:`1px solid ${t.border}` }}>
                      {b.title && <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:t.sub, margin:"0 0 8px" }}>{b.title}</p>}
                      <p style={{ fontSize:"13px", fontWeight:600, color:t.text, margin:0, lineHeight:1.6, whiteSpace:"pre-wrap" }} dangerouslySetInnerHTML={{ __html: b.text }} />
                    </div>
                  );
                }
                if (b.type === "button") {
                  const href = (b.url || "").trim();
                  if (!href) return null;
                  const soft = (b.style ?? "solid") === "soft";
                  return (
                    <a key={b.id} href={href} target="_blank" rel="noreferrer"
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px",
                        padding:"12px 12px", borderRadius:"14px",
                        background: soft ? t.row : t.btn,
                        border:`1px solid ${soft ? t.border : "transparent"}`,
                        textDecoration:"none",
                        color: soft ? t.text : t.btnT,
                        fontWeight:900,
                      }}>
                      <span style={{ fontSize:"13px" }}>{b.label || "Bağlantı"}</span>
                      <ExternalLink size={14} style={{ opacity:0.75 }}/>
                    </a>
                  );
                }
                if (b.type === "image") {
                  if (!b.url) return null;
                  return (
                    <div key={b.id} style={{ borderRadius:"16px", overflow:"hidden", background:t.row, border:`1px solid ${t.border}` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.url} alt="" style={{ width:"100%", height:190, objectFit:"cover", display:"block" }}/>
                      {b.caption && <p style={{ margin:0, padding:"10px 12px", fontSize:"12px", color:t.sub, fontWeight:700 }}>{b.caption}</p>}
                    </div>
                  );
                }
                if (b.type === "social") {
                  if (socialItems.length === 0) return null;
                  return (
                    <div key={b.id}>
                      {b.title && <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:t.sub, margin:"0 0 10px" }}>{b.title}</p>}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                        {socialItems.map(s => {
                          const val = d[s.key as keyof VCardData] as string;
                          const href = val?.startsWith("http") ? val : s.prefix + val;
                          return (
                            <a key={s.key} href={href} target="_blank" rel="noreferrer"
                              style={{ display:"flex", alignItems:"center", gap:"7px", padding:"8px 14px",
                                borderRadius:"12px", background:t.social_bg, color:t.social_c,
                                border:`1px solid ${t.social_b}`, textDecoration:"none",
                                fontSize:"12px", fontWeight:700, transition:"opacity .12s" }}
                              onMouseEnter={e=>(e.currentTarget.style.opacity=".75")}
                              onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                              <s.Icon size={14}/> {s.label}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                if (b.type === "contact") {
                  if (contactItems.length === 0) return null;
                  return (
                    <div key={b.id}>
                      {b.title && <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:t.sub, margin:"0 0 10px" }}>{b.title}</p>}
                      <div style={{ display:"grid", gap:6 }}>
                        {contactItems.map((item, i) => (
                          <a key={i} href={item.href}
                            target={item.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                            style={{ display:"flex", alignItems:"center", gap:"12px", padding:"11px 12px",
                              borderRadius:"14px", background:t.row, border:`1px solid ${t.border}`,
                              textDecoration:"none", transition:"background .12s" }}
                            onMouseEnter={e=>(e.currentTarget.style.background=t.rowH)}
                            onMouseLeave={e=>(e.currentTarget.style.background=t.row)}>
                            <div style={{ width:"38px", height:"38px", borderRadius:"12px", flexShrink:0,
                              background:`${accent}18`, color:accent,
                              display:"flex", alignItems:"center", justifyContent:"center" }}>
                              {item.icon}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:t.sub, margin:0 }}>{item.label}</p>
                              <p style={{ fontSize:"13px", fontWeight:600, color:t.text, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.val}</p>
                            </div>
                            <ExternalLink size={12} style={{ color:t.sub, flexShrink:0 }}/>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (b.type === "map") {
                  const q = (b.query || "").trim();
                  if (!q) return null;
                  const src = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
                  return (
                    <div key={b.id} style={{ borderRadius:"16px", overflow:"hidden", background:t.row, border:`1px solid ${t.border}` }}>
                      {b.title && <p style={{ margin:0, padding:"10px 12px", fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:t.sub }}>{b.title}</p>}
                      <iframe title="map" src={src} style={{ width:"100%", height:210, border:0, display:"block" }} loading="lazy" />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Contact */}
            {contactItems.length > 0 && (
              <div style={{ padding:"0 16px 16px", display: layout.contact === "grid" ? "grid" : "block", gridTemplateColumns: layout.contact === "grid" ? "1fr 1fr" : undefined, gap: layout.contact === "grid" ? 8 : undefined }}>
                {contactItems.map((item, i) => (
                  <a key={i} href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", gap:"12px", padding:"11px 12px",
                      borderRadius: layout.contact === "lined" ? "4px" : "14px", background: layout.contact === "flat" ? "transparent" : t.row, border:`1px solid ${layout.contact === "flat" ? "transparent" : t.border}`,
                      borderLeft: layout.contact === "lined" ? `4px solid ${accent}` : undefined,
                      marginBottom:"6px", textDecoration:"none", transition:"background .12s" }}
                    onMouseEnter={e=>(e.currentTarget.style.background=t.rowH)}
                    onMouseLeave={e=>(e.currentTarget.style.background=t.row)}>
                    <div style={{ width:"38px", height:"38px", borderRadius:"12px", flexShrink:0,
                      background:`${accent}18`, color:accent,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {item.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:t.sub, margin:0 }}>{item.label}</p>
                      <p style={{ fontSize:"13px", fontWeight:600, color:t.text, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.val}</p>
                    </div>
                    <ExternalLink size={12} style={{ color:t.sub, flexShrink:0 }}/>
                  </a>
                ))}
              </div>
            )}

            {/* Extra websites */}
            {d.websites && d.websites.length > 0 && (
              <div style={{ padding:"0 16px 16px" }}>
                <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:t.sub, marginBottom:"10px" }}>Web Siteleri</p>
                {d.websites.map((ws, i) => (
                  <a key={i} href={ws.url.startsWith("http") ? ws.url : `https://${ws.url}`}
                    target="_blank" rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", gap:"12px", padding:"11px 12px",
                      borderRadius:"14px", background:t.row, border:`1px solid ${t.border}`,
                      marginBottom:"6px", textDecoration:"none", transition:"background .12s" }}
                    onMouseEnter={e=>(e.currentTarget.style.background=t.rowH)}
                    onMouseLeave={e=>(e.currentTarget.style.background=t.row)}>
                    <div style={{ width:"38px", height:"38px", borderRadius:"12px", flexShrink:0,
                      background:`${accent}18`, color:accent,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Globe size={16}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:t.sub, margin:0 }}>{ws.label || "Website"}</p>
                      <p style={{ fontSize:"13px", fontWeight:600, color:t.text, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ws.url.replace(/^https?:\/\//,"")}</p>
                    </div>
                    <ExternalLink size={12} style={{ color:t.sub, flexShrink:0 }}/>
                  </a>
                ))}
              </div>
            )}

            {/* Social */}
            {socialItems.length > 0 && (
              <div style={{ padding:"0 16px 20px" }}>
                <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:t.sub, marginBottom:"10px" }}>Sosyal Medya</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                  {socialItems.map(s => {
                    const val = d[s.key as keyof VCardData] as string;
                    const href = val?.startsWith("http") ? val : s.prefix + val;
                    return (
                      <a key={s.key} href={href} target="_blank" rel="noreferrer"
                        style={{ display:"flex", alignItems:"center", gap:"7px", padding:"8px 14px",
                          borderRadius:"12px", background:t.social_bg, color:t.social_c,
                          border:`1px solid ${t.social_b}`, textDecoration:"none",
                          fontSize:"12px", fontWeight:700, transition:"opacity .12s" }}
                        onMouseEnter={e=>(e.currentTarget.style.opacity=".75")}
                        onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                        <s.Icon size={14}/> {s.label}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop:"auto", padding:"14px 24px", textAlign:"center",
          borderTop:`1px solid ${t.border}` }}>
          <p style={{ fontSize:"11px", color:t.sub }}>
            QR Hub ile oluşturuldu ·{" "}
            <Link href="/" style={{ color:accent, textDecoration:"none" }}>qrhub.app</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
