import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata("Giriş Yap");

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
