# QR Publish marka asset matrisi

## Kanonik kaynak kararı

Repository geçmişindeki `feat: use provided brand assets` commit'iyle eklenen kök `Logo.webp` ve `Icon.webp` master çifttir. `BrandLogo` ve `LogoRenderer` wordmark için `Logo.webp` kullanır. Kare uygulama işareti `Icon.webp` dosyasıdır.

Farklı scanner formundaki eski PWA ikonları ve public SVG'ler bu aileyle çeliştiği için aktif sistemden kaldırıldı. SEO Organization/Publisher şeması, aynı wordmark ailesindeki yüksek çözünürlüklü `public/brand/qr-publish-logo.png` dosyasını kullanır.

## Kullanım matrisi

| Yüzey | Dosya | Boyut/özellik |
| --- | --- | --- |
| Public site ve dashboard wordmark | `Logo.webp` | 1542×292, şeffaf |
| Next metadata web icon | `Icon.webp` | 300×292, şeffaf |
| Klasik favicon | `public/favicon.ico` | 16–256 çoklu boyut, `Icon.webp` türevi |
| PWA any | `public/icons/icon-192.png`, `icon-512.png` | Şeffaf, kare, `Icon.webp` türevi |
| PWA maskable | `public/icons/icon-maskable-192.png`, `icon-maskable-512.png` | Güvenli alanlı, koyu opak zemin |
| Apple touch icon | `public/icons/apple-touch-icon.png` | 180×180, beyaz opak zemin |
| JSON-LD publisher logo | `public/brand/qr-publish-logo.png` | 1672×941, yüksek çözünürlüklü wordmark |

## Erişilebilirlik ve tema

Wordmark bileşeni `alt="QR Publish"` kullanır ve `object-contain` ile kırpılmaz. Master wordmark şeffaf olduğu için light/dark yüzeylerde aynı dosya kullanılır; gerektiğinde `LogoRenderer` frame seçeneği kontrast yüzeyi sağlar. PWA maskable ikonlarında işletim sistemi kırpmasına karşı yaklaşık yüzde 16 dış güvenli alan bırakılmıştır.

## Cache stratejisi

Metadata ve manifest URL'lerinde `BRAND_ASSET_VERSION` query sürümü bulunur. Master varlık değişirse türevler yeniden üretilir ve bu sürüm artırılır; böylece tarayıcı/PWA favicon cache'i kontrollü olarak yenilenir.

## Türetme doğrulaması

Tüm raster türevler `Icon.webp` kaynağından yüksek kaliteli Lanczos ölçekleme ile üretildi. Manifest `any` ve `maskable` dosyalarını ayrı kullanır. Apple ikonu WebP yerine PNG'dir.
