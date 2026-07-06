import type { Metadata } from "next";
import ResetPasswordPage from "../auth/reset/page";

export const metadata: Metadata = {
  title: "Şifremi Unuttum",
  description: "QR Publish hesabınız için şifre sıfırlama bağlantısı isteyin.",
};

export default function ForgotPasswordPage() {
  return <ResetPasswordPage />;
}
