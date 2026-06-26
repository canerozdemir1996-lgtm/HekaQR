import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | QR Publish",
  description: "QR Publish üzerinden toplanan verilerin hangi amaçlarla kullanıldığını, nasıl korunduğunu ve KVKK kapsamındaki temel haklarınızı açıklar.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Gizlilik"
      title="Gizlilik Politikası"
      description="Bu metin, QR Publish üzerinden toplanan verilerin hangi amaçlarla kullanıldığını, nasıl korunduğunu ve KVKK kapsamındaki temel haklarınızı açıklar."
      updatedAt="25.06.2026"
      sections={[
        {
          title: "1. Veri sorumlusu ve kapsam",
          paragraphs: [
            "QR Publish, kullanıcı hesap yönetimi, QR kod oluşturma, tarama analitiği, iletişim ve destek süreçlerinin yürütülebilmesi için kişinin kimliğini belirli veya belirlenebilir kılan verileri işleyebilir.",
          ],
        },
        {
          title: "2. İşlenen veri kategorileri",
          paragraphs: [
            "Hesap bilgileri kapsamında ad, soyad, e-posta, şifrelenmiş kimlik doğrulama verileri ve tercih ayarları tutulabilir.",
            "Ürün kullanım verileri kapsamında QR başlıkları, slug bilgileri, hedef bağlantılar, tarama zamanları, cihaz tipi, ülke, şehir, tarayıcı ve benzeri teknik loglar işlenebilir.",
          ],
        },
        {
          title: "3. İşleme amaçları",
          paragraphs: [
            "Veriler; hesap oluşturma, oturum açma, QR akışları yayınlama, dinamik yönlendirme, raporlama, güvenlik, destek süreci ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.",
            "Açık rıza gerektiren analitik ve pazarlama çerezleri, kullanıcının banner üzerinden tercih vermesi sonrasında devreye alınır.",
          ],
        },
        {
          title: "4. Aktarım ve saklama",
          paragraphs: [
            "Veriler, barındırma, e-posta gönderimi, kimlik doğrulama ve bildirim altyapısı sunan hizmet sağlayıcılarla sınırlı, amaca uygun ve gerekli olduğu kadar paylaşılabilir.",
            "Saklama süreleri; mevzuat, sözleşmesel ihtiyaçlar, güvenlik gereksinimleri ve meşru menfaat dengesine göre belirlenir. Amaç ortadan kalktığında silme, yok etme veya anonimleştirme süreci uygulanır.",
          ],
        },
        {
          title: "5. Haklarınız",
          paragraphs: [
            "KVKK m.11 kapsamında verinize erişim, düzeltme, silme, işlemeyi kısıtlama, itiraz ve aktarım taleplerinizi veri sorumlusuna yazılı veya resmi kanallarla iletebilirsiniz. Talebinizi profil sayfanızdaki hesap silme/veri export araçlarıyla da başlatabilirsiniz.",
            "Başvurular makul sürede değerlendirilir; doğrulama amaçlı ek bilgi talep edilebilir.",
          ],
        },
      ]}
    />
  );
}
