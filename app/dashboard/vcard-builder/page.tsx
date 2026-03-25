"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, LayoutGrid, Type, Link2, Image as ImageIcon, Minus, MapPin, Share2,
  ChevronUp, ChevronDown, Trash2, Save, Loader2, Sun, Moon, Check,
} from "lucide-react";
import { sanitizeHtml } from "@/lib/utils/htmlSanitizer";
import { useTheme } from "@/lib/theme";
import { fetchQrCode, updateQrCode } from "@/lib/supabase";
import type { VCardData, VCardBlock } from "@/app/card/[slug]/VCardPageClient";
import { useToast } from "@/components/toast";

function rid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function normalizeUrl(u: string) {
  const s = (u || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("mailto:") || s.startsWith("tel:")) return s;
  return "https://" + s;
}

const DEFAULT_BLOCKS: VCardBlock[] = [
  { id: rid(), type: "text", title: "Hakkımda", text: "Kısa bir açıklama yazın…" },
  { id: rid(), type: "button", label: "Web sitemi ziyaret et", url: "https://example.com", style: "solid" },
  { id: rid(), type: "social", title: "Sosyal Medya" },
];

export default function VCardBuilderPage() {
  return (
    <Suspense fallback={<VCardBuilderSkeleton />}>
      <VCardBuilderInner />
    </Suspense>
  );
}

function VCardBuilderSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000]">
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-xl p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">vCard Builder yükleniyor…</p>
          <p className="text-xs text-gray-500 mt-1">Birazdan editör açılacak.</p>
        </div>
      </div>
    </div>
  );
}

function VCardBuilderInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";

  const id = sp.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrTitle, setQrTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [v, setV] = useState<VCardData | null>(null);
  const [blocks, setBlocks] = useState<VCardBlock[]>([]);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    fetchQrCode(id)
      .then(qr => {
        setQrTitle(qr.title);
        setSlug(qr.short_slug);
        const d = (qr.vcard_data ?? null) as VCardData | null;
        if (!d) throw new Error("Bu QR bir vCard değil.");
        const b = Array.isArray(d.blocks) ? (d.blocks as VCardBlock[]) : DEFAULT_BLOCKS;
        setV(d);
        setBlocks(b);
        setSel(b[0]?.id ?? null);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yüklenemedi"))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const selected = useMemo(() => blocks.find(b => b.id === sel) ?? null, [blocks, sel]);

  const addBlock = (type: VCardBlock["type"]) => {
    const b: VCardBlock =
      type === "text" ? { id: rid(), type: "text", title: "Başlık", text: "Metin…" }
      : type === "button" ? { id: rid(), type: "button", label: "Buton", url: "https://", style: "solid" }
      : type === "image" ? { id: rid(), type: "image", url: "", caption: "" }
      : type === "divider" ? { id: rid(), type: "divider" }
      : type === "map" ? { id: rid(), type: "map", title: "Konum", query: "İstanbul" }
      : type === "contact" ? { id: rid(), type: "contact", title: "İletişim" }
      : { id: rid(), type: "social", title: "Sosyal Medya" };
    setBlocks(p => [...p, b]);
    setSel(b.id);
  };

  const move = (id0: string, dir: -1 | 1) => {
    setBlocks(p => {
      const i = p.findIndex(x => x.id === id0);
      if (i < 0) return p;
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      const tmp = n[i]; n[i] = n[j]; n[j] = tmp;
      return n;
    });
  };

  const remove = (id0: string) => {
    setBlocks(p => p.filter(x => x.id !== id0));
    if (sel === id0) setSel(null);
  };

  const save = async () => {
    if (!id || !v) return;
    setSaving(true);
    try {
      const clean = blocks.map(b => {
        if (b.type === "button") return { ...b, url: normalizeUrl(b.url) };
        if (b.type === "image") return { ...b, url: (b.url || "").trim() };
        if (b.type === "map") return { ...b, query: (b.query || "").trim() };
        if (b.type === "text") return { ...b, title: (b.title || "").trim(), text: sanitizeHtml((b.text || "").trim()) };
        if (b.type === "social") return { ...b, title: (b.title || "").trim() };
        return b;
      }).filter(b => {
        if (b.type === "image") return !!b.url;
        if (b.type === "button") return !!b.url;
        if (b.type === "text") return !!b.text;
        if (b.type === "map") return !!b.query;
        return true;
      });
      const next: VCardData = { ...v, blocks: clean };
      await updateQrCode(id, { vcard_data: next });
      setV(next);
      toast.success("vCard builder kaydedildi.", "Başarılı");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kaydedilemedi", "Hata");
    } finally {
      setSaving(false);
    }
  };

  const bg = "bg-[#fafafa] dark:bg-[#000000] transition-colors";
  const surface = isDark ? "bg-[#0a0a0a] border-[#333] shadow-sm" : "bg-white border-gray-200 shadow-sm";
  const tx = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-gray-500" : "text-gray-500";
  const input = isDark
    ? "bg-[#111] border-[#333] text-white placeholder:text-gray-600 focus:border-white"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-black";

  const phoneName = v ? `${v.firstName || ""} ${v.lastName || ""}`.trim() : "";
  const phoneTitle = v?.title || "";
  const accent = v?.accentColor || "#7c3aed";
  const cover = v?.coverColor || "#111827";
  const pnlCls = `rounded-xl border p-4 shadow-sm ${isDark ? "border-[#333] bg-[#111]" : "border-gray-200 bg-white"}`;

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 border-b ${isDark ? "bg-[#000000]/80 border-[#333]" : "bg-white/80 border-gray-200"} backdrop-blur-md px-6 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-1.5 text-sm font-medium ${sub} hover:text-black dark:hover:text-white transition-colors`}>
            <ArrowLeft size={16}/> Dashboard
          </button>
          <span className={isDark ? "text-[#333]" : "text-gray-200"}>|</span>
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub}`}>VCARD BUILDER</p>
            <p className={`text-sm font-semibold truncate ${tx}`}>{qrTitle || "vCard"}</p>
          </div>
          {slug && (
            <Link href={`/card/${slug}`} target="_blank" className="ml-2 text-xs font-mono text-gray-500 hover:text-black dark:hover:text-white transition-colors">
              /card/{slug}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme}
            className={`p-2 rounded-lg border transition-colors ${isDark ? "border-[#333] text-gray-400 hover:bg-[#222]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
            {isDark ? <Sun size={16}/> : <Moon size={16}/>}
          </button>
          <button onClick={save} disabled={saving || loading || !v}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
            Kaydet
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-12 gap-5">
        {/* Left: blocks */}
        <aside className={`col-span-12 lg:col-span-3 rounded-xl border ${surface} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${tx}`}>Bloklar</p>
              <p className={`text-xs ${sub}`}>Ekle & sırala</p>
            </div>
            <LayoutGrid size={16} className={sub}/>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-5">
            {[
              { t: "text", label: "Text", icon: <Type size={14}/> },
              { t: "button", label: "Button", icon: <Link2 size={14}/> },
              { t: "image", label: "Image", icon: <ImageIcon size={14}/> },
              { t: "divider", label: "Divider", icon: <Minus size={14}/> },
              { t: "map", label: "Map", icon: <MapPin size={14}/> },
              { t: "social", label: "Social", icon: <Share2 size={14}/> },
              { t: "contact", label: "Contact", icon: <MapPin size={14}/> },
            ].map(x => (
              <button key={x.t} onClick={() => addBlock(x.t as any)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${isDark ? "border-[#333] text-gray-300 hover:bg-[#111]" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                {x.icon}{x.label}
              </button>
            ))}
          </div>

          <div className={`mt-5 h-px ${isDark ? "bg-[#333]" : "bg-gray-200"}`} />

          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="animate-spin text-gray-400 mx-auto" size={20}/>
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {blocks.map((b, i) => {
                const active = b.id === sel;
                return (
                  <button key={b.id} onClick={() => setSel(b.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${active ? (isDark ? "border-white bg-[#222] text-white" : "border-black bg-gray-100 text-black") : isDark ? "border-[#333] text-gray-400 hover:border-gray-500" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                    <span className={`text-[11px] font-semibold w-5 ${active ? (isDark ? "text-white" : "text-black") : sub}`}>{i + 1}</span>
                    <span className="text-xs font-medium capitalize flex-1 truncate">{b.type}</span>
                    <span className={`text-[10px] ${sub} truncate max-w-[80px]`}>{b.type === "text" ? (b.title || "Text") : b.type === "button" ? (b.label || "Button") : ""}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <span onMouseDown={(e) => { e.stopPropagation(); move(b.id, -1); }} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#333]"><ChevronUp size={14}/></span>
                      <span onMouseDown={(e) => { e.stopPropagation(); move(b.id, 1); }} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#333]"><ChevronDown size={14}/></span>
                      <span onMouseDown={(e) => { e.stopPropagation(); remove(b.id); }} className="p-1 rounded hover:bg-red-50 text-red-500 dark:hover:bg-red-500/10 transition-colors"><Trash2 size={14}/></span>
                    </div>
                  </button>
                );
              })}
              {blocks.length === 0 && (
                <p className={`text-sm ${sub} text-center py-10`}>Blok ekleyerek başlayın.</p>
              )}
            </div>
          )}
        </aside>

        {/* Center: phone preview */}
        <section className={`col-span-12 lg:col-span-6 rounded-xl ${surface} p-5 flex flex-col`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${tx}`}>Cihaz Önizlemesi</p>
              <p className={`text-xs ${sub}`}>Canlı görünüm</p>
            </div>
          </div>

          <div className="mt-8 flex justify-center flex-1">
            <div className={`w-[360px] max-w-full rounded-[3rem] p-3 ${isDark ? "bg-[#111] border-[#333]" : "bg-gray-100 border-gray-200"} border shadow-xl`}>
              <div className={`rounded-[2.25rem] overflow-hidden border ${isDark ? "border-[#333]" : "border-gray-200"}`} style={{ background: isDark ? "#000" : "#fff", height: '100%', minHeight: '600px' }}>
                {/* cover */}
                <div style={{ height: 150, background: `linear-gradient(140deg, ${cover}, ${accent})` }} />
                {/* avatar */}
                <div className="px-5 -mt-10">
                  <div className="w-20 h-20 rounded-full border-4 border-white dark:border-black bg-gray-100 dark:bg-[#222] overflow-hidden flex items-center justify-center shadow-sm">
                    {v?.avatar ? (
                      <Image src={v.avatar} alt="avatar" width={80} height={80} className="w-20 h-20 object-cover" unoptimized />
                    ) : (
                      <span className="text-gray-500 font-bold text-xl">{(phoneName?.[0] ?? "U").toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3">
                  <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{phoneName || "İsimsiz"}</p>
                  {phoneTitle && <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{phoneTitle}</p>}
                  {v?.bio && <p className={`text-xs mt-2 leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>{v.bio}</p>}

                  <div className="mt-5 space-y-3">
                    {blocks.map((b) => {
                      if (b.type === "divider") return <div key={b.id} className={`h-px ${isDark ? "bg-[#333]" : "bg-gray-100"} my-3`} />;
                      if (b.type === "text") {
                        return (
                          <div key={b.id} className={`rounded-xl border p-4 ${isDark ? "border-[#333] bg-[#0a0a0a]" : "border-gray-200 bg-white"} shadow-sm`}>
                            {b.title && <p className={`text-[11px] font-semibold tracking-wider uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>{b.title}</p>}
                            <p className={`text-sm mt-1.5 whitespace-pre-wrap ${isDark ? "text-gray-300" : "text-gray-700"}`}>{b.text}</p>
                          </div>
                        );
                      }
                      if (b.type === "button") {
                        return (
                          <div key={b.id} className={`rounded-xl px-4 py-3.5 flex items-center justify-between font-medium text-sm transition-colors cursor-pointer ${
                            (b.style ?? "solid") === "soft"
                              ? isDark ? "border border-[#333] bg-[#111] text-white hover:bg-[#222]" : "border border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100"
                              : isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                          }`}>
                            <span>{b.label || "Buton"}</span>
                            <span className="opacity-60">↗</span>
                          </div>
                        );
                      }
                      if (b.type === "image") {
                        if (!b.url) return null;
                        return (
                          <div key={b.id} className={`rounded-xl overflow-hidden border ${isDark ? "border-[#333] bg-[#0a0a0a]" : "border-gray-200 bg-gray-50"} shadow-sm`}>
                            <Image src={b.url} alt="" width={320} height={180} className="w-full h-48 object-cover" unoptimized />
                            {b.caption && <p className={`text-[11px] px-3 py-2.5 font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>{b.caption}</p>}
                          </div>
                        );
                      }
                      if (b.type === "social") {
                        return (
                          <div key={b.id} className={`rounded-xl border p-4 ${isDark ? "border-[#333] bg-[#0a0a0a]" : "border-gray-200 bg-white"} shadow-sm`}>
                            <p className={`text-[11px] font-semibold tracking-wider uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>{b.title || "Sosyal"}</p>
                            <div className="mt-3 flex gap-2">
                              {["in", "ig", "x", "yt"].map(k => (
                                <div key={k} className={`w-10 h-10 rounded-lg flex items-center justify-center font-medium text-xs ${isDark ? "bg-[#222] text-gray-300" : "bg-gray-100 text-gray-600"}`}>{k}</div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      if (b.type === "contact") {
                        return (
                          <div key={b.id} className={`rounded-xl border p-4 ${isDark ? "border-[#333] bg-[#0a0a0a]" : "border-gray-200 bg-white"} shadow-sm`}>
                            <p className={`text-[11px] font-semibold tracking-wider uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>{b.title || "İletişim"}</p>
                            <div className="mt-3 space-y-2">
                              <div className={`rounded-lg px-3 py-2.5 text-xs font-medium border ${isDark ? "border-[#333] bg-[#111] text-gray-300" : "border-gray-200 bg-gray-50 text-gray-700"}`}>Telefon Numarası</div>
                              <div className={`rounded-lg px-3 py-2.5 text-xs font-medium border ${isDark ? "border-[#333] bg-[#111] text-gray-300" : "border-gray-200 bg-gray-50 text-gray-700"}`}>E-posta Adresi</div>
                              <div className={`rounded-lg px-3 py-2.5 text-xs font-medium border ${isDark ? "border-[#333] bg-[#111] text-gray-300" : "border-gray-200 bg-gray-50 text-gray-700"}`}>Web Sitesi</div>
                            </div>
                          </div>
                        );
                      }
                      if (b.type === "map") {
                        return (
                          <div key={b.id} className={`rounded-xl border p-4 ${isDark ? "border-[#333] bg-[#0a0a0a]" : "border-gray-200 bg-white"} shadow-sm`}>
                            <p className={`text-[11px] font-semibold tracking-wider uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>{b.title || "Konum"}</p>
                            <p className={`text-sm mt-1.5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{b.query}</p>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: inspector */}
        <aside className={`col-span-12 lg:col-span-3 rounded-xl border ${surface} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${tx}`}>Ayarlar</p>
              <p className={`text-xs ${sub}`}>Seçili blok detayı</p>
            </div>
            {selected ? <span className={`text-[11px] font-mono px-2 py-1 bg-gray-100 dark:bg-[#222] rounded-md ${sub}`}>{selected.type}</span> : <span className={`text-[11px] ${sub}`}>—</span>}
          </div>

          {!v ? (
            <div className="py-10 text-center">
              <p className={`text-sm ${sub}`}>{id ? "vCard yükleniyor…" : "Bu sayfa için ?id= parametresi gerekli."}</p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {/* Theme */}
              <div className={pnlCls}>
                <p className={`text-xs font-semibold ${tx}`}>Tema Renkleri</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <label className={`text-[11px] font-medium ${sub}`}>Vurgu</label>
                  <label className={`text-[11px] font-medium ${sub}`}>Kapak</label>
                  <input type="color" value={v.accentColor || "#7c3aed"} onChange={(e) => setV(p => p ? ({ ...p, accentColor: e.target.value }) : p)} className="w-full h-9 rounded-md border border-gray-200 dark:border-[#333] bg-transparent cursor-pointer p-0.5"/>
                  <input type="color" value={v.coverColor || "#111827"} onChange={(e) => setV(p => p ? ({ ...p, coverColor: e.target.value }) : p)} className="w-full h-9 rounded-md border border-gray-200 dark:border-[#333] bg-transparent cursor-pointer p-0.5"/>
                </div>
                <div className="mt-4">
                  <label className={`text-xs font-medium ${sub} block mb-1.5`}>Bio (opsiyonel)</label>
                  <textarea value={v.bio || ""} onChange={(e) => setV(p => p ? ({ ...p, bio: e.target.value }) : p)}
                    rows={3}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors resize-none ${input}`}
                    placeholder="Kısa açıklama…" />
                </div>
              </div>

              {/* Block inspector */}
              {!selected ? (
                <div className={pnlCls}>
                  <p className={`text-sm ${sub}`}>Soldan bir blok seçerek düzenlemeye başlayın.</p>
                </div>
              ) : selected.type === "text" ? (
                <div className={pnlCls}>
                  <label className={`text-xs font-medium ${sub} mb-1.5 block`}>Başlık</label>
                  <input value={selected.title || ""} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, title: e.target.value }) : b))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${input}`} />
                  <label className={`text-xs font-medium ${sub} mt-4 mb-1.5 block`}>Metin</label>
                  <textarea value={selected.text} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, text: e.target.value }) : b))}
                    rows={6}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${input}`} />
                </div>
              ) : selected.type === "button" ? (
                <div className={pnlCls}>
                  <label className={`text-xs font-medium ${sub} mb-1.5 block`}>Buton Metni</label>
                  <input value={selected.label} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, label: e.target.value }) : b))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${input}`} />
                  <label className={`text-xs font-medium ${sub} mt-4 mb-1.5 block`}>Yönlenecek URL</label>
                  <input value={selected.url} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, url: e.target.value }) : b))}
                    placeholder="https://..."
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${input} font-mono`} />
                  <div className="mt-4 flex gap-2">
                    {(["solid","soft"] as const).map(s => (
                      <button key={s} onClick={() => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, style: s }) : b))}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          (selected.style ?? "solid") === s
                            ? isDark ? "border-white bg-[#222] text-white" : "border-black bg-gray-100 text-black"
                            : isDark ? "border-[#333] text-gray-400 hover:border-gray-500" : "border-gray-200 text-gray-600 hover:border-gray-400"
                        }`}>
                        {s === "solid" ? "Solid" : "Soft"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : selected.type === "image" ? (
                <div className={pnlCls}>
                  <label className={`text-xs font-medium ${sub} mb-1.5 block`}>Görsel URL (Image URL)</label>
                  <input value={selected.url} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, url: e.target.value }) : b))}
                    placeholder="https://..."
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${input} font-mono`} />
                  <label className={`text-xs font-medium ${sub} mt-4 mb-1.5 block`}>Açıklama (Caption)</label>
                  <input value={selected.caption || ""} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, caption: e.target.value }) : b))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${input}`} />
                </div>
              ) : selected.type === "map" ? (
                <div className={pnlCls}>
                  <label className={`text-xs font-medium ${sub} mb-1.5 block`}>Başlık</label>
                  <input value={selected.title || ""} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, title: e.target.value }) : b))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${input}`} />
                  <label className={`text-xs font-medium ${sub} mt-4 mb-1.5 block`}>Adres / Yer Adı (Arama)</label>
                  <input value={selected.query} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, query: e.target.value }) : b))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${input}`} />
                </div>
              ) : selected.type === "social" ? (
                <div className={pnlCls}>
                  <label className={`text-xs font-medium ${sub} mb-1.5 block`}>Başlık</label>
                  <input value={selected.title || ""} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, title: e.target.value }) : b))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${input}`} />
                  <p className={`text-[11px] mt-3 ${sub}`}>Sosyal linkler, vCard ayarlarındaki Instagram/LinkedIn vb alanlarından otomatik okunur.</p>
                </div>
              ) : selected.type === "contact" ? (
                <div className={pnlCls}>
                  <label className={`text-xs font-medium ${sub} mb-1.5 block`}>Başlık</label>
                  <input value={selected.title || ""} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, title: e.target.value }) : b))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${input}`} />
                  <p className={`text-[11px] mt-3 ${sub}`}>Bu blok; profil kısmındaki telefon/e‑posta/web alanlarını buton olarak listeler.</p>
                </div>
              ) : (
                <div className={pnlCls}>
                  <p className={`text-xs ${sub}`}>Bu blok için ayar yok.</p>
                </div>
              )}

              <div className={pnlCls}>
                <p className={`text-xs font-semibold ${tx}`}>İpucu</p>
                <p className={`text-xs mt-1 ${sub}`}>Kaydettikten sonra vCard bağlantınız güncellenecektir.</p>
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => toast.info("Blokları soldan ekleyip sağdan düzenleyebilirsin.")}
                    className={`px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${isDark ? "border-[#333] text-gray-300 hover:bg-[#111]" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                    Anladım
                  </button>
                  <button onClick={() => { toast.success("Kaydetmeyi unutma."); }}
                    className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm">
                    <Check size={14}/> Tamam
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
