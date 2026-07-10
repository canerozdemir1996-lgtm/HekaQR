import SignupPageClient from "../signup/SignupPageClient";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata("Ücretsiz Üye Ol");

export default function RegisterPage() {
  return <SignupPageClient />;
}
