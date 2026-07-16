# Marka ve teknik identifier envanteri

Kanonik değerler `lib/brand.ts` içindedir: ürün adı **QR Publish**, origin **https://qrpublish.com**, iletişim **contact@qrpublish.com**.

## Değiştirilen public değerler

- `support@heka-qr.com` bağlantıları `contact@qrpublish.com` oldu.
- Studio ve dashboard varsayılan indirme adları `qr-publish` oldu.
- NPM paket görünen adı `qr-publish` oldu; repository klasörü veya GitHub repository adı değiştirilmedi.
- Kaynak içi tasarım sistemi başlıkları QR Publish olarak güncellendi.
- Eski `qrhub-theme` localStorage anahtarı `qr-publish-theme` anahtarına taşındı.

## Geriye uyumlu teknik sözleşmeler

- Yeni iç bulk header ailesi `x-qrpublish-*` kullanılır.
- Sunucu, daha önce dağıtılmış istemcileri kırmamak için `x-heka-import-token`, `x-heka-import-batch` ve `x-heka-import-row` header'larını yalnız okuma fallback'i olarak kabul eder.
- `qrhub-theme` sadece bir defalık localStorage taşıma fallback'i olarak okunur; yeni yazımlar `qr-publish-theme` anahtarına yapılır.

## Bilinçli olarak değiştirilmeyenler

- Yerel workspace klasörü ve GitHub repository adı dağıtım sözleşmesi değildir; bu kod değişikliği içinde rename edilmedi.
- Migration geçmişi, git geçmişi, build logları ve eski teknik doküman kayıtları tarihsel kanıttır; public marka yüzeyi sayılmaz.
- Webhook `X-QRPublish-*` ve integration source `qr-publish` zaten kanoniktir.

## Doğrulama araması

Public kaynaklarda `support@heka-qr.com`, kullanıcıya indirilen `heka-qr` dosya adı ve aktif yazım yapan `qrhub-theme` kalmamalıdır. Kalan `x-heka-*` değerleri yalnız `LEGACY_IMPORT_HEADERS` geriye uyumluluk sabitlerinde bulunmalıdır.
