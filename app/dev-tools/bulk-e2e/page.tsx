import { notFound } from "next/navigation";
import { BulkSection } from "@/components/BulkSection";
import { buildNoIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = buildNoIndexMetadata("Bulk E2E Test Aracı");

export default function BulkE2EHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  return <BulkSection isDark={true} />;
}
