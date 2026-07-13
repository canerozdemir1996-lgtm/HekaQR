import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import ClientProviders from "@/components/ClientProviders";
import iconImage from "@/Icon.webp";

// ── REACT 19 + THREE.JS TYPE FIX ──
// React 19, JSX namespace'ini değiştirdiği için Three.js elementlerini
// global olarak manuel tanımlamamız gerekiyor.
import type { ThreeElements } from "@react-three/fiber";
import { getPublicAppOrigin } from "@/lib/publicOrigin";
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

// ── 2026 TIPOGRAFİ STANDARDİ: Variable Font ──
// Tek bir font dosyası üzerinden tüm ağırlıklar (100-900) yüklenir. CLS sorununu engeller.
const inter = Inter({
  // "latin-ext" subset'i Türk Lirası ₺ (U+20BA) glifini içerir; yalnızca "latin"
  // subset'i ₺'yi dışarıda bırakıp tarayıcıyı yanlış glife (Ł) düşürüyordu.
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

const publicAppUrl = getPublicAppOrigin();
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-1GJ4B70L6E";

// ── VIEWPORT & MOBİL OPTİMİZASYON ──
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" }
  ],
  colorScheme: "dark light",
};

// ── GELİŞMİŞ SEO & METADATA ──
export const metadata: Metadata = {
  metadataBase: new URL(publicAppUrl),
  manifest: "/manifest.webmanifest",
  title: {
    default: "QR Publish — QR Kodlarınızı Yayınlayın, Yönetin ve Ölçün",
    template: "%s | QR Publish"
  },
  description: "Dinamik QR, restoran menüsü, dijital kartvizit ve gerçek zamanlı tarama analitiği — hepsi tek panelde. Ücretsiz deneyin.",
  keywords: ["QR Kod", "Dinamik QR", "vCard", "Analytics", "Pazarlama", "Akıllı Link", "A/B Test"],
  authors: [{ name: "QR Publish", url: publicAppUrl }],
  creator: "QR Publish",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      { url: iconImage.src, type: "image/webp", sizes: `${iconImage.width}x${iconImage.height}` },
    ],
    shortcut: [{ url: iconImage.src, type: "image/webp", sizes: `${iconImage.width}x${iconImage.height}` }],
    apple: [{ url: iconImage.src, type: "image/webp", sizes: `${iconImage.width}x${iconImage.height}` }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "QR Publish",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `try{var t=localStorage.getItem('qrhub-theme')||'light';document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.setAttribute('data-theme',t);}catch(e){}`;
  return (
    <html lang="tr" suppressHydrationWarning className={`${inter.variable} scroll-smooth`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#030712] font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-violet-500/30 selection:text-violet-900 dark:selection:text-violet-200 overflow-x-hidden">
        {gaMeasurementId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',${JSON.stringify(gaMeasurementId)},{anonymize_ip:true});`}
            </Script>
          </>
        ) : null}
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
