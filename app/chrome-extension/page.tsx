import Link from "next/link";
import { ExtensionInstallGuide } from "@/components/extension/ExtensionInstallGuide";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "QR Publish Chrome Eklentisi Kurulumu",
  description: "QR Publish Chrome Extension demo sürümünü geliştirici modunda kurmak için adım adım rehber.",
  path: "/chrome-extension",
});

export default function ChromeExtensionPage() {
  return (
    <PublicSiteShell
      mainClassName="mx-auto w-full max-w-4xl px-6 py-12"
      headerAction={
        <Link
            href="/downloads/qr-publish-chrome-extension-v1.1.0.zip"
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Demo v1 İndir
          </Link>
      }
    >
      <ExtensionInstallGuide />
    </PublicSiteShell>
  );
}
