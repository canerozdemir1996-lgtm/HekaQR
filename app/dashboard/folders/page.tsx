"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  Moon,
  Pencil,
  Plus,
  QrCode,
  Save,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import {
  createFolder,
  deleteFolder,
  fetchFolders,
  fetchQrCodes,
  renameFolder,
  updateQrCode,
  type QrCode as QrCodeType,
  type QrFolder,
} from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/components/toast";

const TRASH_TAG = "__trash";

function isTrashed(qr: QrCodeType) {
  return (qr.tags ?? []).includes(TRASH_TAG);
}

function folderLabel(folderId: string) {
  if (folderId === "all") return "Tüm QR'lar";
  if (folderId === "uncategorized") return "Klasörsüz";
  return "Klasör";
}

export default function FoldersPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const toast = useToast();
  const [folders, setFolders] = useState<QrFolder[]>([]);
  const [qrs, setQrs] = useState<QrCodeType[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [folderRows, qrRows] = await Promise.all([fetchFolders(), fetchQrCodes()]);
      setFolders(folderRows);
      setQrs(qrRows.filter(qr => !isTrashed(qr)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Klasörler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const folderCounts = useMemo(() => {
    const map = new Map<string, number>();
    qrs.forEach(qr => map.set(qr.folder_id ?? "uncategorized", (map.get(qr.folder_id ?? "uncategorized") ?? 0) + 1));
    return map;
  }, [qrs]);

  const selectedName = useMemo(() => {
    if (selectedFolder === "all" || selectedFolder === "uncategorized") return folderLabel(selectedFolder);
    return folders.find(folder => folder.id === selectedFolder)?.name ?? "Klasör";
  }, [folders, selectedFolder]);

  const visibleQrs = useMemo(() => qrs
    .filter(qr => {
      const matchFolder = selectedFolder === "all" || (selectedFolder === "uncategorized" ? !qr.folder_id : qr.folder_id === selectedFolder);
      const matchSearch = !search || qr.title.toLowerCase().includes(search.toLowerCase()) || qr.short_slug.toLowerCase().includes(search.toLowerCase());
      return matchFolder && matchSearch;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [qrs, selectedFolder, search]);

  async function addFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const folder = await createFolder(name);
      setFolders(prev => [folder, ...prev]);
      setSelectedFolder(folder.id);
      setNewFolderName("");
      toast.success("Klasör oluşturuldu", "Hazır");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klasör oluşturulamadı", "Hata");
    } finally {
      setSaving(false);
    }
  }

  async function saveRename(folder: QrFolder) {
    const name = editingName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await renameFolder(folder.id, name);
      setFolders(prev => prev.map(item => item.id === folder.id ? { ...item, name } : item));
      setEditingId("");
      setEditingName("");
      toast.success("Klasör güncellendi", "Hazır");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klasör güncellenemedi", "Hata");
    } finally {
      setSaving(false);
    }
  }

  async function removeFolder(folder: QrFolder) {
    const count = folderCounts.get(folder.id) ?? 0;
    const message = count > 0
      ? `"${folder.name}" silinsin mi? İçindeki ${count} QR klasörsüze taşınacak.`
      : `"${folder.name}" silinsin mi?`;
    if (!confirm(message)) return;
    setSaving(true);
    try {
      const affected = qrs.filter(qr => qr.folder_id === folder.id);
      await Promise.all(affected.map(qr => updateQrCode(qr.id, { folder_id: null })));
      await deleteFolder(folder.id);
      setQrs(prev => prev.map(qr => qr.folder_id === folder.id ? { ...qr, folder_id: null } : qr));
      setFolders(prev => prev.filter(item => item.id !== folder.id));
      setSelectedFolder(prev => prev === folder.id ? "all" : prev);
      toast.success("Klasör silindi", count > 0 ? "QR'lar klasörsüze taşındı" : "Hazır");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klasör silinemedi", "Hata");
    } finally {
      setSaving(false);
    }
  }

  const pageBg = "min-h-screen bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors";
  const panel = "rounded-2xl border border-slate-200 bg-white/85 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
  const subtle = "text-slate-500 dark:text-slate-400";

  return (
    <div className={pageBg}>
      <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10" title="Dashboard'a dön">
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Dashboard</p>
              <h1 className="text-2xl font-black tracking-tight">Klasörler</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10" title={isDark ? "Gündüz modu" : "Gece modu"}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-500">
              <LayoutDashboard size={16} /> QR Listesi
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <section className={`${panel} mb-6 p-4`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="block flex-1">
              <span className={`mb-1 block text-xs font-bold uppercase tracking-widest ${subtle}`}>Yeni klasör</span>
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void addFolder(); }}
                placeholder="Örn. Kataloglar"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-500 dark:border-white/10 dark:bg-slate-950"
              />
            </label>
            <button onClick={addFolder} disabled={saving || !newFolderName.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Klasör Ekle
            </button>
          </div>
        </section>

        <main className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className={`${panel} p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <FolderKanban size={17} className="text-violet-500" />
              <h2 className="text-sm font-black">Klasör Listesi</h2>
            </div>
            <div className="max-h-[66vh] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {[
                { id: "all", name: "Tüm QR'lar", count: qrs.length, system: true },
                { id: "uncategorized", name: "Klasörsüz", count: folderCounts.get("uncategorized") ?? 0, system: true },
                ...folders.map(folder => ({ ...folder, count: folderCounts.get(folder.id) ?? 0, system: false })),
              ].map((folder) => {
                const active = selectedFolder === folder.id;
                const realFolder = folders.find(item => item.id === folder.id);
                return (
                  <div key={folder.id} className={`rounded-xl border p-2 transition ${active ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-200 dark:hover:bg-white/[0.06]"}`}>
                    {editingId === folder.id && realFolder ? (
                      <div className="flex gap-2">
                        <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-slate-900 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-white" />
                        <button onClick={() => saveRename(realFolder)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white"><Save size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedFolder(folder.id)} className="min-w-0 flex flex-1 items-center justify-between gap-2 text-left">
                          <span className="truncate text-sm font-black">{folder.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"}`}>{folder.count}</span>
                        </button>
                        {!folder.system && realFolder && (
                          <>
                            <button onClick={() => { setEditingId(realFolder.id); setEditingName(realFolder.name); }} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "text-white hover:bg-white/15" : "text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"}`} title="Yeniden adlandır">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => removeFolder(realFolder)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "text-white hover:bg-white/15" : "text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-300"}`} title="Sil">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          <section className={`${panel} p-4`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Seçili klasör</p>
                <h2 className="text-xl font-black">{selectedName}</h2>
              </div>
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="QR ara..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-violet-500 dark:border-white/10 dark:bg-slate-950" />
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center text-slate-500">
                <Loader2 className="animate-spin" />
              </div>
            ) : visibleQrs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-white/15">
                <QrCode className="mx-auto mb-3 text-violet-500" size={34} />
                <p className="text-lg font-black">Bu klasörde QR yok</p>
                <p className={`mt-1 text-sm ${subtle}`}>QR listesinden toplu taşıma ile bu klasöre ekleyebilirsin.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleQrs.map(qr => (
                  <div key={qr.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      <QrCode size={18} />
                    </div>
                    <p className="truncate text-sm font-black">{qr.title}</p>
                    <p className={`mt-1 truncate font-mono text-xs ${subtle}`}>/q/{qr.short_slug}</p>
                    <p className="mt-3 text-xs font-black text-slate-500 dark:text-slate-400">{qr.scan_count.toLocaleString("tr-TR")} tarama</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
