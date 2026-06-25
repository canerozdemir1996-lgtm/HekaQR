# Claude Görev Promptu: MVP Sonrası Tespit Edilen 5 Sorunun Düzeltilmesi

Canlı ortamda (Chrome MCP ile) yapılan uçtan uca test sonucunda 5 sorun tespit edildi. Hepsini tek branch üzerinde düzelt, her biri için ayrı commit at.

## 1. Türkçe karakter bozukluğu (KRİTİK — kullanıcı görünürlüğü yüksek)

Aşağıdaki sayfa/bölümlerin metinlerinde ö, ı, ş, ü, ç karakterleri ASCII karşılıklarına (o, i, s, u, c) dönüşmüş durumda. Kaynağı muhtemelen bu metinleri içeren dosyanın yanlış encoding (Latin-1/Windows-1254 gibi) ile kaydedilip UTF-8 olarak okunmasıdır.

Etkilenen yerler (gözlemlenen örnekler):
- `/privacy-policy` sayfası: "Bu metin, QR Publish uzerinden toplanan verilerin hangi amaclarla..." → olması gereken "üzerinden toplanan verilerin hangi amaçlarla..."
- `/terms` sayfası başlığı: "Kullanim Sartlari ve Aydinlatma Metni" → "Kullanım Şartları ve Aydınlatma Metni"
- `/cookie-policy` sayfası başlığı: "Cerez Politikasi" → "Çerez Politikası"
- `/dashboard/settings` sayfasındaki yeni eklenen bölümler: custom domain ("Ozel marka alan adi", "Aboneligi Yonet", "Once asagidaki TXT kaydini DNS saglayicinizda olusturun, sonra Dogrula'ya basin"), SMS bildirimleri ("Guvenlik E-postasi", "SMS kanalini ac"), billing/ödeme bilgileri ("Odeme Bilgileri", "Abonelik faturalari ve kurumsal teklif surecleri icin kullanilacak bilgiler")
- Bulk QR toplu seçim toolbar'ı: "Tumunu sec (N)" → "Tümünü seç (N)"

Doğrulanmış etkilenen dosyalar (repo'da grep ile teyit edildi): `components/LegalPage.tsx`, `app/terms/page.tsx`, `app/privacy-policy/page.tsx`, `app/cookie-policy/page.tsx`, `app/signup/page.tsx`, `app/page.tsx`, `app/dashboard/(shell)/page.tsx` — ve muhtemelen `dashboard/settings` altındaki component dosyaları (custom domain/SMS/billing bölümlerini içeren dosyaları ayrıca ara).

Yapılması gerekenler:
- Yukarıdaki dosyaları ve `app/dashboard/(shell)/settings/` altındaki ilgili component'leri oku, tüm hatalı Türkçe karakterleri doğru karşılıklarıyla düzelt.
- Dosyaları UTF-8 (BOM'suz) olarak kaydet.
- Düzeltme sonrası repo genelinde grep ile kontrol et: yaygın bozulma kalıpları (`amaclarla`, `kapsamindaki`, `Sartlari`, `Aydinlatma`, `Cerez`, `Tumunu`, `Ozel marka`, `Aboneligi`, `Guvenlik`, `Odeme Bilgileri` vb.) için tarama yap, benzer başka bozuk metin kalmadığından emin ol.
- Düzeltmeden sonra `/privacy-policy`, `/terms`, `/cookie-policy` ve `/dashboard/settings` sayfalarını tarayıcıda görsel olarak doğrula.

## 2. White-label ayarları — backend hazır ama frontend hâlâ local stub

`/dashboard/organizations/[id]` sayfasındaki "Ayarlar" sekmesinde white-label paneli (Logo URL/Base64, Dosya Seç, Ana Renk, Marka Mesajı) şu anda "Backend hazır olana kadar bu alan organizasyon bazlı local stub olarak saklanır." mesajı gösteriyor ve verileri sadece local state/localStorage'da tutuyor.

Ancak backend zaten hazır: org branding için DB şeması ve public branding API mevcut (commit `47b7347` — "feat: white-label backend: org branding settings + public branding API"). Bu API'yi bul (muhtemelen `/api/v1/organizations/[id]/branding` veya benzeri bir route) ve frontend'i gerçek API'ye bağla:
- Sayfa yüklendiğinde mevcut branding ayarlarını API'den çek (stub/local state yerine).
- "Kaydet" tıklanınca gerçek API'ye PUT/POST isteği gönder.
- Stub uyarı metnini kaldır.
- Logo yükleme (Dosya Seç) akışının da gerçek storage/upload endpoint'ine gittiğini doğrula; değilse onu da bağla.

## 3. Toplu QR silme/çöpe taşıma onay modalı kapanmıyor

`/dashboard` QR listesinde checkbox ile birden fazla QR seçip toplu işlem toolbar'ından "Çöpe Taşı" (veya bulk delete) tıklandığında: işlem backend'de başarıyla tamamlanıyor (toast bildirimi "Seçili QR'lar çöp kutusuna taşındı" görünüyor, klasör sayaçları güncelleniyor) AMA onay diyalog kutusu ("QR çöp kutusuna taşınsın mı?") ekranda kapanmadan asılı kalıyor. Kullanıcı manuel "İptal" tıklayarak kapatmak zorunda kalıyor.

Bulk action confirm modal component'ini bul (muhtemelen `app/dashboard/(shell)/page.tsx` içindeki ya da ayrı bir component'teki bulk delete/trash onay dialogu) ve API çağrısı başarıyla tamamlandıktan sonra modalın state'inin `false`'a set edilip otomatik kapandığından emin ol — şu an muhtemelen success callback'inde modal kapatma çağrısı unutulmuş veya race condition var.

## 4. `/manifest.webmanifest` 404 veriyor

Network sekmesinde tekrarlayan şekilde `GET /manifest.webmanifest` isteğinin 404 döndüğü gözlendi. Bu PWA "add to home screen" / `PwaBootstrap` özelliğini bozabilir.
- `app/manifest.ts` veya `public/manifest.webmanifest` dosyasının var olup doğru route'ta serve edildiğini kontrol et.
- `app/layout.tsx` veya ilgili head meta tag'lerindeki manifest linkinin doğru path'e işaret ettiğini doğrula.
- Eksikse dosyayı oluştur (name, short_name, icons, start_url, display, theme_color alanlarıyla); path hatalıysa düzelt.
- Düzelttikten sonra network sekmesinde 200 döndüğünü doğrula.

## 5. Lokal `node_modules` paket eksikliği / build hijyeni

`npx tsc --noEmit` çalıştırıldığında şu modüller bulunamıyor hatası veriyor: `@sentry/nextjs`, `resend`, `sanitize-html`, `@types/sanitize-html`, `pdf-lib`. Bunlar `package.json`'da tanımlı ama `node_modules`'da yok — yani `npm install` son commit'lerden sonra hiç çalıştırılmamış.
- `npm install` çalıştır, `package-lock.json`'ı güncelle ve commit'e dahil et.
- `npx tsc --noEmit` hatasız geçtiğini doğrula.
- (Varsa) CI/pre-push hook'una `npx tsc --noEmit` adımı ekleyerek bu durumun tekrar yaşanmasını önle — eğer CI pipeline dosyası bulamazsan bu adımı opsiyonel bırak, zorunlu değil.

---

## Genel Beklenti
- Her madde için ayrı, anlamlı commit mesajları kullan (örn: "fix: Türkçe karakter encoding sorunu - legal sayfalar ve ayarlar", "feat: white-label ayarlarını gerçek API'ye bağla", vb.).
- Değişiklik sonrası ilgili sayfaları tarayıcıda manuel kontrol et, ekran görüntüsü ile doğrula.
- Mevcut davranışı bozmadan, sadece belirtilen sorunları düzelt — kapsam dışı refactor yapma.
