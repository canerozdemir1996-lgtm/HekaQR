import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata("QR Kod Yazdırma");

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
