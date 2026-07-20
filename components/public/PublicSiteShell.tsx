import type { ReactNode } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import LogoRenderer from "@/components/LogoRenderer";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/#features", label: "Özellikler" },
  { href: "/pricing", label: "Fiyatlar" },
  { href: "/blog", label: "Rehber" },
  { href: "/support", label: "Destek" },
  { href: "/contact", label: "İletişim" },
] as const;

const footerGroups = [
  {
    title: "Ürün",
    links: [
      { href: "/#features", label: "Özellikler" },
      { href: "/pricing", label: "Fiyatlar" },
      { href: "/chrome-extension", label: "Chrome eklentisi" },
      { href: "/developers", label: "API dokümantasyonu" },
    ],
  },
  {
    title: "Yardım",
    links: [
      { href: "/blog", label: "Rehber" },
      { href: "/support", label: "Destek merkezi" },
      { href: "/contact", label: "İletişim" },
      { href: "/status", label: "Sistem durumu" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { href: "/privacy", label: "Gizlilik" },
      { href: "/terms", label: "Kullanım şartları" },
      { href: "/cookie-policy", label: "Çerez politikası" },
      { href: "/license", label: "Lisans" },
    ],
  },
] as const;

type PublicSiteShellProps = {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  headerAction?: ReactNode;
};

function BrandLink({ priority = false }: { priority?: boolean }) {
  return (
    <Link href="/" aria-label="QR Publish ana sayfa" className="inline-flex shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950">
      <LogoRenderer priority={priority} frame size="sm" className="h-11 w-36 rounded-xl bg-white p-1.5 ring-slate-200 dark:bg-white dark:ring-white/20" />
    </Link>
  );
}

function HeaderNavLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      {primaryLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "font-bold text-slate-600 transition hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-300 dark:hover:text-violet-300",
            mobile ? "flex min-h-11 items-center rounded-xl px-3 text-sm hover:bg-violet-50 dark:hover:bg-white/5" : "rounded-md text-sm",
          )}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

export function PublicSiteHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 text-slate-950 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 dark:text-white">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <BrandLink priority />

        <nav aria-label="Ana navigasyon" className="ml-auto hidden items-center gap-5 xl:flex">
          <HeaderNavLinks />
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex xl:ml-1">
          {action ? <div className="hidden xl:block">{action}</div> : null}
          <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-200 dark:focus-visible:ring-offset-slate-950">
            Panel
          </Link>
        </div>

        <details className="group relative ml-auto xl:hidden">
          <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Navigasyon menüsünü aç veya kapat</span>
            <Menu aria-hidden="true" size={20} className="group-open:hidden" />
            <X aria-hidden="true" size={20} className="hidden group-open:block" />
          </summary>
          <div className="absolute right-0 top-[calc(100%+0.75rem)] w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/15 dark:border-white/10 dark:bg-slate-950">
            <nav aria-label="Mobil ana navigasyon" className="grid gap-1">
              <HeaderNavLinks mobile />
            </nav>
            <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
              {action ? <div className="[&>*]:flex [&>*]:w-full [&>*]:justify-center">{action}</div> : null}
              <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-200">
                Panele Git
              </Link>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <BrandLink />
          <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            Markanızı büyüten, ölçülebilir ve yönetilebilir QR kod deneyimleri oluşturun.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={`${group.title} bağlantıları`}>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm font-semibold text-slate-600 transition hover:text-violet-700 dark:text-slate-300 dark:hover:text-violet-300">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-200 px-4 py-5 text-center text-xs font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
        © QR Publish. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}

export function PublicSiteShell({ children, className, mainClassName, headerAction }: PublicSiteShellProps) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-slate-50 text-slate-950 dark:bg-[#030712] dark:text-white", className)}>
      <PublicSiteHeader action={headerAction} />
      <main className={cn("min-w-0 flex-1", mainClassName)}>{children}</main>
      <PublicSiteFooter />
    </div>
  );
}
