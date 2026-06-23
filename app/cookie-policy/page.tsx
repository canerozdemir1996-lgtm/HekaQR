import LegalPage from "@/components/LegalPage";

export default function CookiePolicyPage() {
  return (
    <LegalPage
      eyebrow="Cerezler"
      title="Cerez Politikasi"
      description="Bu politika, QR Publish uzerinde kullanilan zorunlu, tercih ve analitik cerezlerin ne amacla calistigini aciklar. Banner uzerinden tercihlerinizi degistirebilirsiniz."
      updatedAt="23.06.2026"
      sections={[
        {
          title: "1. Cerez nedir?",
          paragraphs: [
            "Cerezler, ziyaret ettiginiz siteler tarafindan tarayiciniza kaydedilen kucuk veri dosyalaridir. Oturum yonetimi, guvenlik, tercihlerin hatirlanmasi ve kullanim olcumlemesi gibi amaclarla kullanilabilir.",
          ],
        },
        {
          title: "2. Zorunlu cerezler",
          paragraphs: [
            "Oturum acma, guvenlik dogrulamasi, tema tercihi ve temel panel islevleri icin gerekli cerezler kullanilir. Bu cerezler olmadan platformun bazi bolumleri dogru calismayabilir.",
          ],
        },
        {
          title: "3. Analitik ve tercih cerezleri",
          paragraphs: [
            "Analitik cerezler, hangi sayfalarin daha fazla kullanildigini ve urun deneyiminin nasil iyilestirilebilecegini anlamaya yardim eder.",
            "Bu tur cerezler, kullanicinin banner uzerinden acik onay vermesi halinde devreye alinmalidir.",
          ],
        },
        {
          title: "4. Tercihlerin yonetimi",
          paragraphs: [
            "Cerez tercihiniz tarayicinizda saklanir. Banner kapatildiktan sonra farkli bir tercih secmek isterseniz tarayici depolama verilerini temizleyebilir veya ileride eklenecek panel ayarlari uzerinden guncelleyebilirsiniz.",
          ],
        },
      ]}
    />
  );
}
