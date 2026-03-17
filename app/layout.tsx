import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "QR Hub — Dinamik QR Kod Yönetimi",
  description: "Meta Pixel, UTM, A/B test, vCard landing page. Supabase + Next.js.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%236d28d9'/><text y='.9em' font-size='70' x='10'>⬛</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`antialiased ${inter.className}`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
