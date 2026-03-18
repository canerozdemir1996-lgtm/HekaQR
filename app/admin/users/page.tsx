"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X, Check,
  AlertCircle, Search, ArrowLeft, Shield, User, QrCode,
  Activity, MoreHorizontal, RefreshCw, ChevronDown, Mail,
  Key, ToggleLeft, ToggleRight, Crown,
} from "lucide-react";
import { getAuthHeaders, getSupabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "user";
  is_active: boolean;
  created_at: string;
  last_sign_in?: string;
  qr_count: number;
  scan_count: number;
}

// ── User Form Modal ────────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSaved, isDark, actorRole }: {
  user: AppUser | null; onClose: () => void; onSaved: () => void; isDark: boolean;
  actorRole: "owner" | "admin" | "user";
}) {
  const isNew = !user;
  const [email, setEmail] = useState(user?.email ?? "");
  const [name, setName] = useState(user?.full_name ?? "");
  const [role, setRole] = useState<"owner" | "admin" | "user">(user?.role ?? "user");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const OWNER_ROLE_OPTIONS = ["user", "admin", "owner"] as const;
  const ADMIN_ROLE_OPTIONS = ["user", "admin"] as const;
  const roleOptions = actorRole === "owner" ? OWNER_ROLE_OPTIONS : ADMIN_ROLE_OPTIONS;

  const save = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ id: user?.id, email, full_name: name, role, password: pw || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Hata oluştu");
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Hata"); }
    finally { setLoading(false); }
  };

  const inp = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 animate-scalein ${isDark ? "bg-[#0d1117] border-white/[0.08]" : "bg-white border-slate-200"}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <Users size={16} className="text-white"/>
            </div>
            <div>
              <h2 className={`font-black text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
                {isNew ? "Yeni Kullanıcı Ekle" : "Kullanıcıyı Düzenle"}
              </h2>
              <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {isNew ? "Sisteme yeni hesap oluştur" : user?.email}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDark ? "text-slate-500 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100"}`}>
            <X size={15}/>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs mb-4">
            <AlertCircle size={13}/> {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              <User size={10}/> Ad Soyad
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad"
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`}/>
          </div>

          {/* Email */}
          <div>
            <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              <Mail size={10}/> E-posta {!isNew && <span className="normal-case font-normal opacity-60">(değiştirilemez)</span>}
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="kullanici@ornek.com" disabled={!isNew}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp} disabled:opacity-40 disabled:cursor-not-allowed`}/>
          </div>

          {/* Password */}
          <div>
            <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              <Key size={10}/> {isNew ? "Şifre" : "Yeni Şifre"}
              {!isNew && <span className="normal-case font-normal opacity-60">(boş bırakılırsa değişmez)</span>}
            </label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
                placeholder={isNew ? "En az 6 karakter" : "Değiştirmek için girin"}
                className={`w-full border rounded-xl px-3.5 py-2.5 pr-10 text-sm outline-none transition-all ${inp}`}/>
              <button type="button" onClick={() => setShowPw(!showPw)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}>
                {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              <Shield size={10}/> Rol
            </label>
            <div className="grid grid-cols-2 gap-2">
              {roleOptions.map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all ${
                    role === r
                      ? r === "admin"
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                        : "border-violet-500/50 bg-violet-500/10 text-violet-400"
                      : isDark ? "border-white/10 text-slate-500 hover:border-white/20" : "border-slate-200 text-slate-400 hover:border-slate-300"
                  }`}>
                  {r === "admin" || r === "owner" ? <Crown size={14}/> : <User size={14}/>}
                  {r === "admin" ? "Admin" : r === "owner" ? "Owner" : "Kullanıcı"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 mt-6">
          <button onClick={onClose}
            className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${isDark ? "border-white/10 text-slate-400 hover:border-white/20 hover:text-white" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
            İptal
          </button>
          <button onClick={save} disabled={loading || !email.trim() || (isNew && !pw.trim())}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-premium focus-premium">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            {isNew ? "Hesap Oluştur" : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User Detail Panel ──────────────────────────────────────────────────────────
function UserDetail({ user, onClose, onEdit, onDelete, onMessage, canMessage, isDark }: {
  user: AppUser; onClose: () => void;
  onEdit: () => void; onDelete: () => void; isDark: boolean;
  onMessage: () => void;
  canMessage: boolean;
}) {
  const card = isDark ? "bg-white/[0.04] border-white/[0.07]" : "bg-slate-50 border-slate-200";
  const tx = isDark ? "text-white" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-2xl border shadow-2xl p-6 animate-scalein ${isDark ? "bg-[#0d1117] border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`font-black text-sm ${tx}`}>Kullanıcı Detayı</h3>
          <button onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? "text-slate-500 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
            <X size={15}/>
          </button>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
            <span className="text-white text-xl font-black">
              {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
            </span>
          </div>
          <div>
            <p className={`font-black text-base ${tx}`}>{user.full_name || "İsimsiz"}</p>
            <p className={`text-xs ${sub}`}>{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                user.role === "admin" || user.role === "owner"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : isDark ? "border-white/10 bg-white/5 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-500"
              }`}>
                {user.role === "owner" ? "👑 Owner" : user.role === "admin" ? "👑 Admin" : "Kullanıcı"}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                user.is_active
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}>
                {user.is_active ? "Aktif" : "Pasif"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-2 gap-3 p-4 rounded-xl border mb-4 ${card}`}>
          <div className="text-center">
            <p className={`text-2xl font-black text-violet-400`}>{user.qr_count}</p>
            <p className={`text-[10px] uppercase tracking-wide ${sub}`}>QR Kodu</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-black text-emerald-400`}>{user.scan_count.toLocaleString("tr-TR")}</p>
            <p className={`text-[10px] uppercase tracking-wide ${sub}`}>Tarama</p>
          </div>
        </div>

        {/* Meta */}
        <div className={`space-y-2.5 p-4 rounded-xl border mb-5 ${card}`}>
          {[
            { label: "Kayıt Tarihi", value: new Date(user.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }) },
            { label: "Son Giriş", value: user.last_sign_in ? new Date(user.last_sign_in).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }) : "Hiç giriş yapmadı" },
          ].map((row, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className={sub}>{row.label}</span>
              <span className={`font-medium ${tx}`}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition-all btn-premium focus-premium">
            <Pencil size={13}/> Düzenle
          </button>
          {canMessage && (
            <button onClick={onMessage}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
              title="Kullanıcıya popup mesaj gönder"
            >
              <Mail size={13}/>
            </button>
          )}
          <button onClick={onDelete}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${isDark ? "border-red-900/40 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-500 hover:bg-red-50"}`}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageModal({ user, onClose, isDark }: {
  user: AppUser;
  onClose: () => void;
  isDark: boolean;
}) {
  const [title, setTitle] = useState("System Owner");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ to_user_id: user.id, title, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Hata");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  };

  const inp = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 animate-scalein ${isDark ? "bg-[#0d1117] border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`font-black text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
            Popup Mesaj Gönder
          </h3>
          <button onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? "text-slate-500 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
            <X size={15}/>
          </button>
        </div>

        <p className={`text-xs mb-4 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
          Hedef: <b>{user.email}</b>
        </p>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs mb-4">
            <AlertCircle size={13}/> {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Başlık</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              className={`w-full mt-1 border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`} />
          </div>
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>Mesaj</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={500}
              placeholder="Kullanıcıya gösterilecek mesaj…"
              className={`w-full mt-1 border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${inp}`}
              rows={4}
            />
            <p className={`text-[10px] mt-1 ${isDark ? "text-slate-600" : "text-slate-500"}`}>{body.length}/500</p>
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose}
            className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${isDark ? "border-white/10 text-slate-400 hover:border-white/20 hover:text-white" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
            İptal
          </button>
          <button onClick={send} disabled={loading || !body.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-premium focus-premium">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const router = useRouter();
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorRole, setActorRole] = useState<"owner" | "admin" | "user">("user");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editUser, setEditUser] = useState<AppUser | null | "new">(null);
  const [detailUser, setDetailUser] = useState<AppUser | null>(null);
  const [messageUser, setMessageUser] = useState<AppUser | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "qr" | "scans" | "date">("date");

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      const r = session?.user.user_metadata?.role;
      if (!session || (r !== "admin" && r !== "owner")) {
        router.push("/login");
        return;
      }
      setActorRole(r === "owner" ? "owner" : "admin");
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { headers: await getAuthHeaders() }).then(r => r.json());
      setUsers(res.users ?? []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kullanıcıyı kalıcı olarak silmek istediğinizden emin misiniz?\nBu işlem geri alınamaz.")) return;
    await fetch(`/api/admin/users?id=${id}`, { method: "DELETE", headers: await getAuthHeaders() });
    setDetailUser(null);
    load();
  };

  const handleToggleStatus = async (u: AppUser) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
      body: JSON.stringify({ id: u.id, is_active: !u.is_active }),
    });
    load();
  };

  const filtered = users
    .filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? u.is_active : !u.is_active);
      return matchSearch && matchRole && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.full_name || a.email).localeCompare(b.full_name || b.email);
      if (sortBy === "qr") return b.qr_count - a.qr_count;
      if (sortBy === "scans") return b.scan_count - a.scan_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const pg = "app-bg";
  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";
  const inputCls = isDark
    ? "bg-white/5 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus-premium"
    : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus-premium";
  const rowBdr = isDark ? "border-white/[0.06]" : "border-slate-100";
  const rowHov = isDark ? "hover:bg-white/[0.03] hover:-translate-y-[1px] hover:shadow-[0_18px_60px_rgba(0,0,0,0.22)]" : "hover:bg-white/70 hover:-translate-y-[1px] hover:shadow-md";

  const adminCount = users.filter(u => u.role === "admin").length;
  const ownerCount = users.filter(u => u.role === "owner").length;
  const activeCount = users.filter(u => u.is_active).length;

  return (
    <div className={`min-h-screen ${pg}`}>
      {/* Header */}
      <header className={`sticky top-0 z-20 border-b ${isDark ? "glass-dark border-white/10" : "glass-light border-slate-200"} backdrop-blur-2xl px-6 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin")}
            className={`flex items-center gap-1.5 text-sm ${sub} hover:text-violet-400 transition-colors`}>
            <ArrowLeft size={14}/> Admin
          </button>
          <span className={isDark ? "text-slate-700" : "text-slate-300"}>|</span>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-violet-400"/>
            <span className={`font-black text-sm ${tx}`}>Kullanıcı Yönetimi</span>
          </div>
          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-500"}`}>
            {users.length} kullanıcı
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500"}`}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
          </button>
          <button onClick={() => setEditUser("new")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all btn-premium focus-premium">
            <Plus size={14}/> Kullanıcı Ekle
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Toplam Kullanıcı", value: users.length, icon: <Users size={16}/>, color: "#7c3aed" },
            { label: "Aktif", value: activeCount, icon: <ToggleRight size={16}/>, color: "#10b981" },
            { label: "Pasif", value: users.length - activeCount, icon: <ToggleLeft size={16}/>, color: "#ef4444" },
            { label: "Owner", value: ownerCount, icon: <Crown size={16}/>, color: "#a78bfa" },
            { label: "Admin", value: adminCount, icon: <Crown size={16}/>, color: "#f59e0b" },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl border ${card} p-4 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${s.color}18`, color: s.color }}>
                {s.icon}
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${sub}`}>{s.label}</p>
                <p className={`text-2xl font-black ${tx}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className={`rounded-2xl border ${card} p-4`}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`}/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="İsim veya e-posta ile ara…"
                className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`}/>
            </div>

            {/* Role filter */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? "border-slate-700 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
              {(["all", "user", "admin", "owner"] as const).map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${roleFilter === r ? "bg-violet-600 text-white" : `${sub} hover:text-violet-400`}`}>
                  {r === "all" ? "Tümü" : r === "owner" ? "Owner" : r === "admin" ? "Admin" : "Kullanıcı"}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? "border-slate-700 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
              {(["all", "active", "inactive"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? "bg-violet-600 text-white" : `${sub} hover:text-violet-400`}`}>
                  {s === "all" ? "Tümü" : s === "active" ? "Aktif" : "Pasif"}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? "border-slate-700 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
              {(["date", "name", "qr", "scans"] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === s ? "bg-violet-600 text-white" : `${sub} hover:text-violet-400`}`}>
                  {s === "date" ? "Tarih" : s === "name" ? "İsim" : s === "qr" ? "QR" : "Tarama"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={`rounded-2xl border ${card} overflow-hidden`}>
          {/* Header */}
          <div className={`hidden lg:grid grid-cols-12 gap-3 px-5 py-3 border-b text-[10px] font-black uppercase tracking-widest ${sub} ${isDark ? "bg-white/[0.02] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <div className="col-span-4">Kullanıcı</div>
            <div className="col-span-2">Rol / Durum</div>
            <div className="col-span-1 text-center">QR</div>
            <div className="col-span-2 text-center">Tarama</div>
            <div className="col-span-2">Son Giriş</div>
            <div className="col-span-1 text-right">İşlem</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-violet-400"/>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Users size={32} className={`mx-auto mb-3 ${sub}`}/>
              <p className={`text-sm font-medium ${sub}`}>Kullanıcı bulunamadı</p>
              <p className={`text-xs ${sub} mt-1`}>Filtre kriterlerinizi değiştirin</p>
            </div>
          ) : (
            filtered.map(u => (
              <div key={u.id}
                className={`grid grid-cols-12 gap-3 px-5 py-4 border-b ${rowBdr} ${rowHov} transition-colors items-center last:border-0 cursor-pointer`}
                onClick={() => setDetailUser(u)}>

                {/* User info */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm
                    ${(u.role === "admin" || u.role === "owner") ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white" : "bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-400"}`}>
                    {(u.full_name?.[0] || u.email?.[0] || "U").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${tx}`}>
                      {u.full_name || <span className={sub}>İsimsiz</span>}
                    </p>
                    <p className={`text-[11px] truncate ${sub}`}>{u.email}</p>
                  </div>
                </div>

                {/* Role & Status */}
                <div className="col-span-2 flex flex-col gap-1">
                  <span className={`w-fit px-2 py-0.5 text-[10px] font-black uppercase rounded-md ${
                    u.role === "admin" || u.role === "owner"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : isDark ? "bg-white/5 text-slate-500 border border-white/8" : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}>
                    {u.role === "owner" ? "👑 Owner" : u.role === "admin" ? "👑 Admin" : "User"}
                  </span>
                  <span className={`w-fit px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                    u.is_active
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {u.is_active ? "Aktif" : "Pasif"}
                  </span>
                </div>

                {/* QR Count */}
                <div className="col-span-1 text-center">
                  <span className={`text-sm font-black ${tx}`}>{u.qr_count}</span>
                </div>

                {/* Scan Count */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-black text-violet-400">{u.scan_count.toLocaleString("tr-TR")}</span>
                </div>

                {/* Last login */}
                <div className={`col-span-2 text-xs ${sub}`}>
                  {u.last_sign_in
                    ? new Date(u.last_sign_in).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })
                    : "Hiç giriş yapmadı"}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditUser(u)}
                    className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-violet-400 hover:bg-violet-500/10" : "text-slate-400 hover:text-violet-500 hover:bg-violet-50"}`}
                    title="Düzenle">
                    <Pencil size={13}/>
                  </button>
                  <button onClick={() => handleToggleStatus(u)}
                    className={`p-1.5 rounded-lg transition-all ${u.is_active
                      ? isDark ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                      : isDark ? "text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                    }`}
                    title={u.is_active ? "Pasife Al" : "Aktif Et"}>
                    {u.is_active ? <ToggleRight size={13}/> : <ToggleLeft size={13}/>}
                  </button>
                  <button onClick={() => handleDelete(u.id)}
                    className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}
                    title="Sil">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Footer */}
          {filtered.length > 0 && (
            <div className={`px-5 py-3 flex items-center justify-between border-t ${isDark ? "border-slate-800 bg-white/[0.01]" : "border-slate-100 bg-slate-50/50"}`}>
              <p className={`text-xs ${sub}`}>{filtered.length} / {users.length} kullanıcı gösteriliyor</p>
              <p className={`text-xs ${sub}`}>
                Toplam {users.reduce((a, u) => a + u.scan_count, 0).toLocaleString("tr-TR")} tarama ·{" "}
                {users.reduce((a, u) => a + u.qr_count, 0)} QR kodu
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {editUser !== null && (
        <UserModal
          user={editUser === "new" ? null : editUser}
          isDark={isDark}
          actorRole={actorRole}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load(); }}
        />
      )}

      {detailUser && (
        <UserDetail
          user={detailUser}
          isDark={isDark}
          onClose={() => setDetailUser(null)}
          onEdit={() => { setEditUser(detailUser); setDetailUser(null); }}
          onDelete={() => handleDelete(detailUser.id)}
          canMessage={actorRole === "owner"}
          onMessage={() => { setMessageUser(detailUser); setDetailUser(null); }}
        />
      )}

      {messageUser && (
        <MessageModal user={messageUser} isDark={isDark} onClose={() => setMessageUser(null)} />
      )}
    </div>
  );
}
