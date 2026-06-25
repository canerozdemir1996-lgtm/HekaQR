import LegalPage from "@/components/LegalPage";

export default function CookiePolicyPage() {
  return (
    <LegalPage
      eyebrow="Çerezler"
      title="Çerez Politikası"
      description="Bu politika, QR Publish üzerinde kullanılan zorunlu, tercih ve analitik çerezlerin ne amaçla çalıştığını açıklar. Banner üzerinden tercihlerinizi değiştirebilirsiniz."
      updatedAt="25.06.2026"
      sections={[
        {
          title: "1. Çerez nedir?",
          paragraphs: [
            "Çerezler, ziyaret ettiğiniz siteler tarafından tarayıcınıza kaydedilen küçük veri dosyalarıdır. Oturum yönetimi, güvenlik, tercihlerin hatırlanması ve kullanım ölçümlemesi gibi amaçlarla kullanılabilir.",
          ],
        },
        {
          title: "2. Zorunlu çerezler",
          paragraphs: [
            "Oturum açma, güvenlik doğrulaması, tema tercihi ve temel panel işlevleri için gerekli çerezler kullanılır. Bu çerezler olmadan platformun bazı bölümleri doğru çalışmayabilir.",
          ],
        },
        {
          title: "3. Analitik ve tercih çerezleri",
          paragraphs: [
            "Analitik çerezler, hangi sayfaların daha fazla kullanıldığını ve ürün deneyiminin nasıl iyileştirilebileceğini anlamaya yardım eder.",
            "Bu tür çerezler, kullanıcının banner üzerinden açık onay vermesi halinde devreye alınmalıdır.",
          ],
        },
        {
          title: "4. Tercihlerin yönetimi",
          paragraphs: [
            "Çerez tercihiniz tarayıcınızda saklanır. Banner kapatıldıktan sonra farklı bir tercih seçmek isterseniz tarayıcı depolama verilerini temizleyebilir veya ileride eklenecek panel ayarları üzerinden güncelleyebilirsiniz.",
          ],
        },
      ]}
    />
  );
}
