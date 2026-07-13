import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { roleFromMetadata } from "@/lib/auth";
import { getMFAStatus } from "@/lib/services/mfaService";
import AdminShell from "./AdminShell";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata("Admin Paneli");

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? roleFromMetadata(user) : undefined;
  if (!user || (role !== "admin" && role !== "owner")) {
    redirect("/login");
  }

  const mfaStatus = await getMFAStatus(user.id);
  if (!mfaStatus?.mfa_enabled || !mfaStatus?.verified) {
    redirect("/dashboard/settings?mfa_required=admin");
  }

  return <AdminShell>{children}</AdminShell>;
}
