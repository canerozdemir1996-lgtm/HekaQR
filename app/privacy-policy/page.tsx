import LegalPage from "@/components/LegalPage";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Gizlilik"
      title="Gizlilik Politikasi"
      description="Bu metin, QR Publish uzerinden toplanan verilerin hangi amaclarla kullanildigini, nasil korundugunu ve KVKK kapsamindaki temel haklarinizi genel bir sablon olarak aciklar. Sirket unvani, acik adres, vergi bilgileri ve resmi iletisim detaylari daha sonra panelden guncellenebilir."
      updatedAt="23.06.2026"
      sections={[
        {
          title: "1. Veri sorumlusu ve kapsam",
          paragraphs: [
            "QR Publish, kullanici hesap yonetimi, QR kod olusturma, tarama analitigi, iletisim ve destek sureclerinin yurutulebilmesi icin kisinin kimligini belirli veya belirlenebilir kilan verileri isleyebilir.",
            "Bu sablon metin, platformu MVP lansman asamasinda kullanima acarken gerekli temel aydinlatmayi saglamak icin hazirlanmistir. Nihai ticari bilgiler yayin oncesinde hukuki kontrolle netlestirilmelidir.",
          ],
        },
        {
          title: "2. Islenen veri kategorileri",
          paragraphs: [
            "Hesap bilgileri kapsaminda ad, soyad, e-posta, sifrelenmis kimlik dogrulama verileri ve tercih ayarlari tutulabilir.",
            "Urun kullanim verileri kapsaminda QR basliklari, slug bilgileri, hedef baglantilar, tarama zamanlari, cihaz tipi, ulke, sehir, tarayici ve benzeri teknik loglar islenebilir.",
          ],
        },
        {
          title: "3. Isleme amaclari",
          paragraphs: [
            "Veriler; hesap olusturma, oturum acma, QR akislari yayinlama, dinamik yonlendirme, raporlama, guvenlik, destek sureci ve yasal yukumluluklerin yerine getirilmesi amaclariyla islenir.",
            "Acik riza gerektiren analitik ve pazarlama cerezleri, kullanicinin banner uzerinden tercih vermesi sonrasinda devreye alinmalidir.",
          ],
        },
        {
          title: "4. Aktarim ve saklama",
          paragraphs: [
            "Veriler, barindirma, e-posta gonderimi, kimlik dogrulama ve bildirim altyapisi sunan hizmet saglayicilarla sinirli, amaca uygun ve gerekli oldugu kadar paylasilabilir.",
            "Saklama sureleri; mevzuat, sozlesmesel ihtiyaclar, guvenlik gereksinimleri ve meşru menfaat dengesine gore belirlenir. Amac ortadan kalktiginda silme, yok etme veya anonimlestirme sureci uygulanir.",
          ],
        },
        {
          title: "5. Haklariniz",
          paragraphs: [
            "KVKK m.11 kapsaminda verinize erisim, duzeltme, silme, islemeyi kisitlama, itiraz ve aktarim taleplerinizi veri sorumlusuna yazili veya resmi kanallarla iletebilirsiniz.",
            "Basvurular makul surede degerlendirilir; dogrulama amacli ek bilgi talep edilebilir.",
          ],
        },
      ]}
    />
  );
}
