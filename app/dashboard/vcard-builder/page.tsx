"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, LayoutGrid, Type, Link2, Image as ImageIcon, Minus, MapPin, Share2,
  ChevronUp, ChevronDown, Trash2, Save, Loader2, Sun, Moon, Check,
} from "lucide-react";
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
    <div className="min-h-screen app-bg">
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="surface border border-white/10 rounded-2xl p-6">
          <p className="text-sm font-black text-slate-100">vCard Builder yükleniyor…</p>
          <p className="text-xs text-slate-500 mt-1">Birazdan editör açılacak.</p>
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
        if (b.type === "text") return { ...b, title: (b.title || "").trim(), text: (b.text || "").trim() };
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

  const bg = "app-bg";
  const surface = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";
  const input = isDark
    ? "bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-600 focus-premium"
    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-premium";

  const phoneName = v ? `${v.firstName || ""} ${v.lastName || ""}`.trim() : "";
  const phoneTitle = v?.title || "";
  const accent = v?.accentColor || "#7c3aed";
  const cover = v?.coverColor || "#111827";

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 border-b ${isDark ? "glass-dark border-white/10" : "glass-light border-slate-200"} backdrop-blur-2xl px-6 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-1.5 text-sm ${sub} hover:text-violet-400 transition-colors`}>
            <ArrowLeft size={14}/> Dashboard
          </button>
          <span className={isDark ? "text-slate-700" : "text-slate-300"}>|</span>
          <div className="min-w-0">
            <p className={`text-[10px] font-black tracking-widest ${sub}`}>VCARD BUILDER</p>
            <p className={`text-sm font-black truncate ${tx}`}>{qrTitle || "vCard"}</p>
          </div>
          {slug && (
            <Link href={`/card/${slug}`} target="_blank" className="ml-2 text-xs text-violet-400 hover:text-violet-300 font-mono">
              /card/{slug}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-yellow-300" : "border-slate-200 text-slate-500 hover:text-slate-700"}`}>
            {isDark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          <button onClick={save} disabled={saving || loading || !v}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all btn-premium focus-premium disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            Kaydet
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-12 gap-5">
        {/* Left: blocks */}
        <aside className={`col-span-12 lg:col-span-3 rounded-2xl ${surface} p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[10px] font-black tracking-widest ${sub}`}>BLOKLAR</p>
              <p className={`text-sm font-black ${tx}`}>Ekle & sırala</p>
            </div>
            <LayoutGrid size={16} className="text-violet-400"/>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
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
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${isDark ? "border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.03]" : "border-slate-200 text-slate-700 hover:bg-white"}`}>
                {x.icon}{x.label}
              </button>
            ))}
          </div>

          <div className={`mt-4 h-px ${isDark ? "bg-white/10" : "bg-slate-200"}`} />

          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="animate-spin text-violet-400 mx-auto" size={18}/>
              <p className={`text-xs mt-2 ${sub}`}>Yükleniyor…</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {blocks.map((b, i) => {
                const active = b.id === sel;
                return (
                  <button key={b.id} onClick={() => setSel(b.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${active ? "border-violet-500/50 bg-violet-500/10 text-violet-200" : isDark ? "border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.03]" : "border-slate-200 text-slate-700 hover:bg-white"}`}>
                    <span className={`text-[10px] font-black w-6 ${active ? "text-violet-300" : sub}`}>{i + 1}</span>
                    <span className="text-xs font-bold capitalize">{b.type}</span>
                    <span className={`ml-auto text-[10px] ${sub}`}>{b.type === "text" ? (b.title || "Text") : b.type === "button" ? (b.label || "Button") : ""}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <span onMouseDown={(e) => { e.stopPropagation(); move(b.id, -1); }} className="p-1 rounded hover:bg-white/5"><ChevronUp size={14}/></span>
                      <span onMouseDown={(e) => { e.stopPropagation(); move(b.id, 1); }} className="p-1 rounded hover:bg-white/5"><ChevronDown size={14}/></span>
                      <span onMouseDown={(e) => { e.stopPropagation(); remove(b.id); }} className="p-1 rounded hover:bg-red-500/10 text-red-400"><Trash2 size={14}/></span>
                    </div>
                  </button>
                );
              })}
              {blocks.length === 0 && (
                <p className={`text-xs ${sub} text-center py-10`}>Blok ekleyerek başlayın.</p>
              )}
            </div>
          )}
        </aside>

        {/* Center: phone preview */}
        <section className={`col-span-12 lg:col-span-6 rounded-2xl ${surface} p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[10px] font-black tracking-widest ${sub}`}>ÖNİZLEME</p>
              <p className={`text-sm font-black ${tx}`}>Telefon görünümü</p>
            </div>
            <span className={`text-[11px] ${sub}`}>Canlı</span>
          </div>

          <div className="mt-4 flex justify-center">
            <div className={`w-[360px] max-w-full rounded-[42px] p-3 ${isDark ? "bg-black/40" : "bg-slate-100"} border ${isDark ? "border-white/10" : "border-slate-200"} shadow-2xl`}>
              <div className="rounded-[34px] overflow-hidden border border-white/10" style={{ background: isDark ? "#050613" : "#f8fafc" }}>
                {/* cover */}
                <div style={{ height: 150, background: `linear-gradient(140deg, ${cover}, ${accent})` }} />
                {/* avatar */}
                <div className="px-5 -mt-10">
                  <div className="w-20 h-20 rounded-3xl border-4 border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
                    {v?.avatar ? (
                      <Image src={v.avatar} alt="avatar" width={80} height={80} className="w-20 h-20 object-cover" unoptimized />
                    ) : (
                      <span className="text-white font-black text-xl">{(phoneName?.[0] ?? "U").toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3">
                  <p className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>{phoneName || "İsimsiz"}</p>
                  {phoneTitle && <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>{phoneTitle}</p>}
                  {v?.bio && <p className={`text-xs mt-2 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>{v.bio}</p>}

                  <div className="mt-4 space-y-2">
                    {blocks.map((b) => {
                      if (b.type === "divider") return <div key={b.id} className={`h-px ${isDark ? "bg-white/10" : "bg-slate-200"} my-2`} />;
                      if (b.type === "text") {
                        return (
                          <div key={b.id} className={`rounded-2xl border p-3 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"}`}>
                            {b.title && <p className={`text-[10px] font-black tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>{b.title}</p>}
                            <p className={`text-xs mt-1 whitespace-pre-wrap ${isDark ? "text-slate-200" : "text-slate-700"}`}>{b.text}</p>
                          </div>
                        );
                      }
                      if (b.type === "button") {
                        return (
                          <div key={b.id} className={`rounded-2xl px-4 py-3 flex items-center justify-between font-black text-sm ${
                            (b.style ?? "solid") === "soft"
                              ? isDark ? "border border-white/10 bg-white/[0.04] text-slate-100" : "border border-slate-200 bg-white text-slate-900"
                              : "btn-premium text-white"
                          }`}>
                            <span>{b.label || "Buton"}</span>
                            <span className="opacity-80">↗</span>
                          </div>
                        );
                      }
                      if (b.type === "image") {
                        if (!b.url) return null;
                        return (
                          <div key={b.id} className={`rounded-2xl overflow-hidden border ${isDark ? "border-white/10" : "border-slate-200"} bg-white/5`}>
                            <Image src={b.url} alt="" width={320} height={180} className="w-full h-40 object-cover" unoptimized />
                            {b.caption && <p className={`text-[11px] px-3 py-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{b.caption}</p>}
                          </div>
                        );
                      }
                      if (b.type === "social") {
                        return (
                          <div key={b.id} className={`rounded-2xl border p-3 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"}`}>
                            <p className={`text-[10px] font-black tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>{b.title || "Sosyal"}</p>
                            <div className="mt-2 flex gap-2">
                              {["in", "ig", "x", "yt"].map(k => (
                                <div key={k} className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>{k}</div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      if (b.type === "contact") {
                        return (
                          <div key={b.id} className={`rounded-2xl border p-3 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"}`}>
                            <p className={`text-[10px] font-black tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>{b.title || "İletişim"}</p>
                            <div className="mt-2 space-y-2">
                              <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>Telefon</div>
                              <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>E-posta</div>
                              <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>Web</div>
                            </div>
                          </div>
                        );
                      }
                      if (b.type === "map") {
                        return (
                          <div key={b.id} className={`rounded-2xl border p-3 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"}`}>
                            <p className={`text-[10px] font-black tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>{b.title || "Konum"}</p>
                            <p className={`text-xs mt-1 ${isDark ? "text-slate-200" : "text-slate-700"}`}>{b.query}</p>
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
        <aside className={`col-span-12 lg:col-span-3 rounded-2xl ${surface} p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[10px] font-black tracking-widest ${sub}`}>AYARLAR</p>
              <p className={`text-sm font-black ${tx}`}>Seçili blok</p>
            </div>
            {selected ? <span className={`text-[11px] ${sub}`}>{selected.type}</span> : <span className={`text-[11px] ${sub}`}>—</span>}
          </div>

          {!v ? (
            <div className="py-10 text-center">
              <p className={`text-xs ${sub}`}>{id ? "vCard yükleniyor…" : "Bu sayfa için ?id= parametresi gerekli."}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* Theme */}
              <div className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
                <p className={`text-[10px] font-black tracking-widest ${sub}`}>TEMA</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className={`text-xs font-bold ${sub}`}>Accent</label>
                  <label className={`text-xs font-bold ${sub}`}>Cover</label>
                  <input type="color" value={v.accentColor || "#7c3aed"} onChange={(e) => setV(p => p ? ({ ...p, accentColor: e.target.value }) : p)} className="w-full h-10 rounded-xl border border-white/10 bg-white/5"/>
                  <input type="color" value={v.coverColor || "#111827"} onChange={(e) => setV(p => p ? ({ ...p, coverColor: e.target.value }) : p)} className="w-full h-10 rounded-xl border border-white/10 bg-white/5"/>
                </div>
                <div className="mt-2">
                  <label className={`text-xs font-bold ${sub}`}>Bio (opsiyonel)</label>
                  <textarea value={v.bio || ""} onChange={(e) => setV(p => p ? ({ ...p, bio: e.target.value }) : p)}
                    rows={3}
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input}`}
                    placeholder="Kısa açıklama…" />
                </div>
              </div>

              {/* Block inspector */}
              {!selected ? (
                <div className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
                  <p className={`text-xs ${sub}`}>Soldan bir blok seç.</p>
                </div>
              ) : selected.type === "text" ? (
                <div className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
                  <label className={`text-xs font-bold ${sub}`}>Başlık</label>
                  <input value={selected.title || ""} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, title: e.target.value }) : b))}
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input}`} />
                  <label className={`text-xs font-bold ${sub} mt-3 block`}>Metin</label>
                  <textarea value={selected.text} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, text: e.target.value }) : b))}
                    rows={6}
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input}`} />
                </div>
              ) : selected.type === "button" ? (
                <div className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
                  <label className={`text-xs font-bold ${sub}`}>Label</label>
                  <input value={selected.label} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, label: e.target.value }) : b))}
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input}`} />
                  <label className={`text-xs font-bold ${sub} mt-3 block`}>URL</label>
                  <input value={selected.url} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, url: e.target.value }) : b))}
                    placeholder="https://..."
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input} font-mono`} />
                  <div className="mt-3 flex gap-2">
                    {(["solid","soft"] as const).map(s => (
                      <button key={s} onClick={() => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, style: s }) : b))}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                          (selected.style ?? "solid") === s
                            ? "border-violet-500/50 bg-violet-500/10 text-violet-200"
                            : isDark ? "border-white/10 text-slate-400 hover:border-white/20" : "border-slate-200 text-slate-600"
                        }`}>
                        {s === "solid" ? "Solid" : "Soft"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : selected.type === "image" ? (
                <div className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
                  <label className={`text-xs font-bold ${sub}`}>Image URL</label>
                  <input value={selected.url} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, url: e.target.value }) : b))}
                    placeholder="https://..."
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input} font-mono`} />
                  <label className={`text-xs font-bold ${sub} mt-3 block`}>Caption</label>
                  <input value={selected.caption || ""} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, caption: e.target.value }) : b))}
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input}`} />
                </div>
              ) : selected.type === "map" ? (
                <div className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
                  <label className={`text-xs font-bold ${sub}`}>Başlık</label>
                  <input value={selected.title || ""} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, title: e.target.value }) : b))}
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input}`} />
                  <label className={`text-xs font-bold ${sub} mt-3 block`}>Arama (adres / yer adı)</label>
                  <input value={selected.query} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, query: e.target.value }) : b))}
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input}`} />
                </div>
              ) : selected.type === "social" ? (
                <div className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
                  <label className={`text-xs font-bold ${sub}`}>Başlık</label>
                  <input value={selected.title || ""} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, title: e.target.value }) : b))}
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input}`} />
                  <p className={`text-[11px] mt-2 ${sub}`}>Sosyal linkler, vCard içindeki Instagram/LinkedIn vb alanlarından okunur.</p>
                </div>
              ) : selected.type === "contact" ? (
                <div className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
                  <label className={`text-xs font-bold ${sub}`}>Başlık</label>
                  <input value={selected.title || ""} onChange={(e) => setBlocks(p => p.map(b => b.id === selected.id ? ({ ...b, title: e.target.value }) : b))}
                    className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all ${input}`} />
                  <p className={`text-[11px] mt-2 ${sub}`}>Bu blok; vCard’daki telefon/e‑posta/web/konum alanlarını listeler.</p>
                </div>
              ) : (
                <div className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
                  <p className={`text-xs ${sub}`}>Bu blok için ayar yok.</p>
                </div>
              )}

              <div className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
                <p className={`text-[10px] font-black tracking-widest ${sub}`}>İPUCU</p>
                <p className={`text-xs mt-1 ${sub}`}>Kaydettikten sonra public sayfada bloklar aktif olur.</p>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => toast.info("Blokları soldan ekleyip sağdan düzenleyebilirsin.")}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold ${isDark ? "border-white/10 text-slate-300 hover:border-white/20" : "border-slate-200 text-slate-700"}`}>
                    Anladım
                  </button>
                  <button onClick={() => { toast.success("Kaydetmeyi unutma."); }}
                    className="ml-auto px-3 py-2 rounded-xl text-xs font-bold text-white btn-premium focus-premium">
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

