import LegalPage from "@/components/LegalPage";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbListSchema, buildPageMetadata, getCanonicalUrl } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Kullanım Şartları | QR Publish",
  description: "QR Publish hesap, abonelik, QR kullanım kuralları, ödeme, iade ve fikri mülkiyet şartlarını inceleyin.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebPage", name: "Kullanım Şartları", url: getCanonicalUrl("/terms") },
            buildBreadcrumbListSchema([
              { name: "Ana sayfa", path: "/" },
              { name: "Kullanım Şartları", path: "/terms" },
            ]),
          ],
        }}
      />
      <LegalPage
        eyebrow="Hukuki"
        title="Kullanım Şartları"
        description="Bu şartlar QR Publish platformunu kullanırken hesap, içerik, abonelik, ödeme ve hizmet güvenliğiyle ilgili temel kuralları açıklar."
        updatedAt="13.07.2026"
        sections={[
          {
            title: "1. Hizmet şartları",
            paragraphs: [
              "QR Publish; dinamik QR kod, restoran menüsü, dijital kartvizit, kampanya sayfası, Wi-Fi QR, rezervasyon, kupon, sınav ve kurumsal bildirim formları için web tabanlı bir yayın ve ölçüm platformudur.",
              "Hizmet kapsamı planınıza, teknik kapasiteye ve güvenlik gereksinimlerine göre değişebilir. Platform, makul bakım ve güvenlik gerekçeleriyle geçici olarak kısıtlanabilir.",
            ],
          },
          {
            title: "2. Hesap oluşturma ve güvenlik",
            paragraphs: [
              "Kullanıcı, hesap bilgilerinin doğruluğundan, oturum güvenliğinden ve hesabı üzerinden yapılan işlemlerden sorumludur.",
              "Yetkisiz erişim, şüpheli kullanım veya veri ihlali fark edildiğinde QR Publish destek kanallarına gecikmeden bildirim yapılmalıdır.",
            ],
          },
          {
            title: "3. Yasak içerikler ve spam",
            paragraphs: [
              "Phishing, dolandırıcılık, zararlı yazılım, telif ihlali, nefret söylemi, kişisel verilerin hukuka aykırı işlenmesi veya spam amacı taşıyan QR kullanımı yasaktır.",
              "QR Publish, güvenlik riski oluşturan veya mevzuata aykırı görünen içerikleri askıya alma, silme veya hesabı kapatma hakkını saklı tutar.",
            ],
          },
          {
            title: "4. QR kullanım kuralları",
            paragraphs: [
              "Dinamik QR kodlarda hedef içerik sonradan güncellenebilir; kullanıcı yayınladığı hedef bağlantı, form, menü, kupon ve kampanya içeriğinin hukuka uygunluğundan sorumludur.",
              "QR kodların yanıltıcı biçimde kullanılması, gerçek hedefi gizleyerek kullanıcıyı yanıltması veya üçüncü taraf marka ve kişilik haklarını ihlal etmesi yasaktır.",
            ],
          },
          {
            title: "5. Ödeme, iade ve abonelik",
            paragraphs: [
              "Ücretli planlar aylık, yıllık veya özel lisans modeliyle sunulabilir. Abonelik yenileme, iptal, vergi ve fatura süreçleri ödeme sağlayıcısının ve QR Publish panelinin sunduğu seçeneklere göre yürütülür.",
              "İade talepleri, kullanılan hizmet miktarı, kampanya koşulları ve yürürlükteki tüketici mevzuatı dikkate alınarak değerlendirilir. Premium özellikler abonelik sona erdiğinde sınırlandırılabilir.",
            ],
          },
          {
            title: "6. Fikri mülkiyet ve sorumluluk sınırları",
            paragraphs: [
              "QR Publish yazılımı, arayüzleri, marka varlıkları, dokümantasyonu ve tasarım sistemi QR Publish veya ilgili hak sahiplerine aittir. Kullanıcı yalnızca kendisine tanınan kullanım hakkını elde eder.",
              "Platform, kesintisiz veya hatasız hizmet garantisi vermez. Dolaylı zararlar, üçüncü taraf kesintileri, yanlış içerik kullanımı veya kullanıcı kaynaklı veri kayıplarından QR Publish sorumlu tutulamaz.",
            ],
          },
          {
            title: "7. Uyuşmazlıklar",
            paragraphs: [
              "Uyuşmazlıklarda öncelikle destek kanalları üzerinden iyi niyetli çözüm aranır. Zorunlu hallerde uygulanacak hukuk ve yetkili merciler sözleşme, fatura ve yürürlükteki mevzuata göre belirlenir.",
            ],
          },
        ]}
      />
    </>
  );
}
