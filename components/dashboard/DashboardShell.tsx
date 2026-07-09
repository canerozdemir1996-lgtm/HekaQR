"use client";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOutAndRedirect as signOut } from "@/lib/auth-client";
import { useSession } from "@/hooks/useSupabaseSession";
import Link from "next/link";
import {
  Plus, Sun, Moon, LogOut, Settings, LayoutGrid, FolderKanban, ShoppingBag,
  CalendarCheck, ClipboardList, BarChart2, Wand2, Building2, UserRound, UserPlus,
  ShieldAlert, Bell, Crown, Menu, X, Puzzle, FileQuestion,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { useTheme } from "@/lib/theme";
import { ProfileMenu } from "@/components/ProfileMenu";
import { fetchDashboardPlanInfo, getOrCreateSettings, type DashboardPlanInfo, type UserSettings } from "@/lib/supabase";

async function fetchPendingMenuOrderCount() {
  const response = await fetch("/api/v1/menu-orders?scope=all&status=new&limit=20&page=1", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return 0;
  const body = await response.json().catch(() => ({}));
  if (typeof body?.pagination?.total === "number") return body.pagination.total;
  const orders = Array.isArray(body.orders) ? body.orders : [];
  return orders.filter((order: { status?: string }) => order.status === "new").length;
}

async function fetchPendingSubmissionCount(path: "feedback" | "bookings") {
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);
  const query = new URLSearchParams({ from: from.toISOString().slice(0, 10), to: today, status: "new", limit: "1", page: "1" });
  if (path === "feedback") query.set("type", "all");
  const response = await fetch(`/api/v1/${path}?${query}`, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return 0;
  const body = await response.json().catch(() => ({}));
  return typeof body?.pagination?.total === "number" ? body.pagination.total : 0;
}

function planLabel(plan?: string | null) {
  if (!plan) return null;
  const normalized = plan.toLowerCase();
  const labels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    business: "Business",
    enterprise: "Enterprise",
    vip: "VIP",
  };
  return labels[normalized] ?? normalized.toUpperCase();
}

function notificationPreview(value?: string | null) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

type NavItem = { name: string; icon: typeof LayoutGrid; path: string; badge?: number };
type PlanInfo = DashboardPlanInfo;
type SessionSnapshot = {
  email?: string | null;
  role?: string | null;
  image?: string | null;
};
type DashboardIdentitySnapshot = {
  userSettings: UserSettings | null;
  planInfo: PlanInfo | null;
};

const MOBILE_PRIMARY_COUNT = 4;
let dashboardIdentitySnapshot: DashboardIdentitySnapshot | null = null;
let dashboardIdentityPromise: Promise<DashboardIdentitySnapshot> | null = null;
let dashboardSessionSnapshot: SessionSnapshot | null = null;

function getDashboardIdentity() {
  if (dashboardIdentityPromise) return dashboardIdentityPromise;

  dashboardIdentityPromise = Promise.all([
    getOrCreateSettings().catch(() => null),
    fetchDashboardPlanInfo().catch(() => null),
  ]).then(([userSettings, planInfo]) => {
    const snapshot = { userSettings, planInfo };
    dashboardIdentitySnapshot = snapshot;
    return snapshot;
  });

  return dashboardIdentityPromise;
}

function HeaderBadgeSkeleton() {
  return <div className="hidden h-10 w-24 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10 sm:block" />;
}

function SidebarUserSkeleton() {
  return (
    <div className="hidden items-center justify-between rounded-2xl border border-slate-200/50 bg-slate-100/60 px-4 py-3 dark:border-white/10 dark:bg-white/5 lg:flex">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="space-y-1.5">
          <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-2.5 w-16 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
      <div className="h-4 w-4 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

function MobileProfileSkeleton() {
  return <div className="h-9 w-12 animate-pulse rounded-lg border border-slate-200 dark:border-white/10 dark:bg-white/5" />;
}

function preserveSessionUser(
  sessionUser: { email?: string | null; role?: string | null; image?: string | null } | null | undefined,
  fallback: SessionSnapshot | null,
): SessionSnapshot | null {
  if (sessionUser) {
    return {
      email: sessionUser.email,
      role: (sessionUser.role as string | undefined) ?? null,
      image: sessionUser.image,
    };
  }

  return fallback;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const unreadMessageCount = useUnreadMessageCount();

  const [userSettings, setUserSettings] = useState<UserSettings | null>(dashboardIdentitySnapshot?.userSettings ?? null);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [pendingBookingCount, setPendingBookingCount] = useState(0);
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [recentMessages, setRecentMessages] = useState<Array<{ id: string; title: string | null; body: string | null; read_at: string | null }>>([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(dashboardIdentitySnapshot?.planInfo ?? null);
  const [identityLoading, setIdentityLoading] = useState(!dashboardIdentitySnapshot);
  const [sessionSnapshot, setSessionSnapshot] = useState<SessionSnapshot | null>(dashboardSessionSnapshot);

  const refreshPendingOrders = useCallback(async () => {
    const [orders, bookings, feedback] = await Promise.all([
      fetchPendingMenuOrderCount().catch(() => 0),
      fetchPendingSubmissionCount("bookings").catch(() => 0),
      fetchPendingSubmissionCount("feedback").catch(() => 0),
    ]);
    setPendingOrderCount(orders);
    setPendingBookingCount(bookings);
    setPendingFeedbackCount(feedback);
  }, []);

  const loadRecentMessages = useCallback(async () => {
    const response = await fetch("/api/v1/messages", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const payload = await response.json().catch(() => ({}));
    setRecentMessages(Array.isArray(payload.messages) ? payload.messages.slice(0, 6) : []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void refreshPendingOrders();

    if (dashboardIdentitySnapshot) {
      setUserSettings(dashboardIdentitySnapshot.userSettings);
      setPlanInfo(dashboardIdentitySnapshot.planInfo);
      setIdentityLoading(false);
    }

    void getDashboardIdentity()
      .then((snapshot) => {
        if (cancelled) return;
        setUserSettings(snapshot.userSettings);
        setPlanInfo(snapshot.planInfo);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIdentityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshPendingOrders]);

  useEffect(() => {
    const interval = window.setInterval(() => void refreshPendingOrders(), 60000);
    return () => window.clearInterval(interval);
  }, [refreshPendingOrders]);

  useEffect(() => {
    const onRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ entity?: string }>).detail;
      if (detail?.entity === "feedback" || detail?.entity === "booking") void refreshPendingOrders();
      if (detail?.entity === "message") void loadRecentMessages();
    };
    window.addEventListener("qrpublish:dashboard-change", onRealtime);
    return () => window.removeEventListener("qrpublish:dashboard-change", onRealtime);
  }, [loadRecentMessages, refreshPendingOrders]);

  useEffect(() => {
    setMoreMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (session?.user) {
      const snapshot = {
        email: session.user.email,
        role: (session.user.role as string | undefined) ?? null,
        image: session.user.image,
      };
      dashboardSessionSnapshot = snapshot;
      setSessionSnapshot(snapshot);
    }
  }, [session]);

  const currentUser = preserveSessionUser(session?.user, sessionSnapshot);
  const currentRole = currentUser?.role ?? null;
  const isAdmin = currentRole === "admin" || currentRole === "owner";
  const planBadge = planInfo?.plan_label || planLabel(userSettings?.current_plan);

  const navItems: NavItem[] = [
    { name: "Genel Bakış", icon: LayoutGrid, path: "/dashboard" },
    { name: "Kampanyalar", icon: FolderKanban, path: "/dashboard/campaigns" },
    { name: "Klasörler", icon: FolderKanban, path: "/dashboard/folders" },
    { name: "Siparişler", icon: ShoppingBag, path: "/dashboard/orders", badge: pendingOrderCount },
    { name: "Rezervasyonlar", icon: CalendarCheck, path: "/dashboard/bookings", badge: pendingBookingCount },
    { name: "Geri Bildirimler", icon: ClipboardList, path: "/dashboard/feedback", badge: pendingFeedbackCount },
    { name: "Sınavlar", icon: FileQuestion, path: "/dashboard/exams" },
    { name: "Leadler", icon: UserPlus, path: "/dashboard/leads" },
    { name: "Raporlar", icon: BarChart2, path: "/dashboard/reports" },
    { name: "Şablonlar", icon: Wand2, path: "/dashboard/templates" },
    { name: "Organizasyonlar", icon: Building2, path: "/dashboard/organizations" },
    { name: "Profil", icon: UserRound, path: "/dashboard/profile" },
    { name: "Ayarlar", icon: Settings, path: "/dashboard/settings" },
  ];

  const isNavActive = (path: string) => (path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path));

  const mobilePrimaryItems = navItems.slice(0, MOBILE_PRIMARY_COUNT);
  const mobileOverflowItems = navItems.slice(MOBILE_PRIMARY_COUNT);

  const sidebarNavRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = sidebarNavRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[data-active="true"]');
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pathname]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text-primary)] selection:bg-violet-500/25">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="relative z-40 hidden h-screen w-20 flex-shrink-0 flex-col border-r border-[var(--border-color)] bg-[var(--card-bg)] transition-[width] duration-200 md:flex lg:w-72">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10">
            <Link href="/" prefetch={false} className="flex items-center gap-4 group outline-none mb-10">
              <BrandLogo className="w-[150px] lg:w-[188px]" width={420} height={134} />
            </Link>

            <nav ref={sidebarNavRef} className="space-y-2">
              {navItems.map((item) => {
                const isActive = isNavActive(item.path);
                const Icon = item.icon;
                const badge = item.badge ?? 0;
                return (
                  <Link key={item.path} href={item.path} prefetch={false} data-active={isActive ? "true" : undefined} className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold text-sm ${isActive ? "bg-violet-600 text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)]" : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"}`}>
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
          {/* Fade gradient to hint there are more items below */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--card-bg)] to-transparent" />
        </div>

        <div className="shrink-0 space-y-4 border-t border-slate-200/60 p-4 dark:border-white/10 lg:p-6">
          <Link
            href="/chrome-extension"
            prefetch={false}
            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold text-sm text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
          >
            <Puzzle size={20} />
            <span className="hidden lg:block">Chrome Extension</span>
          </Link>
          {status === "loading" && !currentUser ? (
            <div className="h-[54px] animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/10" />
          ) : isAdmin ? (
            <Link href="/admin" prefetch={false} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20">
              <ShieldAlert size={20} />
              <span className="hidden lg:block">Admin Paneli</span>
            </Link>
          ) : null}
          {status === "loading" && !currentUser ? (
            <SidebarUserSkeleton />
          ) : currentUser ? (
            <div className="hidden items-center justify-between rounded-2xl border border-slate-200/50 bg-slate-100/50 px-4 py-3 dark:border-white/10 dark:bg-white/5 lg:flex">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
                  {currentUser.email?.charAt(0).toUpperCase() ?? "U"}
                </div>
                <div className="overflow-hidden">
                  <p className="max-w-[120px] truncate text-xs font-bold text-slate-900 dark:text-white">{currentUser.email}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">{currentRole ?? "user"}</p>
                </div>
              </div>
              <button onClick={() => signOut({ callbackUrl: "/login" })} aria-label="Çıkış yap" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                <LogOut size={16} />
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* ── MAIN CONTENT WRAPPER ── */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        {/* Top Header */}
        <header className="flex min-h-16 items-center justify-between border-b border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-3 sm:px-6 lg:px-8">
          <div className="md:hidden flex items-center gap-3">
            <BrandLogo className="w-[132px]" width={420} height={134} />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {identityLoading && !planBadge ? (
              <HeaderBadgeSkeleton />
            ) : planBadge ? (
              <div className="dashboard-action hidden border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)] sm:flex">
                <Crown size={14} />
                {planBadge}
              </div>
            ) : null}
            <Link
              href="/pricing"
              prefetch={false}
              className="dashboard-action hidden border border-violet-200 bg-[var(--card-bg)] text-violet-700 hover:bg-violet-50 dark:border-violet-500/25 dark:text-violet-200 dark:hover:bg-violet-500/10 lg:inline-flex"
            >
              <Crown size={15} />
              Paketini Yükselt
            </Link>
            <button onClick={() => planInfo?.at_qr_limit ? router.push("/pricing") : router.push("/dashboard/qrcodes/new")}
              title={planInfo?.at_qr_limit ? "QR limiti doldu — planı yükselt" : undefined}
              className={`dashboard-action relative hidden overflow-hidden bg-violet-600 text-white hover:bg-violet-500 md:flex ${planInfo?.at_qr_limit ? "cursor-not-allowed opacity-70" : ""}`}>
              <div className="absolute inset-0 bg-violet-600" />
              <Plus size={16} strokeWidth={3} className="relative z-10" /> <span className="relative z-10">{planInfo?.at_qr_limit ? "Limit Doldu" : "Yeni QR Oluştur"}</span>
            </button>
            <div className="relative">
            <button type="button" onClick={() => { setNotificationOpen(open => !open); void loadRecentMessages(); }}
              title="Bildirimler"
              aria-label={unreadMessageCount > 0 ? `Bildirimler, ${unreadMessageCount} okunmamış` : "Bildirimler"}
              className="dashboard-icon-button relative">
              <Bell size={18} />
              {unreadMessageCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
            </button>
            {notificationOpen && (
              <div className="dashboard-card absolute right-0 top-12 z-[80] w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-2">
                <div className="flex items-center justify-between px-2 py-2"><p className="text-sm font-black">Bildirimler</p><Link href="/dashboard/messages" prefetch={false} onClick={() => setNotificationOpen(false)} className="text-xs font-bold text-violet-600">Tümünü gör</Link></div>
                <div className="max-h-80 overflow-y-auto">
                  {recentMessages.length === 0 ? <p className="px-3 py-6 text-center text-xs font-semibold text-[var(--text-secondary)]">Yeni bildirim yok.</p> : recentMessages.map(message => {
                    const text = `${message.title ?? ""} ${message.body ?? ""}`.toLocaleLowerCase("tr-TR");
                    const href = text.includes("rezervasyon") ? "/dashboard/bookings" : text.includes("geri bildirim") ? "/dashboard/feedback" : text.includes("sipariş") ? "/dashboard/orders" : "/dashboard/messages";
                    return <Link key={message.id} href={href} prefetch={false} onClick={() => { setNotificationOpen(false); void fetch(`/api/v1/messages?id=${encodeURIComponent(message.id)}&action=read`, { method: "PATCH" }); }} className="block rounded-xl px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5"><p className="truncate text-xs font-black">{message.title || "Bildirim"}</p><p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-secondary)]">{notificationPreview(message.body)}</p></Link>;
                  })}
                </div>
              </div>
            )}
            </div>
            <button type="button" onClick={toggleTheme} aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
              className="dashboard-icon-button">
              {isDark ? <Sun size={18} className="hover:text-yellow-400 transition-colors" /> : <Moon size={18} className="hover:text-indigo-500 transition-colors" />}
            </button>
            {status === "loading" && !currentUser ? (
              <div className="md:hidden">
                <MobileProfileSkeleton />
              </div>
            ) : currentUser ? (
              <div className="md:hidden">
                <ProfileMenu
                  email={currentUser.email || "User"}
                  role={(currentRole as "owner" | "admin" | "user" | null) ?? "user"}
                  onLogout={() => signOut({ callbackUrl: "/login" })}
                  avatarUrl={currentUser.image}
                />
              </div>
            ) : null}
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="custom-scrollbar flex-1 overflow-y-auto px-[var(--page-padding)] pb-28 md:pb-12">
          <div className="dashboard-page space-y-6">
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
                  prefetch={false}
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
              <button onClick={() => setMoreMenuOpen(false)} aria-label="Kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white">
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
                    prefetch={false}
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
                  prefetch={false}
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
