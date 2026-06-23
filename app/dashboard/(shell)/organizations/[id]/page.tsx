"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Users, Mail, Settings, Loader2,
  Plus, Trash2, X, Check, AlertCircle,
  Crown, Shield, Pencil, Eye, ChevronDown, UserMinus,
  QrCode, ExternalLink, BarChart2, Power,
} from "lucide-react";

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

interface OrgQR {
  id: string;
  title: string;
  short_slug: string;
  qr_type: string | null;
  is_active: boolean;
  scan_count: number;
  created_at: string;
  user_id: string;
  owner_email: string;
  owner_name: string;
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

const QR_TYPE_LABEL: Record<string, string> = {
  url: "URL", vcard: "vCard", menu: "Menü", multi: "Multi", wifi: "WiFi",
  sms: "SMS", email: "E-posta", whatsapp: "WhatsApp", text: "Metin", phone: "Telefon", product: "Ürün",
};

const MEMBER_ROLES = ["editor", "viewer"] as const;

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

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [myRole, setMyRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"qrcodes" | "members" | "invites" | "settings">("qrcodes");

  // QR codes
  const [qrcodes, setQrcodes] = useState<OrgQR[]>([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSearch, setQrSearch] = useState("");

  // Add member
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  const [addErr, setAddErr] = useState("");

  // Role change / remove
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Settings
  const [editName, setEditName] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#7c3aed");
  const [brandTagline, setBrandTagline] = useState("");
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
    setEditLogoUrl(data.organization?.logo_url ?? "");
    try {
      const savedBranding = window.localStorage.getItem(`qrpublish-org-branding:${id}`);
      if (savedBranding) {
        const parsed = JSON.parse(savedBranding) as { color?: string; tagline?: string };
        setBrandColor(parsed.color || "#7c3aed");
        setBrandTagline(parsed.tagline || "");
      }
    } catch {
      // ignore
    }
  }

  async function loadQRCodes() {
    setQrLoading(true);
    try {
      const res = await fetch(`/api/v1/organizations/${id}/qrcodes`, { credentials: "same-origin" });
      const data = await res.json();
      if (res.ok) setQrcodes(data.qrcodes ?? []);
    } finally {
      setQrLoading(false);
    }
  }

  useEffect(() => {
    loadOrg()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === "qrcodes") loadQRCodes();
  }, [tab]);

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
      setAddMsg(data.added ? "Üye eklendi." : "Davet gönderildi (token: " + (data.token ?? "") + ")");
      setAddEmail("");
      await loadOrg();
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "Hata");
    } finally {
      setAdding(false);
      window.setTimeout(() => setAddMsg(""), 5000);
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
        body: JSON.stringify({ name: editName.trim(), logo_url: emptyToNull(editLogoUrl) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kaydedilemedi.");
      setOrg(data.organization);
      try {
        window.localStorage.setItem(`qrpublish-org-branding:${id}`, JSON.stringify({ color: brandColor, tagline: brandTagline }));
      } catch {
        // ignore
      }
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

  const filteredQR = qrcodes.filter((qr) => {
    if (!qrSearch) return true;
    const s = qrSearch.toLowerCase();
    return qr.title.toLowerCase().includes(s) || qr.short_slug.toLowerCase().includes(s) || qr.owner_name.toLowerCase().includes(s) || qr.owner_email.toLowerCase().includes(s);
  });

  // Origin for QR links
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const pageBg = "min-h-full bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors";
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
    { id: "qrcodes",  label: "QR Kodları", icon: <QrCode size={15} />,    count: qrcodes.length },
    { id: "members",  label: "Üyeler",     icon: <Users size={15} />,     count: members.length },
    { id: "invites",  label: "Davetler",   icon: <Mail size={15} />,      count: invites.length },
    ...(isOwner ? [{ id: "settings", label: "Ayarlar", icon: <Settings size={15} />, count: null }] : []),
  ] as const;

  return (
    <div className={pageBg}>
      <div className="mx-auto min-h-full w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/organizations")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              title="Organizasyonlar listesine dön"
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
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.03] w-fit flex-wrap">
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
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${tab === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── QR KODLARI TAB ── */}
        {tab === "qrcodes" && (
          <div className="space-y-4">
            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`${panel} p-4 flex items-center gap-3`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                  <QrCode size={18} />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Toplam QR</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{qrcodes.length}</p>
                </div>
              </div>
              <div className={`${panel} p-4 flex items-center gap-3`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Power size={18} />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Aktif</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{qrcodes.filter((q) => q.is_active).length}</p>
                </div>
              </div>
              <div className={`${panel} p-4 flex items-center gap-3`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <BarChart2 size={18} />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Toplam Tarama</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{qrcodes.reduce((s, q) => s + (q.scan_count ?? 0), 0).toLocaleString("tr-TR")}</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                className={input}
                placeholder="QR adı, slug veya üye ile ara..."
                value={qrSearch}
                onChange={(e) => setQrSearch(e.target.value)}
              />
            </div>

            {/* QR list */}
            <div className={`${panel} overflow-hidden`}>
              {qrLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-violet-500" size={28} />
                </div>
              ) : filteredQR.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
                    <QrCode size={24} />
                  </div>
                  <p className={`text-sm ${subtle}`}>
                    {qrSearch ? "Arama sonucu bulunamadı." : "Org üyelerinin henüz QR kodu yok."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_120px_100px_80px_100px] items-center gap-3 px-5 py-3">
                    <p className={`text-xs font-black uppercase tracking-widest ${subtle}`}>QR Kod</p>
                    <p className={`text-xs font-black uppercase tracking-widest ${subtle}`}>Tür</p>
                    <p className={`text-xs font-black uppercase tracking-widest ${subtle}`}>Üye</p>
                    <p className={`text-xs font-black uppercase tracking-widest ${subtle} text-right`}>Tarama</p>
                    <p className={`text-xs font-black uppercase tracking-widest ${subtle} text-right`}>İşlem</p>
                  </div>
                  {filteredQR.map((qr) => (
                    <div key={qr.id} className="grid grid-cols-[1fr_120px_100px_80px_100px] items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      {/* Title + slug */}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{qr.title}</p>
                        <p className={`truncate text-xs font-mono ${subtle}`}>/q/{qr.short_slug}</p>
                      </div>
                      {/* Type + status */}
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {QR_TYPE_LABEL[qr.qr_type ?? "url"] ?? (qr.qr_type ?? "URL")}
                        </span>
                        {!qr.is_active && (
                          <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">Pasif</span>
                        )}
                      </div>
                      {/* Owner */}
                      <div className="min-w-0">
                        <p className={`truncate text-xs font-medium ${subtle}`} title={qr.owner_email}>
                          {qr.owner_name || qr.owner_email}
                        </p>
                      </div>
                      {/* Scan count */}
                      <p className="text-right text-sm font-black text-slate-700 dark:text-slate-200">
                        {(qr.scan_count ?? 0).toLocaleString("tr-TR")}
                      </p>
                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`${origin}/q/${qr.short_slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                          title="QR'ı aç"
                        >
                          <ExternalLink size={14} />
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => router.push(`/dashboard/qrcodes/${qr.id}/edit`)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
                            title="Düzenle"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {tab === "members" && (
          <div className="space-y-4">
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
                    {(isOwner ? ["admin", "editor", "viewer"] : MEMBER_ROLES).map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
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
                            className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs font-bold text-slate-700 outline-none transition-colors hover:border-violet-300 focus:border-violet-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                          >
                            {(isOwner ? ["admin", "editor", "viewer"] : MEMBER_ROLES).map((r) => (
                              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      )}
                      {m.role !== "owner" && isAdmin && (
                        <button
                          onClick={() => handleRemove(m.user_id)}
                          disabled={removingId === m.user_id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title="Üyeyi çıkar"
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
                        <p className={`text-xs ${subtle}`}>Süre: {new Date(inv.expires_at).toLocaleDateString("tr-TR")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={inv.role} />
                      {isAdmin && (
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          disabled={cancellingId === inv.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title="Daveti iptal et"
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

        {/* ── SETTINGS TAB ── */}
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
                  <input className={`mt-1 ${input}`} value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Logo URL veya base64</label>
                  <input className={`mt-1 ${input}`} value={editLogoUrl} onChange={(e) => setEditLogoUrl(e.target.value)} placeholder="https://cdn.example.com/logo.png" />
                  <label className={`mt-2 block text-xs font-semibold ${subtle}`}>
                    Dosyadan sec
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-2 block w-full text-xs"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setEditLogoUrl(typeof reader.result === "string" ? reader.result : "");
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Slug</label>
                  <p className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">/{org.slug}</p>
                  <p className={`mt-1 text-xs ${subtle}`}>Slug değiştirilemiyor.</p>
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Ana Renk</label>
                  <div className="mt-1 flex items-center gap-3">
                    <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-11 w-16 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5" />
                    <input className={`!mt-0 ${input} font-mono`} value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
                  </div>
                  <p className={`mt-1 text-xs ${subtle}`}>Backend hazir olana kadar bu alan organizasyon bazli local stub olarak saklanir.</p>
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${subtle}`}>Marka Mesaji</label>
                  <input className={`mt-1 ${input}`} value={brandTagline} onChange={(e) => setBrandTagline(e.target.value)} placeholder="Public sayfalarda gosterilecek kisa mesaj" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">White-label Onizleme</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
                      {editLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={editLogoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 size={20} style={{ color: brandColor }} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{editName || org.name}</p>
                      <p className="text-xs font-semibold" style={{ color: brandColor }}>{brandTagline || "Public sayfalardaki marka tonu burada gorunur."}</p>
                    </div>
                  </div>
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

            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-500/30 dark:bg-red-500/5">
              <h2 className="mb-1 text-base font-black text-red-700 dark:text-red-400">Tehlikeli Bölge</h2>
              <p className={`mb-4 text-sm ${subtle}`}>Organizasyonu silmek geri alınamaz. Tüm üyelikler ve davetler silinir.</p>
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

function emptyToNull(value?: string | null) {
  const clean = value?.trim();
  return clean ? clean : null;
}
