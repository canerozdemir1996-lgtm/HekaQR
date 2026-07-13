import Link from "next/link";
import { ExtensionInstallGuide } from "@/components/extension/ExtensionInstallGuide";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "QR Publish Chrome Eklentisi Kurulumu",
  description: "QR Publish Chrome Extension demo sürümünü geliştirici modunda kurmak için adım adım rehber.",
  path: "/chrome-extension",
});

export default function ChromeExtensionPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">
      <header className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-black text-violet-600 hover:text-violet-500">
            ← QR Publish
          </Link>
          <Link
            href="/downloads/qr-publish-chrome-extension-v1.1.0.zip"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Demo v1 İndir
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <ExtensionInstallGuide />
      </main>
    </div>
  );
}
