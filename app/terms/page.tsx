import LegalPage from "@/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Kullanim"
      title="Kullanim Sartlari ve Aydinlatma Metni"
      description="Bu sayfa, QR Publish platformunun kullanimi sirasinda uyulmasi gereken temel kurallari, hesap sorumluluklarini ve hizmet sinirlarini aciklayan genel bir MVP sablonudur."
      updatedAt="23.06.2026"
      sections={[
        {
          title: "1. Hizmet tanimi",
          paragraphs: [
            "QR Publish; dinamik QR olusturma, landing page yayinlama, menu, rezervasyon, geri bildirim, kartvizit ve raporlama modullerini tek panelde yonetmek icin sunulan bir SaaS platformudur.",
            "Hizmet kapsami zamanla genisleyebilir, daralabilir veya ucretli planlara gore farklilasabilir.",
          ],
        },
        {
          title: "2. Hesap sorumlulugu",
          paragraphs: [
            "Kullanici, hesap bilgilerinin dogrulugundan, oturum bilgilerinin korunmasindan ve kendi hesabi uzerinden gerceklestirilen islemlerden sorumludur.",
            "Yetkisiz erisim veya guvenlik ihlali suphelerinde platform sahibine gecikmeden bildirim yapilmalidir.",
          ],
        },
        {
          title: "3. Izin verilen ve yasakli kullanimlar",
          paragraphs: [
            "Platform, hukuka uygun is surecleri, kampanya yayinlari, dijital menu, kartvizit ve bilgilendirme icerikleri icin kullanilabilir.",
            "Aldatici, zararli, phishing niteliginde, mevzuata aykiri veya ucuncu kisilerin haklarini ihlal eden icerik ve yonlendirmeler yasaktir.",
          ],
        },
        {
          title: "4. Planlar, sinirlar ve sureklilik",
          paragraphs: [
            "Ucretsiz ve ucretli planlarda QR sayisi, domain, entegrasyon, analitik ve beyaz etiket gibi ozellik sinirlari uygulanabilir.",
            "Bakim, guvenlik veya teknik zorunluluk hallerinde hizmete gecici erisim kesintileri olabilir.",
          ],
        },
        {
          title: "5. Fikri mulkiyet ve sorumluluk siniri",
          paragraphs: [
            "Platformun yazilim, arayuz, marka ve ilgili materyalleri hizmet saglayiciya aittir. Kullanici, sadece kendisine taninan lisans kapsaminda kullanim hakki elde eder.",
            "Hizmet, makul teknik guvenlik ve sureklilik hedefleriyle sunulur; dolayli zararlar, veri kaybi veya ucuncu taraf kesintileri icin mutlak kesintisiz calisma taahhudu verilmez.",
          ],
        },
      ]}
    />
  );
}
