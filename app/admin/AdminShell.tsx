"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSupabaseSession";
import {
  ShieldCheck, LayoutDashboard, Users, BarChart2, Mail, ArrowLeft, Loader2, BadgeDollarSign, DatabaseBackup, ScrollText, MessageSquareText, HeartPulse, FlaskConical,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import HorizontalScroller from "@/components/HorizontalScroller";

const NAV_ITEMS = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/analytics", label: "Analitik", icon: BarChart2 },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/admin/messages", label: "Mesajlar", icon: Mail },
  { href: "/admin/sms", label: "SMS Gönder", icon: MessageSquareText, ownerOnly: true },
  { href: "/admin/pricing", label: "Fiyatlandırma", icon: BadgeDollarSign },
  { href: "/admin/billing", label: "Billing Health", icon: HeartPulse },
  { href: "/admin/tests", label: "Testler", icon: FlaskConical },
  // Owner-only — listede koşullu eklenir, admin rolüne hiç gösterilmez.
  { href: "/admin/backups", label: "Yedekler", icon: DatabaseBackup, ownerOnly: true },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const role = session?.user?.role;
  const isAuthorized = status === "authenticated" && (role === "admin" || role === "owner");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || (role !== "admin" && role !== "owner")) {
      router.push("/login");
      return;
    }
  }, [status, role, router]);

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.ownerOnly || role === "owner");

  const sub = isDark ? "text-slate-500" : "text-slate-500";

  if (!isAuthorized) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg">
      <header className={`sticky top-0 z-30 border-b ${isDark ? "glass-dark border-white/10" : "glass-light border-slate-200"} backdrop-blur-2xl`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:flex-nowrap">
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => router.push("/dashboard")}
              type="button"
              aria-label="Dashboard'a dön"
              title="Dashboard'a dön"
              className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${isDark ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <ArrowLeft size={15} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className={`font-black text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>Admin Paneli</span>
          </div>

          <nav aria-label="Admin bölümleri" className="order-2 w-full min-w-0 lg:order-none lg:flex-1">
            <HorizontalScroller
              ariaLabel="Admin bölümleri, yatay kaydırılabilir"
              showArrows
              scrollPadding="sm"
              className={`max-w-full min-w-0 rounded-2xl border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}
              contentClassName="gap-1 py-1"
              itemClassName="snap-start"
              viewportClassName="snap-x snap-mandatory"
              fadeClassName={isDark ? "from-slate-950" : "from-slate-50"}
            >
              {visibleNavItems.map(item => {
                const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}
                    prefetch={item.href === "/admin/analytics" || item.href === "/admin/messages" ? false : undefined}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                      active
                        ? "bg-violet-600 text-white shadow-sm"
                        : `${sub} hover:text-violet-400`
                    }`}>
                    <Icon size={14} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </HorizontalScroller>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
