import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import AdminShell from "./AdminShell";

export const metadata: Metadata = {
  title: "Admin Paneli",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || (role !== "admin" && role !== "owner")) {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
