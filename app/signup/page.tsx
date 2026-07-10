import SignupPageClient from "./SignupPageClient";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata(
  "Ücretsiz Üye Ol",
  "QR Publish hesabı oluşturun ve QR kodlarınızı yönetmeye başlayın.",
);

export default function SignupPage() {
  return <SignupPageClient />;
}
