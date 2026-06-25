"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Plus, Loader2, Users, ChevronRight,
  X, AlertCircle,
} from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
  my_role: string;
  member_count: number;
}

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  editor: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  viewer: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Sahip", admin: "Yönetici", editor: "Editör", viewer: "Görüntüleyici",
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 40);
}

export default function OrganizationsPage() {
  const router = useRouter();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    fetch("/api/v1/organizations", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(typeof body?.error === "string" ? body.error : "Organizasyonlar yüklenemedi.");
        setOrgs(Array.isArray(body?.organizations) ? body.organizations : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Organizasyonlar yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  function handleNameChange(val: string) {
    setCreateName(val);
    if (!slugManual) setCreateSlug(slugify(val));
  }

  async function handleCreate() {
    const name = createName.trim();
    if (!name) { setCreateError("Ad zorunlu."); return; }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/v1/organizations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: createSlug || slugify(name) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Oluşturulamadı.");
      setShowCreate(false);
      setCreateName(""); setCreateSlug(""); setSlugManual(false);
      router.push(`/dashboard/organizations/${data.organization.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Hata");
    } finally {
      setCreating(false);
    }
  }

  const pageBg = "min-h-full bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors";
  const panel = "rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
  const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 dark:border-white/10 dark:bg-[#020617] dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-violet-400";

  return (
    <div className={pageBg}>
      <div className="mx-auto min-h-full w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Dashboard</p>
            <h1 className="text-2xl font-black tracking-tight">Organizasyonlar</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowCreate(true); setCreateError(""); }}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-500"
            >
              <Plus size={16} /> Yeni Organizasyon
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className={`${panel} flex h-64 items-center justify-center`}>
            <Loader2 className="animate-spin text-violet-500" size={28} />
          </div>
        ) : orgs.length === 0 ? (
          <div className={`${panel} flex flex-col items-center justify-center gap-4 py-20 text-center`}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
              <Building2 size={28} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Henüz organizasyonun yok</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ekibini davet etmek için bir organizasyon oluştur.</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500 transition-colors"
            >
              <Plus size={16} /> Organizasyon Oluştur
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
                className={`${panel} group flex flex-col gap-3 p-5 text-left transition-all hover:-translate-y-1 hover:border-violet-300 hover:shadow-violet-200/40 dark:hover:border-violet-500/40`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25">
                    {org.logo_url
                      ? <img src={org.logo_url} alt="" className="h-full w-full rounded-2xl object-cover" />
                      : <Building2 size={22} />}
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wide ${ROLE_BADGE[org.my_role] ?? ROLE_BADGE.viewer}`}>
                    {ROLE_LABEL[org.my_role] ?? org.my_role}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{org.name}</h3>
                  <p className="mt-0.5 text-xs font-mono text-slate-400">/{org.slug}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Users size={12} /> {org.member_count} üye
                  </span>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-violet-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0f1629]`}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">Yeni Organizasyon</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <AlertCircle size={14} /> {createError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Organizasyon Adı</label>
                <input
                  className={input}
                  placeholder="Acme Corp"
                  value={createName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Slug (URL)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">/</span>
                  <input
                    className={`${input} !mt-0 pl-6 font-mono`}
                    placeholder="acme-corp"
                    value={createSlug}
                    onChange={(e) => { setSlugManual(true); setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createName.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
