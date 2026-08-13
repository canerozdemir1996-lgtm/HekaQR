# Teknik SEO denetimi — 2026-07-16

Kapsam yalnız mevcut Türkçe SEO yüzeyleri, mevcut `/en` karşılığı ve teknik indeksleme güvenliğidir. Yeni dil, sahte kanıt, testimonial, müşteri logosu veya doğrulanmamış istatistik eklenmedi.

## Route matrisi

| Sınıf | Örnekler | Politika |
| --- | --- | --- |
| Ana pazarlama ve fiyatlandırma | `/`, `/pricing`, `/pricing/enterprise`, `/developers`, `/contact`, `/support` | index, follow, self-canonical, sitemap |
| Türkçe landing kümeleri | `/qr-kod-olusturucu`, `/dinamik-qr-kod-olusturucu`, `/kullanim-alanlari/*` | index, follow, self-canonical, sitemap, breadcrumb/FAQ/software schema |
| Blog | `/blog`, `/blog/*`, `/blog/hakkinda` | index, follow, self-canonical, sitemap, article/collection/breadcrumb schema |
| Yasal | `/privacy`, `/terms`, `/license`, `/cookie-policy` | index, follow, self-canonical, sitemap |
| Auth/private | `/login`, `/signup`, `/auth/*`, `/dashboard/*`, `/admin/*` | meta noindex + X-Robots-Tag + robots disallow |
| API/transaction/test | `/api/*`, `/pricing/checkout`, `/dev-tools/*`, `/__e2e/*` | X-Robots-Tag + robots disallow |
| Kullanıcı üretimi/çıktı | `/q/*`, `/01/*`, `/exam/*`, `/menu/*`, `/card/*`, `/product/*` ve diğer yayın rotaları | X-Robots-Tag + robots disallow; sitemap dışında |
| Legacy | `/privacy-policy` | kalıcı redirect `/privacy` |

Merkezi sınıflandırma `lib/seo-route-policy.ts` içindedir. `robots.ts` bu kaynaktan üretilir; `next.config.js` non-HTML ve dinamik çıktı rotalarında header savunmasını uygular.

## Metadata, canonical ve hreflang

- Public sayfalar `buildPageMetadata` ile self-canonical, OG URL ve Twitter metadata üretir.
- Ana sayfa ile mevcut `/en` sayfası karşılıklı `tr-TR`, `en-US` ve `x-default` alternatifi taşır.
- Dil karşılığı olmayan Türkçe landing sayfalarına yanlış hreflang eklenmez.
- `www` ve HTTP istekleri kanonik `https://qrpublish.com` origin'ine kalıcı yönlenir.
- Sitemap URL'leri aynı origin'de benzersizdir ve noindex rotası içermez.

## Structured data ve iç linkler

- Ana sayfa: Organization, WebSite, SoftwareApplication.
- Landing: görünür içerikle eşleşen SoftwareApplication, FAQPage, BreadcrumbList.
- Blog: BlogPosting/CollectionPage, FAQ ve breadcrumb; yayın/güncelleme tarihleri içerikle eşleşir.
- Fiyatlandırma: doğrulanabilir plan içeriğiyle SoftwareApplication/Offer ve görünür FAQ.
- JSON-LD serializer `<` karakterini escape ederek script kırılmasını önler.
- Landing sayfaları ilgili çözüm ve gerçek blog rehberlerine; blog içerikleri ilgili ürün yollarına bağlanır.

## Duplicate/thin content sonucu

- `/privacy-policy` kopya sayfa üretmez; kalıcı olarak `/privacy` yoluna gider.
- Programatik landing sayfalarının her birinde özgün H1, intro, fayda, adım, FAQ ve ilişkili bağlantı verisi bulunur.
- Kullanıcı tarafından üretilen kısa link ve yayın sayfaları arama landing'i gibi kullanılmaz.

## Core Web Vitals test planı

1. Production build sonrası ana sayfa, bir Türkçe landing, pricing ve bir blog yazısını mobil/masaüstü ölç.
2. LCP hedefi 2.5 saniye, CLS hedefi 0.1, INP hedefi 200 ms eşiklerinde değerlendir.
3. Hero/wordmark görsellerinde sabit boyut ve öncelik; fold altındaki içerikte lazy loading kontrolü yap.
4. Landing ve blog rotalarında hydration/console hatası, yatay taşma ve 48 px dokunma hedeflerini doğrula.
5. Alan verisi için Search Console Core Web Vitals ve gerçek kullanıcı ölçümlerini izleyip laboratuvar sonucundan ayrı raporla.

Bu turda canlı alan verisi bulunmadığı için CWV başarısı iddia edilmez; uygulanabilir test matrisi ve kod seviyesi önlemler kayda alınmıştır.
