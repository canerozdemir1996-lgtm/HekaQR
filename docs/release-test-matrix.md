# QRPublish release test matrisi

Tarih: 2026-07-16

## Zorunlu, non-interactive kapı

`npm run verify:release` sırayla ESLint, TypeScript, tüm unit/integration testleri ve production build çalıştırır; ilk hatada non-zero kodla durur. Eski interaktif `next lint` kaldırılmıştır.

Kritik Playwright akışlarını aynı kapıya dahil etmek için güvenli test verileriyle `RELEASE_E2E=1 npm run verify:release` kullanılır. E2E açılmadığında komut bunu açıkça “koşul nedeniyle çalıştırılmadı” olarak raporlar; sahte yeşil sonuç üretmez.

## Kritik akışlar

| Alan | Unit / integration | Playwright | Veri gereksinimi |
| --- | --- | --- | --- |
| Onboarding | QR oluşturma/gruplama testleri | Modal ve builder açılışı | E2E kullanıcı hesabı |
| Sınav / ek süre | `exam.test`, `exam-extra-time.test` | Public sınav keyboard + 390 px responsive | `E2E_EXAM_SLUG` |
| Bulk upload | import parser/API/security testleri | CSV düzenleme, XLSX mobil, retry | Auth veya `E2E_UI_HARNESS=1` |
| Plan UI | `plan-ui.test` | Aktif/expired badge ve ayrı upgrade CTA | E2E kullanıcı hesabı; plan API mock |
| SEO güvenlik | `seo-audit.test`, `technical-seo.test` | Public smoke içinde route sinyalleri | Yok |

Playwright testleri üretim verisini silmez. Kimlik veya slug yoksa ilgili senaryo gerekçeli `skipped` kalır. Canlı Hostinger doğrulaması ancak GitHub push sonrası yeni sürüm yayına alındığında ayrıca yapılabilir.

## 2026-07-16 yerel production sonucu

- ESLint: 0 error. Mevcut React 18 → yeni compiler kural geçiş borcu warning olarak görünür tutuldu.
- TypeScript: geçti.
- Unit / integration: 205/205 geçti.
- Production build: geçti; 95 statik sayfa üretildi.
- Playwright (`next start`, Chromium, 390 px mobil dahil): 5 geçti, 6 gerekçeli skipped.
- Geçen browser akışları: ana sayfa yasal linkleri, signup yasal açıklaması, CSV bulk submit, XLSX mobil overflow ve failed-import retry.
- Skipped: kimlik gerektiren dashboard/onboarding/plan senaryoları ile `E2E_EXAM_SLUG` ve `E2E_PUBLIC_QR_SLUG` gerektiren public kayıtlar. Bunlar test dosyalarında hazırdır; gerçek test hesabı/verisi verilmeden üretim verisine müdahale edilmedi.
