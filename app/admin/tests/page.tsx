import { adminTestCatalog } from "@/lib/generated-test-catalog";
import { createAdminTestToken } from "@/lib/admin-test-token";
import AdminTestsClient from "./AdminTestsClient";

export const dynamic = "force-dynamic";

export default function AdminTestsPage() {
  return <AdminTestsClient catalog={adminTestCatalog} runToken={createAdminTestToken()} />;
}
