import type { Metadata } from "next";
import LoginPageClient from "./LoginPageClient";

export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "QR Publish hesabınıza giriş yapın ve dinamik QR kodlarınızı, analitiklerinizi ve landing page'lerinizi yönetin.",
};

export default function LoginPage() {
  return <LoginPageClient />;
}
