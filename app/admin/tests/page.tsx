import { adminTestCatalog } from "@/lib/generated-test-catalog";
import AdminTestsClient from "./AdminTestsClient";

export default function AdminTestsPage() {
  return <AdminTestsClient catalog={adminTestCatalog} />;
}
