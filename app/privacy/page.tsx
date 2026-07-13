import LegalPage from "@/components/LegalPage";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbListSchema, buildPageMetadata, getCanonicalUrl } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Gizlilik Politikası | QR Publish",
  description: "QR Publish tarafından işlenen hesap, QR tarama, çerez, ödeme ve destek verileri hakkında KVKK ve GDPR uyumlu bilgilendirme.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "PrivacyPolicy", name: "QR Publish Gizlilik Politikası", url: getCanonicalUrl("/privacy") },
            buildBreadcrumbListSchema([
              { name: "Ana sayfa", path: "/" },
              { name: "Gizlilik Politikası", path: "/privacy" },
            ]),
          ],
        }}
      />
      <LegalPage
        eyebrow="Gizlilik"
        title="Gizlilik Politikası"
        description="QR Publish; hesap, QR yayınlama, tarama analitiği, ödeme ve destek süreçlerinde verileri şeffaf, ölçülü ve güvenli biçimde işler."
        updatedAt="13.07.2026"
        sections={[
          {
            title: "1. Toplanan veriler",
            paragraphs: [
              "Hesap oluşturma ve oturum süreçlerinde ad, soyad, e-posta, telefon, şirket bilgileri, rol/yetki bilgisi, plan ve abonelik durumu işlenebilir.",
              "Kullanıcının oluşturduğu QR başlığı, slug, hedef URL, menü, kartvizit, kupon, form, rezervasyon ve kampanya içerikleri platformun çalışması için saklanır.",
            ],
          },
          {
            title: "2. QR tarama verileri",
            paragraphs: [
              "Tarama zamanı, QR kimliği, cihaz türü, tarayıcı, işletim sistemi, IP temelli ülke/şehir tahmini, referrer, UTM ve benzersiz cihaz göstergeleri raporlama amacıyla işlenebilir.",
              "Konum bilgisi genel olarak IP tabanlı tahmindir. GPS veya hassas konum yalnızca kullanıcının açık izniyle ve ilgili form akışında gerekiyorsa kullanılabilir.",
            ],
          },
          {
            title: "3. Çerezler ve analytics",
            paragraphs: [
              "Zorunlu çerezler oturum, güvenlik, tercih ve kötüye kullanım önleme için kullanılır. Analitik ve pazarlama çerezleri kullanıcı tercihlerine göre etkinleştirilebilir.",
              "QR Publish ürün performansı, hata analizi ve hizmet kalitesi için toplulaştırılmış teknik ölçümler kullanabilir.",
            ],
          },
          {
            title: "4. Ödeme ve fatura bilgileri",
            paragraphs: [
              "Ödeme kartı bilgileri doğrudan QR Publish sunucularında saklanmaz; ödeme sağlayıcısı tarafından güvenli biçimde işlenir. Panelde kartın son dört hanesi, ödeme durumu, fatura ve abonelik bilgileri gösterilebilir.",
            ],
          },
          {
            title: "5. Saklama süresi ve güvenlik",
            paragraphs: [
              "Veriler hizmetin sağlanması, yasal yükümlülükler, güvenlik, muhasebe ve uyuşmazlık çözümü için gerekli süre boyunca saklanır. Amaç ortadan kalktığında silme, anonimleştirme veya arşivleme süreçleri uygulanır.",
              "Erişim kontrolleri, RLS politikaları, rol bazlı yetkilendirme, denetim logları ve güvenli bağlantı standartları verilerin korunması için kullanılır.",
            ],
          },
          {
            title: "6. KVKK, GDPR ve kullanıcı hakları",
            paragraphs: [
              "Kullanıcılar verilerine erişme, düzeltme, silme, işlemeyi kısıtlama, itiraz etme, veri taşınabilirliği ve açık rızayı geri çekme haklarına sahiptir.",
              "Veri silme ve erişim talepleri destek merkezi üzerinden iletilebilir. Kimlik doğrulaması gerektiren taleplerde ek doğrulama istenebilir.",
            ],
          },
        ]}
      />
    </>
  );
}
