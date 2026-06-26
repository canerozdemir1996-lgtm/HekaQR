import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Kullanım Şartları | QR Publish",
  description: "QR Publish platformunun kullanımı sırasında uyulması gereken temel kuralları, hesap sorumluluklarını ve hizmet sınırlarını açıklar.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Kullanım"
      title="Kullanım Şartları ve Aydınlatma Metni"
      description="Bu sayfa, QR Publish platformunun kullanımı sırasında uyulması gereken temel kuralları, hesap sorumluluklarını ve hizmet sınırlarını açıklar."
      updatedAt="25.06.2026"
      sections={[
        {
          title: "1. Hizmet tanımı",
          paragraphs: [
            "QR Publish; dinamik QR oluşturma, landing page yayınlama, menü, rezervasyon, geri bildirim, kartvizit ve raporlama modüllerini tek panelde yönetmek için sunulan bir SaaS platformudur.",
            "Hizmet kapsamı zamanla genişleyebilir, daralabilir veya ücretli planlara göre farklılaşabilir.",
          ],
        },
        {
          title: "2. Hesap sorumluluğu",
          paragraphs: [
            "Kullanıcı, hesap bilgilerinin doğruluğundan, oturum bilgilerinin korunmasından ve kendi hesabı üzerinden gerçekleştirilen işlemlerden sorumludur.",
            "Yetkisiz erişim veya güvenlik ihlali şüphelerinde platform sahibine geciktirmeden bildirim yapılmalıdır.",
          ],
        },
        {
          title: "3. İzin verilen ve yasaklı kullanımlar",
          paragraphs: [
            "Platform, hukuka uygun iş süreçleri, kampanya yayınları, dijital menü, kartvizit ve bilgilendirme içerikleri için kullanılabilir.",
            "Aldatıcı, zararlı, phishing niteliğinde, mevzuata aykırı veya üçüncü kişilerin haklarını ihlal eden içerik ve yönlendirmeler yasaktır.",
          ],
        },
        {
          title: "4. Planlar, sınırlar ve süreklilik",
          paragraphs: [
            "Ücretsiz ve ücretli planlarda QR sayısı, domain, entegrasyon, analitik ve beyaz etiket gibi özellik sınırları uygulanabilir.",
            "Bakım, güvenlik veya teknik zorunluluk hallerinde hizmete geçici erişim kesintileri olabilir.",
          ],
        },
        {
          title: "5. Fikri mülkiyet ve sorumluluk sınırı",
          paragraphs: [
            "Platformun yazılım, arayüz, marka ve ilgili materyalleri hizmet sağlayıcıya aittir. Kullanıcı, sadece kendisine tanınan lisans kapsamında kullanım hakkı elde eder.",
            "Hizmet, makul teknik güvenlik ve süreklilik hedefleriyle sunulur; dolaylı zararlar, veri kaybı veya üçüncü taraf kesintileri için mutlak kesintisiz çalışma taahhüdü verilmez.",
          ],
        },
      ]}
    />
  );
}
