# GÖREV: HekaQR (QR Publish) Rakip Analizi Sonrası Eksik Özellik Geliştirme

## Bağlam

HekaQR (canlıda "QR Publish" / hekaqr.com olarak görünüyor, test ortamı: qr.158.220.106.172.nip.io), dinamik QR kod, restoran menü QR, dijital kartvizit, rezervasyon, sipariş ve raporlama sunan bir Next.js + Supabase SaaS platformu. Aşağıdaki 6 rakip canlı olarak (Chrome üzerinden, hem anonim hem oturum açık halde) incelendi: **QRCodeChimp, QRCodeCreator, QRFY, QR Code Monkey, QR Planet, Uniqode**. Ayrıca genel pazar/trend araştırması yapıldı.

Bu doküman, bulguları ve önceliklendirilmiş aksiyon listesini içerir. Görev: aşağıdaki maddeleri sırayla değerlendirip uygulamak.

---

## 1. ACİL / DÜZELTİLMESİ GEREKEN SORUNLAR

1. **`/privacy-policy` sayfasında canlıda unutulmuş placeholder/şablon metin var.**
   Tam metin: *"This template text was prepared to provide basic disclosure required when opening the platform to MVP launch stage. Final commercial details should be clarified with legal review before publication."*
   Aksiyon: Bu metni kaldır, gerçek bir gizlilik politikası metniyle değiştir (KVKK/GDPR uyumlu, TR/EN).

2. **`/dashboard/settings` sayfasındaki "Billing Health" paneli müşteriye doğrudan iç sistem/mühendislik teşhis bilgisi gösteriyor** (Lemon Squeezy store adı, webhook secret durumu, plan ID "Configured/Reachable/Store Match" kontrolleri — Starter Monthly/Yearly, Pro Monthly/Yearly vb.).
   Aksiyon: Bu paneli müşteri ayarlar sayfasından kaldır, sadece `/admin` paneline taşı (owner/admin rolüyle sınırlı olsa da müşteri arayüzünde olmamalı).

3. **`/login` sayfası SSR yapmıyor**, sadece "Yükleniyor..." client-render shell'i dönüyor → SEO/crawler ve sosyal paylaşım önizlemeleri için zararlı.
   Aksiyon: Login/signup sayfalarına en azından statik bir SSR fallback/shell ekle.

---

## 2. YAPISAL/STRATEJİK FARK: "Kayıtsız Anında Deneme" Eksikliği

İncelenen **6 rakibin tamamında** (QRCodeChimp, QRCodeCreator, QRFY, QR Code Monkey, QR Planet, kısmen Uniqode) anasayfada **kayıt olmadan çalışan, anında PNG/SVG indirme yapan** bir QR oluşturucu var. HekaQR'da QR oluşturma akışı (`/dashboard/qrcodes/new`) tamamen giriş yapmış kullanıcıya kapalı.

**Aksiyon:** Anasayfaya (`app/page.tsx`) login gerektirmeyen, basit bir "QR oluştur ve indir" widget'ı ekle (örn. sadece URL/Text/WiFi tipi, statik PNG indirme, sonra "Bunu kaydetmek ve takip etmek için ücretsiz kaydol" CTA'sı). Bu, ilk dokunuşta dönüşüm kaybını azaltacak en yüksek etkili, orta efor gerektiren değişiklik.

---

## 3. ÜRÜN ÖZELLİK EKSİKLERİ (öncelik sırasına göre)

### 3.1 Backend hazır, UI'a bağlanmamış QR tipleri (DÜŞÜK EFOR — hızlı kazanç)
`lib/services/qrContentBuilder.ts` içinde şu builder fonksiyonları zaten var ama `/dashboard/qrcodes/new` akışında QR tipi olarak sunulmuyor:
- Event/Calendar (iCal) — `buildEventQrContent`
- Location/Maps — `buildLocationQrContent`
- Coupon — `buildCouponQrContent`
- GS1/Product barcode — `buildGS1QrContent`
- Audio/MP3 — `buildAudioQrContent`

**Aksiyon:** Bu 5 tipi QR oluşturma akışına (içerik formu + tip seçim ekranı) ekle. Mevcut akışta zaten 15 tip var: Web Sitesi, Ürün QR, Dijital Kartvizit, Multi URL, Menü QR, Geri Bildirim, Rezervasyon, Doküman, App Store, WiFi, SMS, WhatsApp, E-posta, Telefon, Düz Metin.

### 3.2 Raporlara export ekle
`/dashboard/reports` sayfasında görünür bir CSV/Excel/PDF export butonu yok. QRCodeChimp ve QR Planet bunu standart olarak sunuyor.
**Aksiyon:** Raporlar sayfasına CSV/Excel export butonu ekle (mevcut `/api/v1/export` route'u varsa ona bağlan, yoksa oluştur).

### 3.3 vCard'a NFC / Apple Wallet / Google Wallet desteği
QRCodeChimp'in en güçlü kozu: dijital kartvizitte NFC uyumluluk, Apple Wallet/Google Wallet'a ekleme, Lead Collection, Contact Exchange, Auto Save Contact. HekaQR'ın vCard Builder'ında (`app/dashboard/(standalone)/vcard-builder`) bunlar yok.
**Aksiyon:** En azından "Add to Apple Wallet / Google Wallet" pass üretimini (.pkpass / Google Wallet API) ve "Rehbere Kaydet" sonrası lead capture'ı değerlendir.

### 3.4 Tasarım stüdyosunda şekil/çerçeve/desen çeşitliliği
Mevcut `/dashboard/templates` stüdyosunda 6 nokta şekli + sınırlı göz seçenekleri var. QRCodeChimp'te 20+ gövde deseni (insan ikonu dahil), 11 göz çerçevesi, 11 göz topu tipi (yıldız/elmas), 3D efekt var. QR Planet'te ayrı Frames + Patterns + Background katmanları var.
**Aksiyon:** Studio'ya en azından "Frames" (dekoratif çerçeve/CTA sticker) ve daha fazla eye/dot şekli ekle.

### 3.5 CRM entegrasyonu (HubSpot/Salesforce) ve lead senkronizasyonu
Uniqode dijital kartvizit + form QR'larda CRM senkronizasyonu sunuyor. HekaQR'da `/dashboard/settings` içinde Zapier/Make/Google Sheets etiketleri var ama **gerçekten çalışıp çalışmadığı doğrulanmadı** — bu önce test edilmeli.
**Aksiyon:** Zapier/Make/Google Sheets entegrasyon butonlarını tıklayıp gerçek bir webhook/OAuth akışı olup olmadığını doğrula. Eğer sadece statik etiketse, ya gerçek entegrasyonu kur ya da pazarlamada bu iddiayı kaldır (yanlış/abartılı iddia riski).

### 3.6 HIPAA / sağlık sektörüne özel uyumluluk iletişimi
Uniqode HIPAA uyumluluğunu öne çıkarıyor. HekaQR'da "Hastane / Sağlık Güveni" şablonu zaten var ama herhangi bir uyumluluk sertifikasyonu iletişimi yok.
**Aksiyon (düşük öncelik, pazarlama):** Eğer altyapı gerçekten KVKK/GDPR-seviyesinde güvenliyse, sağlık şablonu sayfasında bunu netleştir; HIPAA sertifikasyonu iddiası olmadan "sağlık verisi güvenliği" diliyle sınırlı kal (yanlış uyumluluk iddiası hukuki risk taşır).

---

## 4. FİYATLANDIRMA MODELİ GÖZDEN GEÇİRME (ürün kararı, mühendislik değil ama not edilmeli)

Rakip karşılaştırması şunu gösterdi:
- **QRFY ve QR Planet**: tarama sayısını sınırlamıyor (QRFY: tüm planlarda sınırsız tarama; QR Planet: "unlimited scans, no expiration date" — sadece QR adedi/landing page sayısı kademeleniyor).
- **QRCodeCreator**: Basic'ten itibaren tüm paketlerde sınırsız tarama.
- **HekaQR Starter**: 10.000 tarama/ay sınırı — yoğun kullanan bir restoran/mağaza için caydırıcı olabilir.
- **Uniqode**: analitik veri saklama süresine göre kademeli fiyatlandırma (60/90/180 gün/ömür boyu) — bizim kullanmadığımız bir model.

**Aksiyon (ürün/fiyatlandırma kararı, kullanıcıyla görüşülmeli):** Tarama sınırı modelini, QR adedi + analitik saklama süresi bazlı bir modele kaydırmayı değerlendir. Bu kod değişikliği değil, önce ürün/fiyat kararı gerektirir — uygulamadan önce kullanıcıdan onay al.

---

## 5. UYGULAMA SIRASI ÖNERİSİ

1. Privacy-policy placeholder metnini düzelt (madde 1.1) — 5 dakika, hukuki risk.
2. Billing Health panelini admin paneline taşı (madde 1.2) — bilgi sızıntısı riski.
3. Backend'de hazır 5 QR tipini UI'a bağla (madde 3.1) — en hızlı özellik kazancı.
4. Raporlara CSV export ekle (madde 3.2).
5. Anasayfaya kayıtsız QR deneme widget'ı (madde 2) — en yüksek dönüşüm etkisi ama orta efor.
6. Zapier/Make/Sheets entegrasyonunu doğrula (madde 3.5).
7. Diğer maddeler (vCard NFC, tasarım stüdyosu genişletme, fiyatlandırma modeli) — kullanıcıyla önceliklendirme görüşmesi sonrası.

---

## Notlar

- Tüm kod değişiklikleri mevcut proje konvansiyonlarına uymalı (Next.js App Router, Supabase, mevcut dosya yapısı).
- Fiyatlandırma modeli değişiklikleri (madde 4) ve pazarlama iddiaları (madde 3.6) kullanıcı onayı gerektirir — doğrudan uygulanmamalı.
- Madde 1.2 (Billing Health) ve 1.3 (login SSR) güvenlik/SEO etkisi taşıdığından önce kullanıcıya kısa bir özet ile onay sorulmalı.
