import { redirect } from "next/navigation";

export default function BulkPage() {
  redirect("/dashboard/qrcodes/new?mode=bulk");
}
