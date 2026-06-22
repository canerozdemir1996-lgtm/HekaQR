import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
