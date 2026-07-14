# Plan ve özellik denetimi

Tarih: 2026-07-13. Kaynak: uygulama kodu ve repository migration'ları. Canlı Supabase veritabanına erişim verilmediği için gerçek kullanım sayıları bu denetimde ölçülmedi.

## Mevcut durum

`lib/plan-limits.ts` temel limit kaynağıdır; `lib/check-plan.ts` kullanıcı planını `user_settings` tablosundan okur. QR oluşturma `app/api/v1/qrcodes/route.ts` ile toplam QR limitini denetler. Menu ve vCard/Multi limitleri yalnız Enterprise snapshot için ayrı kontrol edilir. `app/q/[slug]/route.ts` tüm kayıtları QRPublish yönlendirmesi üzerinden çözer ve tarama kaydı tutar.

## Bulunan uyumsuzluklar

| Alan | Görünen fiyatlandırma | Çalışan sistem |
| --- | --- | --- |
| Free Menu QR | Yok | Ayrı limit olmadığı için oluşturulabiliyor |
| QR limiti | Dinamik QR gibi sunuluyor | Tüm `qr_codes` kayıtlarını sayıyor |
| Tarama | Pro sınırsız yazıyor | Kodda plan bazlı farklı değerler var |
| Statik QR | Ayrı model yok | Tüm kayıtlar redirect/analitik odaklı dinamik |
| Klasör ve toplu kota | Tabloda pazarlama metni | Sunucuda eksik veya farklı kontrol |

## Riskler

- Plan değerleri `lib/pricing.ts` ve `lib/plan-limits.ts` içinde birbirinden bağımsız.
- QR oluşturma sayımı read-then-insert olduğu için eşzamanlı isteklerde limit aşılabilir.
- Downgrade sonrası mevcut QR'lar için salt-okunur işareti bulunmuyor.
- API anahtarı ve bazı toplu akışlar ortak entitlement ölçümü kullanmıyor.

## Güvenli geçiş

Mevcut bütün QR kayıtları `dynamic` olarak sınıflandırılmalıdır; böylece basılmış yönlendirmeler ve analitik korunur. Yeni statik kayıtlar için ayrı mode/payload alanları gerekir. Migration uygulanmadan uygulama davranışı değiştirilmemelidir.
