import LegalPage from "@/components/LegalPage";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbListSchema, buildPageMetadata, getCanonicalUrl } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Lisans Modeli | QR Publish",
  description: "QR Publish lisans modeli, kullanım hakları, ticari kullanım, API şartları, marka ve açık kaynak bileşenleri hakkında bilgilendirme.",
  path: "/license",
});

export default function LicensePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebPage", name: "QR Publish Lisans Modeli", url: getCanonicalUrl("/license") },
            buildBreadcrumbListSchema([
              { name: "Ana sayfa", path: "/" },
              { name: "Lisans", path: "/license" },
            ]),
          ],
        }}
      />
      <LegalPage
        eyebrow="Lisans"
        title="QR Publish Lisans Modeli"
        description="Bu sayfa QR Publish platformunun kullanım hakkı, ticari kullanım sınırları, API şartları ve marka/telif haklarıyla ilgili çerçeveyi açıklar."
        updatedAt="13.07.2026"
        sections={[
          {
            title: "1. Kullanım hakları",
            paragraphs: [
              "Aktif hesabı ve uygun planı olan kullanıcılar QR Publish panelindeki özellikleri kendi işletmeleri, müşterileri veya yetkilendirildikleri organizasyonlar için kullanabilir.",
              "Lisans, platforma erişim ve hizmetten yararlanma hakkı verir; yazılımın kaynak kodu, altyapısı veya marka varlıkları üzerinde mülkiyet devri sağlamaz.",
            ],
          },
          {
            title: "2. Yasak kullanımlar",
            paragraphs: [
              "Platformun yeniden satışı, izinsiz kopyalanması, güvenlik kontrollerinin aşılması, tersine mühendislik, spam, phishing veya zararlı içerik dağıtımı yasaktır.",
              "Plan limitlerini aşmak için çoklu hesap açma, otomasyonla kötüye kullanım veya üçüncü taraf haklarını ihlal eden QR yayınları lisans ihlali sayılır.",
            ],
          },
          {
            title: "3. Ticari kullanım şartları",
            paragraphs: [
              "Ajanslar, restoranlar, kurumlar ve işletmeler QR Publish'i ticari kampanya, menü, kartvizit, form, kupon ve raporlama akışlarında kullanabilir.",
              "Müşteri adına kullanımda içerik doğruluğu, izinler, KVKK/GDPR yükümlülükleri ve marka izinleri kullanıcıya aittir.",
            ],
          },
          {
            title: "4. API kullanım şartları",
            paragraphs: [
              "API erişimi plan limitleri, rate limit, güvenlik kontrolleri ve anahtar yönetimi kurallarına tabidir. API anahtarları gizli tutulmalı ve üçüncü kişilerle paylaşılmamalıdır.",
              "Aşırı istek, kötüye kullanım veya sistem bütünlüğünü tehdit eden API trafiği geçici veya kalıcı olarak sınırlandırılabilir.",
            ],
          },
          {
            title: "5. Marka, telif ve açık kaynak",
            paragraphs: [
              "QR Publish adı, logosu, arayüz tasarımları ve dokümantasyonu ilgili hak sahiplerine aittir. Kullanıcı kendi marka varlıklarını yüklerken gerekli haklara sahip olduğunu kabul eder.",
              "Platform açık kaynak bileşenler içerebilir. Bu bileşenlerin lisansları kendi şartlarıyla geçerlidir ve gerektiğinde dokümantasyon veya destek kanalları üzerinden paylaşılır.",
            ],
          },
          {
            title: "6. Sorumluluk reddi ve sürüm",
            paragraphs: [
              "QR Publish sürüm 1.0 ürün ailesi sürekli geliştirilen bir SaaS hizmetidir. Özellikler, limitler ve entegrasyonlar güvenlik, performans ve ürün stratejisi gereği güncellenebilir.",
              "Sorularınız için contact@qrpublish.com adresine veya /support sayfasındaki destek merkezine başvurabilirsiniz.",
            ],
          },
        ]}
      />
    </>
  );
}
