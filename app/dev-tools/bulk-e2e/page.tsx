import { notFound } from "next/navigation";
import { BulkSection } from "@/components/BulkSection";

export const dynamic = "force-dynamic";

export default function BulkE2EHarnessPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BulkSection isDark={true} />;
}
