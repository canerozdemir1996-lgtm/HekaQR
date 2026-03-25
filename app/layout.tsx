import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

// ── REACT 19 + THREE.JS TYPE FIX ──
// React 19, JSX namespace'ini değiştirdiği için Three.js elementlerini
// global olarak manuel tanımlamamız gerekiyor.
import type { ThreeElements } from "@react-three/fiber";
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
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// ── VIEWPORT & MOBİL OPTİMİZASYON ──
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Mobil cihazlarda input'a tıklayınca otomatik zoom'u engeller
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" }
  ],
  colorScheme: "dark light",
};

// ── GELİŞMİŞ SEO & METADATA ──
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://hekaqr.com"),
  title: {
    default: "HekaQR | Yeni Nesil Akıllı Bağlantı Merkezi",
    template: "%s | HekaQR"
  },
  description: "Dinamik yönlendirme, gerçek zamanlı A/B testleri, ileri düzey analitik ve 3D destekli vCard sayfaları ile dönüşüm oranlarınızı zirveye taşıyın.",
  keywords: ["QR Kod", "Dinamik QR", "vCard", "Analytics", "Pazarlama", "Akıllı Link", "A/B Test"],
  authors: [{ name: "HekaTech", url: "https://hekaqr.com" }],
  creator: "HekaTech",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%236d28d9'/><text y='.9em' font-size='70' x='10'>⬛</text></svg>",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://hekaqr.com",
    title: "HekaQR | Geleceğin QR Platformu",
    description: "2026 standartlarında akıllı yönlendirmeler ve detaylı analitik sunan profesyonel QR kod yönetim paneli.",
    siteName: "HekaQR Platform",
  },
  twitter: {
    card: "summary_large_image",
    title: "HekaQR | Geleceğin QR Platformu",
    description: "Dinamik QR kodlarınızı saniyeler içinde tasarlayın ve yönetin.",
    creator: "@hekaqr",
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen bg-slate-50 dark:bg-[#030712] font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-violet-500/30 selection:text-violet-900 dark:selection:text-violet-200 overflow-x-hidden">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
