"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Users, Mail, Settings, Loader2,
  Plus, Trash2, X, Check, AlertCircle, Moon, Sun,
  Crown, Shield, Pencil, Eye, ChevronDown, UserMinus,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

interface OrgMember {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  joined_at: string;
}

interface OrgInvite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
}

const ROLE_BADGE: Record<string, string> = {
  owner:  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  admin:  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  editor: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  viewer: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};

const ROLE_ICON: Record<string, React.ReactNode> = {
  owner:  <Crown size={12} />,
  admin:  <Shield size={12} />,
  editor: <Pencil size={12} />,
  viewer: <Eye size={12} />,
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Sahip", admin: "Yönetici", editor: "Editör", viewer: "Görüntüleyici",
};

const MEMBER_ROLES = ["admin", "editor", "viewer"] as const;

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black ${ROLE_BADGE[role] ?? ROLE_BADGE.viewer}`}>
      {ROLE_ICON[role]} {ROLE_LABEL[role] ?? role}
    </span>
  );
}

export default function OrgDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [myRole, setMyRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"members" | "invites" | "settings">("members");

  // Add member
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  const [addErr, setAddErr] = useState("");

  // Role change
  const [changingRole, setChangingRole] = useState<string | null>(null);

  // Remove member
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Cancel invite
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Settings
  const [editName, setEditName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsErr, setSettingsErr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function loadOrg() {
    const res = await fetch(`/api/v1/organizations/${id}`, { credentials: "same-origin" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Yüklenemedi.");
    setOrg(data.organization);
    setMembers(data.members ?? []);
    setInvites(data.invites ?? []);
    setMyRole(data.my_role ?? "");
    setEditName(data.organization?.name ?? "");
  }

  useEffect(() => {
    loadOrg()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = myRole === "owner";
  const isAdmin = myRole === "owner" || myRole === "admin";

  async function handleAdd() {
    if (!addEmail.trim()) { setAddErr("E-posta zorunlu."); return; }
    setAdding(true); setAddErr(""); setAddMsg("");
    try {
      const res = await fetch(`/api/v1/organizations/${id}/members`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim().toLowerCase(), role: addRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Eklenemedi.");
      setAddMsg(data.added ? "Üye eklendi." : "Davet gönderildi.");
      setAddEmail("");
      await loadOrg();
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "Hata");
    } finally {
      setAdding(false);
      window.setTimeout(() => setAddMsg(""), 3000);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setChangingRole(userId);
    try {
      const res = await fetch(`/api/v1/organizations/${id}/members/${userId}`, {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rol değiştirilemedi.");
      setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role: newRole } : m));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Hata");
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Bu üyeyi organizasyondan çıkarmak istediğinize emin misiniz?")) return;
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/v1/organizations/${id}/members/${userId}`, {
        method: "DELETE", credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kaldırılamadı.");
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Hata");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setCancellingId(inviteId);
    try {
      const res = await fetch(`/api/v1/organizations/${id}/invites/${inviteId}`, {
        method: "DELETE", credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "İptal edilemedi.");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Hata");
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true); setSettingsErr(""); setSettingsMsg("");
    try {
      const res = await fetch(`/api/v1/organizations/${id}`, {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kaydedilemedi.");
      setOrg(data.organization);
      setSettingsMsg("Kaydedildi.");
      window.setTimeout(() => setSettingsMsg(""), 2500);
    } catch (e) {
      setSettingsErr(e instanceof Error ? e.message : "Hata");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== org?.name) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/organizations/${id}`, {
        method: "DELETE", credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Silinemedi.");
      router.push("/dashboard/organizations");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Hata");
      setDeleting(false);
    }
  }

  const pageBg = "min-h-screen bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors";
  const panel = "rounded-2xl border border-slate-200 bg-white/80 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";
  const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 dark:border-white/10 dark:bg-[#020617] dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-violet-400";
  const subtle = "text-slate-500 dark:text-slate-400";

  if (loading) {
    return (
      <div className={`${pageBg} flex items-center justify-center`}>
        <Loader2 className="animate-spin text-violet-500" size={32} />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className={pageBg}>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle size={16} /> {error || "Organizasyon bulunamadı."}
          </div>
          <button onClick={() => router.push("/dashboard/organizations")} className="mt-4 flex items-center gap-2 text-sm font-bold text-violet-600">
            <ArrowLeft size={16} /> Geri dön
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "members", label: "Üyeler", icon: <Users size={15} />, count: members.length },
    { id: "invites", label: "Davetler", icon: <Mail size={15} />, count: invites.length },
    ...(isOwner ? [{ id: "settings", label: "Ayarlar", icon: <Settings size={15} />, count: null }] : []),
  ] as const;

  return (
    <div className={pageBg}>
      <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/organizations")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25">
                <Building2 size={22} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Organizasyon</p>
                <h1 className="text-2xl font-black tracking-tight">{org.name}</h1>
                <p className={`text-xs font-mono ${subtle}`}>/{org.slug}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleBadge role={myRole} />
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.03] w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                tab === t.id
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                  : `${subtle} hover:text-slate-900 dark:hover:text-white`
              }`}
            >
              {t.icon} {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${tab === t.id ? "bg-white/20" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── MEMBERS TAB ── */}
        {tab === "members" && (
          <div className="space-y-4">
            {/* Add member */}
            {isAdmin && (
              <div className={`${panel} p-5`}>
                <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Üye Ekle / Davet Et</h2>
                {addErr && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    <AlertCircle size={13} /> {addErr}
                  </div>
                )}
                {addMsg && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <Check size={13} /> {addMsg}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <input
                    className={`${input} flex-1 min-w-[200px]`}
                    type="email"
                    placeholder="kullanici@ornek.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as any)}
                    className={`${input} w-auto`}
                  >
                    {MEMBER_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                    {isOwner && <option value="admin">{ROLE_LABEL.admin}</option>}
                  </select>
                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-violet-500/20 transition-colors hover:bg-violet-500 disabled:opacity-60"
                  >
                    {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    {adding ? "Ekleniyor..." : "Ekle"}
                  </button>
                </div>
              </div>
            )}

            {/* Members list */}
            <div className={`${panel} overflow-hidden`}>
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {members.length === 0 ? (
                  <p className={`py-8 text-center text-sm ${subtle}`}>Henüz üye yok.</p>
                ) : members.map((m) => (
                  <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 text-sm font-black dark:from-white/10 dark:to-white/5 dark:text-slate-300">
                        {(m.full_name?.[0] ?? m.email?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{m.full_name || m.email}</p>
                        {m.full_name && <p className={`text-xs ${subtle}`}>{m.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.role === "owner" || !isAdmin ? (
                        <RoleBadge role={m.role} />
                      ) : (
                        <div className="relative">
                          <select
                            value={m.role}
                            disabled={changingRole === m.user_id}
                            onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                            className={`appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs font-bold text-slate-700 outline-none transition-colors hover:border-violet-300 focus:border-violet-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 ${ROLE_BADGE[m.role] ? "" : ""}`}
                          >
                            {MEMBER_ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                            ))}
                            {isOwner && <option value="admin">{ROLE_LABEL.admin}</option>}
                          </select>
                          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      )}
                      {m.role !== "owner" && isAdmin && (
                        <button
                          onClick={() => handleRemove(m.user_id)}
                          disabled={removingId === m.user_id}
                          title="Üyeyi çıkar"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          {removingId === m.user_id ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── INVITES TAB ── */}
        {tab === "invites" && (
          <div className={`${panel} overflow-hidden`}>
            {invites.length === 0 ? (
              <p className={`py-12 text-center text-sm ${subtle}`}>Bekleyen davet yok.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                        <Mail size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{inv.email}</p>
                        <p className={`text-xs ${subtle}`}>
                          Süre: {new Date(inv.expires_at).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={inv.role} />
                      {isAdmin && (
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          disabled={cancellingId === inv.id}
                          title="Daveti iptal et"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          {cancellingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB (owner only) ── */}
        {tab === "settings" && isOwner && (
          <div className="space-y-4">
            <div className={`${panel} p-6`}>
              <h2 className="mb-4 text-base font-black">Organizasyon Bilgileri</h2>
              {settingsErr && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <AlertCircle size={14} /> {settingsErr}
                </div>
              )}
              {settingsMsg && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Check size={14} /> {settingsMsg}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Organizasyon Adı</label>
                  <input
                    className={`mt-1 ${input}`}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Slug</label>
                  <p className={`mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400`}>/{org.slug}</p>
                  <p className={`mt-1 text-xs ${subtle}`}>Slug değiştirilemiyor (mevcut linkler etkilenir).</p>
                </div>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || !editName.trim()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-500/20 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSettings ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Kaydet
              </button>
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-500/30 dark:bg-red-500/5">
              <h2 className="mb-1 text-base font-black text-red-700 dark:text-red-400">Tehlikeli Bölge</h2>
              <p className={`mb-4 text-sm ${subtle}`}>
                Organizasyonu silmek geri alınamaz. Tüm üyelikler ve davetler silinir.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-red-600 dark:text-red-400">
                    Onaylamak için organizasyon adını yazın: <span className="font-mono">{org.name}</span>
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 outline-none focus:border-red-500 dark:border-red-500/30 dark:bg-red-500/5 dark:text-red-300 dark:placeholder:text-red-700/40"
                    placeholder={org.name}
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirm !== org.name || deleting}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  Organizasyonu Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
