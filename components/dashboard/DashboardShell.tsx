"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  Plus, Sun, Moon, LogOut, Settings, LayoutGrid, FolderKanban, ShoppingBag,
  CalendarCheck, ClipboardList, BarChart2, Wand2, Building2, UserRound,
  ShieldAlert, Bell, Crown, Menu, X,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { useTheme } from "@/lib/theme";
import { ProfileMenu } from "@/components/ProfileMenu";
import { getOrCreateSettings, type UserSettings } from "@/lib/supabase";

async function fetchPendingMenuOrderCount() {
  const response = await fetch("/api/v1/menu-orders?scope=all&status=new&limit=20&page=1", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return 0;
  const body = await response.json().catch(() => ({}));
  if (typeof body?.pagination?.total === "number") return body.pagination.total;
  const orders = Array.isArray(body.orders) ? body.orders : [];
  return orders.filter((order: { status?: string }) => order.status === "new").length;
}

function planLabel(plan?: string | null) {
  const normalized = (plan || "free").toLowerCase();
  const labels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    business: "Business",
    enterprise: "Enterprise",
  };
  return labels[normalized] ?? normalized.toUpperCase();
}

type NavItem = { name: string; icon: typeof LayoutGrid; path: string; badge?: number };

const MOBILE_PRIMARY_COUNT = 5;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const unreadMessageCount = useUnreadMessageCount();

  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [planInfo, setPlanInfo] = useState<null | {
    plan: string; plan_label: string; status: string;
    limits: { max_qr: number };
    usage: { qr_count: number; qr_limit: number; qr_pct: number };
    can_create_qr: boolean; at_qr_limit: boolean;
  }>(null);

  const refreshPendingOrders = useCallback(async () => {
    const count = await fetchPendingMenuOrderCount().catch(() => 0);
    setPendingOrderCount(count);
  }, []);

  useEffect(() => {
    void getOrCreateSettings().then(setUserSettings).catch(() => undefined);
    void refreshPendingOrders();
    void fetch("/api/v1/plan", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((res) => { if (res && !res.error) setPlanInfo(res); })
      .catch(() => undefined);
  }, [refreshPendingOrders]);

  useEffect(() => {
    const interval = window.setInterval(() => void refreshPendingOrders(), 10000);
    return () => window.clearInterval(interval);
  }, [refreshPendingOrders]);

  useEffect(() => {
    setMoreMenuOpen(false);
  }, [pathname]);

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "owner";

  const navItems: NavItem[] = [
    { name: "Genel Bakış", icon: LayoutGrid, path: "/dashboard" },
    { name: "Kampanyalar", icon: FolderKanban, path: "/dashboard/campaigns" },
    { name: "Klasörler", icon: FolderKanban, path: "/dashboard/folders" },
    { name: "Siparişler", icon: ShoppingBag, path: "/dashboard/orders", badge: pendingOrderCount },
    { name: "Rezervasyonlar", icon: CalendarCheck, path: "/dashboard/bookings" },
    { name: "Geri Bildirimler", icon: ClipboardList, path: "/dashboard/feedback" },
    { name: "Raporlar", icon: BarChart2, path: "/dashboard/reports" },
    { name: "Şablonlar", icon: Wand2, path: "/dashboard/templates" },
    { name: "Organizasyonlar", icon: Building2, path: "/dashboard/organizations" },
    { name: "Profil", icon: UserRound, path: "/dashboard/profile" },
    { name: "Ayarlar", icon: Settings, path: "/dashboard/settings" },
  ];

  const isNavActive = (path: string) => (path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path));

  const mobilePrimaryItems = navItems.slice(0, MOBILE_PRIMARY_COUNT);
  const mobileOverflowItems = navItems.slice(MOBILE_PRIMARY_COUNT);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors duration-500 relative overflow-hidden selection:bg-violet-500/30 selection:text-violet-900 dark:selection:text-violet-200">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-violet-400/10 dark:bg-violet-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-[130px] mix-blend-multiply dark:mix-blend-screen opacity-60" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiLz4KPHBhdGggZD0iTTAgMEgxdjFIMHoiIGZpbGwtb3BhY2l0eT0iLjEiLz4KPC9zdmc+')] opacity-50 dark:opacity-20 mix-blend-overlay"></div>
      </div>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="relative z-40 hidden h-screen w-20 flex-shrink-0 flex-col border-r border-slate-200/50 bg-white/40 backdrop-blur-2xl transition-all duration-300 dark:border-white/10 dark:bg-black/20 md:flex lg:w-72">
        <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
          <Link href="/" className="flex items-center gap-4 group outline-none mb-10">
            <BrandLogo className="w-[150px] lg:w-[188px]" width={420} height={134} />
          </Link>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = isNavActive(item.path);
              const Icon = item.icon;
              const badge = item.badge ?? 0;
              return (
                <Link key={item.path} href={item.path} className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold text-sm ${isActive ? "bg-violet-600 text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)]" : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"}`}>
                  <Icon size={20} className={isActive ? "text-white" : ""} />
                  <span className="hidden lg:block">{item.name}</span>
                  {badge > 0 && (
                    <span className="ml-auto inline-flex min-h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-600 px-1.5 text-[10px] font-black leading-none text-white shadow-lg shadow-red-500/30 ring-2 ring-white dark:ring-slate-950">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 space-y-4 border-t border-slate-200/60 p-4 dark:border-white/10 lg:p-6">
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20">
              <ShieldAlert size={20} />
              <span className="hidden lg:block">Admin Paneli</span>
            </Link>
          )}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hidden lg:flex">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                {session?.user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{session?.user?.email}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{session?.user?.role}</p>
              </div>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT WRAPPER ── */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between p-4 sm:p-6 lg:p-8 bg-transparent">
          <div className="md:hidden flex items-center gap-3">
            <BrandLogo className="w-[132px]" width={420} height={134} />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-2xl border border-violet-200 bg-white/70 px-3 py-2 text-xs font-black text-violet-700 shadow-sm backdrop-blur-xl dark:border-violet-500/20 dark:bg-white/[0.05] dark:text-violet-200 sm:flex">
              <Crown size={14} />
              {planLabel(userSettings?.current_plan)}
            </div>
            <Link
              href="/pricing"
              className="hidden items-center gap-2 rounded-2xl border border-violet-200 bg-white/80 px-4 py-3 text-sm font-black text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-white/[0.05] dark:text-violet-200 dark:hover:bg-white/[0.08] lg:inline-flex"
            >
              <Crown size={15} />
              Paketini Yükselt
            </Link>
            <button onClick={() => planInfo?.at_qr_limit ? router.push("/pricing") : router.push("/dashboard/qrcodes/new")}
              title={planInfo?.at_qr_limit ? "QR limiti doldu — planı yükselt" : undefined}
              className={`hidden md:flex group relative items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all duration-300 overflow-hidden active:scale-95 ${planInfo?.at_qr_limit ? "opacity-70 cursor-not-allowed shadow-none" : "shadow-[0_8px_20px_-6px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_30px_-6px_rgba(124,58,237,0.7)] hover:-translate-y-0.5"}`}>
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 bg-[length:200%_auto] animate-shimmer" />
              <Plus size={16} strokeWidth={3} className="relative z-10" /> <span className="relative z-10">{planInfo?.at_qr_limit ? "Limit Doldu" : "Yeni QR Oluştur"}</span>
            </button>
            <Link href="/dashboard/messages"
              title="Bildirimler"
              aria-label={unreadMessageCount > 0 ? `Bildirimler, ${unreadMessageCount} okunmamış` : "Bildirimler"}
              className="relative p-2.5 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-md border border-slate-200/50 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all duration-300">
              <Bell size={18} />
              {unreadMessageCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
            </Link>
            <button onClick={toggleTheme}
              className="p-2.5 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-md border border-slate-200/50 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all duration-300">
              {isDark ? <Sun size={18} className="hover:text-yellow-400 transition-colors" /> : <Moon size={18} className="hover:text-indigo-500 transition-colors" />}
            </button>
            {session?.user && (
              <div className="md:hidden">
                <ProfileMenu
                  email={session.user.email || "User"}
                  role={(session.user.role as "owner" | "admin" | "user") ?? "user"}
                  onLogout={() => signOut({ callbackUrl: "/login" })}
                  avatarUrl={session.user.image}
                />
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-28 md:pb-12 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-12">
            {children}
          </div>
        </main>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/70 bg-white/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#030712]/90 md:hidden">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {mobilePrimaryItems.map((item) => {
              const isActive = isNavActive(item.path);
              const Icon = item.icon;
              const badge = item.badge ?? 0;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`relative flex min-w-[86px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-black transition-all ${
                    isActive
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  }`}
                >
                  {badge > 0 && (
                    <span className="absolute right-1.5 top-1.5 inline-flex min-h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-600 px-1 text-[9px] font-black leading-none text-white shadow-lg shadow-red-500/30 ring-2 ring-white dark:ring-slate-950">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                  <Icon size={16} />
                  <span className="max-w-full truncate">{item.name}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreMenuOpen(true)}
              className={`relative flex min-w-[86px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-black transition-all ${
                mobileOverflowItems.some((item) => isNavActive(item.path))
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              <Menu size={16} />
              <span className="max-w-full truncate">Daha Fazla</span>
            </button>
          </div>
        </nav>
      </div>

      {/* ── "DAHA FAZLA" DRAWER (mobile overflow menu) ── */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-[200] md:hidden">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fadein"
            onClick={() => setMoreMenuOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-[2rem] border-t border-slate-200 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl animate-fadeup dark:border-white/10 dark:bg-slate-950">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-black text-slate-900 dark:text-white">Daha Fazla</p>
              <button onClick={() => setMoreMenuOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mobileOverflowItems.map((item) => {
                const isActive = isNavActive(item.path);
                const Icon = item.icon;
                const badge = item.badge ?? 0;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMoreMenuOpen(false)}
                    className={`relative flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
                      isActive
                        ? "border-violet-500 bg-violet-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="truncate">{item.name}</span>
                    {badge > 0 && (
                      <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-600 px-1 text-[9px] font-black text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMoreMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  <ShieldAlert size={16} />
                  Admin Paneli
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
