import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata("Panel");

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
