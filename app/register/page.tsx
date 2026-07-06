import type { Metadata } from "next";
import SignupPageClient from "../signup/SignupPageClient";

export const metadata: Metadata = {
  title: "Ücretsiz Üye Ol",
  description: "QR Publish'e ücretsiz kaydolun ve dinamik QR kodlarınızı yönetmeye başlayın.",
};

export default function RegisterPage() {
  return <SignupPageClient />;
}
