# QR gruplama ürün mimarisi

## Karar

QRPublish üç farklı kavramı aynı veri modeli altında birleştirmeyecek:

1. **Klasör:** QR kodlarını bulmak, filtrelemek ve toplu işlem yapmak için operasyonel konteynerdir.
2. **UTM kampanyası:** `utm_campaign`, `utm_source` ve `utm_medium` alanlarından türetilen pazarlama raporu boyutudur.
3. **Kupon kampanyası:** Yalnız kupon QR türünün kod, indirim, kullanım limiti ve redemption davranışını tutan domain kaydıdır.

Bir QR aynı anda bir klasörde ve bir UTM kampanyasında bulunabilir. Bu ilişkiler birbirini değiştirmez.

## Mevcut veri modeli

| Kavram | Kaynak | İlişki | Yaşam döngüsü |
| --- | --- | --- | --- |
| Klasör | `qr_folders`, `qr_codes.folder_id` | Bir klasörde birçok QR; QR için nullable tek klasör | Kullanıcı oluşturur, yeniden adlandırır ve siler. Silinen klasörün QR'ları klasörsüz kalır. |
| UTM kampanyası | `qr_codes.utm_campaign`, `utm_source`, `utm_medium` | Ayrı campaign satırı yok; QR alanlarından raporda türetilir | QR oluşturulurken/düzenlenirken değişir. Boş değerler “Kampanyasız QR'lar” grubunda görünür. |
| Kupon kampanyası | `coupon_campaigns.qr_id` | Kupon QR başına tek domain kaydı | Kupon içeriği, kodları ve redemption kayıtlarıyla birlikte yönetilir. |

Dashboard `/dashboard/campaigns` ekranı yalnız UTM performansını gösterir. `coupon_campaigns` bu ekranda genel kampanya konteyneri gibi kullanılmaz.

## Bulk upload kararı

Ayrı bir “bulk klasörü” sistemi kurulmayacak. Bulk ile oluşturulan QR kodları mevcut `qr_folders` kayıtlarını kullanacak.

Bulk görevinde geriye uyumlu, yeni bir `import_batches` kaydı eklenebilir. Bu kayıt QR gruplaması değil, işlem/audit kaydıdır ve en az şu alanları taşımalıdır:

- `id`, `user_id`, opsiyonel `organization_id`
- kaynak dosya adı, formatı ve checksum
- benzersiz `idempotency_key`
- durum: queued, processing, partial, completed, failed, cancelled
- başarılı, hatalı ve atlanan satır sayıları
- hedef `folder_id`
- hata raporu ve retry bilgisi
- `created_at`, `started_at`, `completed_at`

QR kayıtları normal `folder_id` ilişkisini korur. Import batch ile QR arasında audit için ayrı ilişki kurulabilir; kullanıcı navigasyonunda ikinci bir klasör ağacı gösterilmez.

## Yetkilendirme ve plan sınırları

- Klasör CRUD işlemleri server-side auth ve sahiplik filtresiyle çalışır.
- Yeni klasör oluşturma mevcut plan limiti kontrolünden geçer.
- UTM kampanya görünümü yalnız kullanıcının erişebildiği QR listesinden türetilir.
- Import batch yetkisi, bulk görevinde QR oluşturma, organizasyon üyeliği, hedef klasör sahipliği ve aylık rezervasyon sayacıyla birlikte server-side doğrulanmalıdır.

## Migration ve geri dönüş planı

Bu karar mevcut tabloları değiştirmez; bu görev için migration yoktur.

Gelecekteki `import_batches` migration'ı additive olmalıdır. Mevcut `qr_codes.folder_id`, UTM alanları veya `coupon_campaigns` taşınmamalı ya da yeniden adlandırılmamalıdır. Import özelliği geri alınırsa batch tabloları okunmadan bırakılabilir; mevcut QR ve klasör davranışı etkilenmez.

