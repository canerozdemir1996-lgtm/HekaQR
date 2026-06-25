import type { Metadata } from "next";
import SignupPageClient from "./SignupPageClient";

export const metadata: Metadata = {
  title: "Ücretsiz Üye Ol",
  description: "QR Publish'e ücretsiz kaydolun ve saniyeler içinde dinamik QR kodları, dijital kartvizitler ve landing page'ler oluşturmaya başlayın.",
};

export default function SignupPage() {
  return <SignupPageClient />;
}
