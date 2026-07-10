import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata("Hesap Güvenliği");

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
