import ResetPasswordPage from "../auth/reset/page";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata("Şifremi Unuttum");

export default function ForgotPasswordPage() {
  return <ResetPasswordPage />;
}
