# Enterprise Package Calculator

Bu dokuman `/pricing/enterprise` sayfasinin calisma mantigini ve server-side teklif akisinin kurulumunu ozetler.

## Genel akis

1. Kullanici slider'larla kapasite secimini yapar.
2. UI ayni shared pricing modulu ile tahmini aylik ve yillik fiyat hesaplar.
3. Teklif formu `POST /api/enterprise/quotes` endpoint'ine gider.
4. Backend slider degerlerini tekrar dogrular ve fiyatlari yeniden hesaplar.
5. Teklif `enterprise_quotes` tablosuna kaydedilir.
6. `ENABLE_ENTERPRISE_SELF_SERVE_CHECKOUT=true` ise:
   - Kullanici **giris yapmissa** kurumsal checkout ayni istekte olusturulur
     (`custom_price` + `custom_data.plan_key = enterprise_<billing>` + `quote_id`).
   - **Giris yapmamissa** yanit `requiresAuth: true` doner; UI kullaniciyi
     `/login?next=<config'li enterprise URL>` adresine yonlendirir, giris sonrasi
     ayni paketle geri doner (provisioning bir kullaniciya bagli olmak zorunda).
7. Odeme tamamlanir, Lemon `subscription_created` / `subscription_payment_success`
   webhook'lari gelir.
8. Webhook `custom_data.plan_key` (veya variant ID) ile plani `enterprise` olarak
   cozer; `user_settings.current_plan='enterprise'` + `subscription_status='active'`
   yazar ve `subscriptions` satirini upsert eder.
9. Webhook `quote_id` ile teklifi bulur, satin alinan slider konfigurasyonunu
   `user_settings.enterprise_limits` (jsonb) alanina **snapshot**'lar. Runtime
   limitler bu snapshot'tan uygulanir.
10. Yenileme / iptal / odeme basarisizligi / refund olaylari mevcut ortak
    lifecycle+invoice handler'lariyla islenir (Starter/Pro ile ayni durum haritasi).

## Slider limitleri

- `dynamicQr`: min `150`, max `3000`, step `50`, varsayilan `500`
- `menuQr`: min `10`, max `300`, step `10`, varsayilan `40`
- `vcardPages`: min `20`, max `500`, step `10`, varsayilan `80`
- `monthlyScans`: min `100000`, max `2000000`, step `50000`, varsayilan `300000`
- `teamMembers`: min `5`, max `100`, step `5`, varsayilan `15`
- `whiteLabelDomains`: min `1`, max `20`, step `1`, varsayilan `3`

## Pricing modeli

Shared pricing modulu:

- [lib/pricing/enterprise-pricing.ts](C:/Users/caner.ozdemir/Desktop/QRPROJECT/HekaQR/lib/pricing/enterprise-pricing.ts)

Temel kurallar:

- Tum fiyatlar integer kurus olarak tutulur.
- Aylik taban fiyat: `210000` kurus
- Varsayilan secimlerde aylik tahmin: `580000` kurus
- Varsayilan secimlerde yillik tahmin: `5568000` kurus
- Yillik indirim: `%20`
- Hacim indirimi esikleri config icinde tanimlidir.

## Billing preference

- Varsayilan secim `yearly`
- UI aylik ve yillik arasinda segment kontrol ile gecis yapar
- API payload icinde `billingPreference` gonderilir
- Self-serve checkout aciksa uygun enterprise variant server-side secilir

## Teklif endpoint'i

- `POST /api/enterprise/quotes`

Payload:

```json
{
  "contact": {
    "fullName": "Caner Ozdemir",
    "company": "Ornek Sirket",
    "email": "ornek@example.com",
    "phone": "+905551112233",
    "note": "Ek kurulum ihtiyacimiz var"
  },
  "configuration": {
    "dynamicQr": 500,
    "menuQr": 40,
    "vcardPages": 80,
    "monthlyScans": 300000,
    "teamMembers": 15,
    "whiteLabelDomains": 3
  },
  "billingPreference": "yearly",
  "website": ""
}
```

API asla frontend'den gelen fiyat veya variant bilgilerine guvenmez.

## Validasyon

- Frontend: `react-hook-form` + `zodResolver`
- Backend: [lib/enterprise/quote-schema.ts](C:/Users/caner.ozdemir/Desktop/QRPROJECT/HekaQR/lib/enterprise/quote-schema.ts)

Kurallar:

- `fullName`: min `2`, max `100`
- `company`: min `2`, max `150`
- `email`: gecerli format
- `phone`: yerel ve uluslararasi formati kabul eden regex
- `note`: max `1500`
- Tum slider degerleri server-side strict dogrulanir

## Spam ve rate limit

- Honeypot alan: `website`
- IP bazli limit: `10` dakikada en fazla `5` istek
- E-posta bazli limit: `60` dakikada en fazla `3` istek
- IP plain-text tutulmaz, `request_ip_hash` olarak saklanir

## Veritabani modeli

Migration:

- [migrations/enterprise_quotes.sql](C:/Users/caner.ozdemir/Desktop/QRPROJECT/HekaQR/migrations/enterprise_quotes.sql)

Ana tablo:

- `enterprise_quotes`

Onemli alanlar:

- `public_id`
- `quote_number`
- `user_id`
- `dynamic_qr`, `menu_qr`, `vcard_pages`, `monthly_scans`, `team_members`, `white_label_domains`
- `estimated_monthly_price`, `estimated_annual_price`
- `billing_preference`
- `status`
- `checkout_url`
- `provider_variant_id`, `provider_order_id`, `provider_subscription_id`
- `request_ip_hash`, `is_spam`, `spam_reason`

Teklif numarasi veritabanindaki `next_enterprise_quote_number()` fonksiyonu ile uretilir.

## Teklif durumlari

- `new`
- `contacted`
- `qualified`
- `checkout_created`
- `converted`
- `rejected`
- `expired`

## Bildirim akisi

Bildirim servisi:

- [lib/enterprise/notifications.ts](C:/Users/caner.ozdemir/Desktop/QRPROJECT/HekaQR/lib/enterprise/notifications.ts)

Su an servis bir abstraction/stub olarak log uretir. `SALES_NOTIFICATION_EMAIL` tanimliysa bildirim kuyruğa alinmis gibi loglanir. Gercek mail provider daha sonra bu katmana baglanabilir.

## Lemon custom checkout

Server-side checkout yardimcisi:

- [lib/billing/lemon-squeezy.ts](C:/Users/caner.ozdemir/Desktop/QRPROJECT/HekaQR/lib/billing/lemon-squeezy.ts)

Akis:

1. Backend fiyatı hesaplar
2. `LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID` veya `LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID` secilir
3. `custom_price` backend fiyatindan uretilir
4. `checkout_data.custom` icinde `quote_id`, `quote_number`, `billing_preference`, varsa `user_id` gonderilir

Lemon `custom_price` destegi resmi dokumanda checkout API icin tanimlidir:

- [Create a Checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout)

## Webhook kurulumu

Webhook URL:

```text
https://YOUR_DOMAIN/api/webhooks/lemon-squeezy
```

Dinlenecek eventler:

- `order_created`
- `order_refunded`
- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`
- `subscription_expired`
- `subscription_payment_success`
- `subscription_payment_failed`
- `subscription_payment_recovered`
- `subscription_payment_refunded`

Resmi event listesi:

- [Event Types](https://docs.lemonsqueezy.com/help/webhooks/event-types)

## Gerekli environment degiskenleri

```env
NEXT_PUBLIC_APP_URL=
APP_URL=

LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_TEST_MODE=true

LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID=
LEMONSQUEEZY_STARTER_YEARLY_VARIANT_ID=
LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID=
LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID=
LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID=
LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID=

ENABLE_ENTERPRISE_SELF_SERVE_CHECKOUT=false
SALES_NOTIFICATION_EMAIL=
```

## Odeme sonrasi limit snapshot (per-user entitlement)

Enterprise, statik "sinirsiz" tier degil, **satin alinan konfigurasyon kadar**
limitlenir. Webhook aktivasyonda `enterprise_quotes` satirindan konfigurasyonu
`user_settings.enterprise_limits` jsonb alanina yazar:

```json
{
  "dynamicQr": 500, "menuQr": 40, "vcardPages": 80,
  "monthlyScans": 300000, "teamMembers": 15, "whiteLabelDomains": 3,
  "quote_id": "quote_...", "billing_preference": "yearly",
  "updated_at": "2026-07-10T00:00:00.000Z"
}
```

Runtime limit cozumu (`lib/check-plan.ts` → `getUserPlan`) enterprise entitlement'te
bu snapshot'i statik tier uzerine bindirir (`applyEnterpriseLimits`). Su an
enforcement motorunun destekledigi 3 metrik cap olarak uygulanir:

| Snapshot metrigi | PlanLimits alani |
|---|---|
| `dynamicQr` | `max_qr` |
| `monthlyScans` | `max_monthly_scans` |
| `teamMembers` | `org_members` |

`menuQr` / `vcardPages` / `whiteLabelDomains` bugun hicbir planda enforce
edilmiyor; snapshot'ta kayit/gorunurluk icin tutulur, ileride enforcement
eklendiginde ayni alandan okunabilir. Snapshot **yoksa** (ornek: admin veya VIP
license ile verilen enterprise) enterprise sinirsiz tier'a duser — regresyon yok.

Migration: [supabase/migrations/20260710120000_enterprise_limits_snapshot.sql](../supabase/migrations/20260710120000_enterprise_limits_snapshot.sql)

## Lemon Squeezy panelinde manuel kurulum

Enterprise self-serve icin panelde yapilmasi gerekenler (Starter/Pro kurulumuna ek):

1. **Urun / variant olustur.** Bir "Enterprise" subscription urunu ac. Iki variant
   ekle:
   - "Enterprise Monthly" — billing interval: monthly
   - "Enterprise Yearly" — billing interval: yearly
   - Variant taban fiyati onemli degil (checkout `custom_price` ile ezilir), ama
     0 kabul edilmez; sembolik bir taban (or. 1 birim) girip birak.
   - Bu bir **subscription** variant'i olmali (one-time degil), yoksa
     `subscription_*` webhook'lari gelmez.
2. **Variant ID'leri al.** Her variant'in detay sayfasindaki (veya URL'deki)
   numerik ID'yi kopyala → env:
   - `LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID`
   - `LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID`
3. **Store ID / API key.** Zaten Starter/Pro icin dolu; degismez
   (`LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_API_KEY` — Settings > API).
4. **Webhook.** Tek webhook yeterli (Starter/Pro ile ayni). URL:
   `https://YOUR_DOMAIN/api/webhooks/lemon-squeezy`. Signing secret →
   `LEMONSQUEEZY_WEBHOOK_SECRET`. Secilecek eventler:
   `subscription_created`, `subscription_updated`, `subscription_cancelled`,
   `subscription_resumed`, `subscription_expired`, `subscription_paused`,
   `subscription_unpaused`, `subscription_payment_success`,
   `subscription_payment_failed`, `subscription_payment_recovered`,
   `subscription_payment_refunded`, `order_created`, `order_refunded`.
5. **Flag'i ac.** Variant ID'ler dolu + test mode'da uctan uca dogrulandiktan
   sonra `ENABLE_ENTERPRISE_SELF_SERVE_CHECKOUT=true` yap, process'i restart et.
6. **Live mode gecisi.** Live store'da variant'lari tekrar olustur, **live variant
   ID'lerini** env'e koy, `LEMONSQUEEZY_TEST_MODE=false` yap, webhook secret'in
   live store secret'i oldugundan emin ol, process restart.

## Test mode ve production kontrol listesi

- Test store ve test variant'lari ile `LEMONSQUEEZY_TEST_MODE=true` kullanin
- Production'da `APP_URL` ve `NEXT_PUBLIC_APP_URL` canli domaine ayarli olsun
- `ENABLE_ENTERPRISE_SELF_SERVE_CHECKOUT` sadece hazirsa acilsin
- `LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID` ve `_YEARLY_VARIANT_ID` dolu olsun
- Webhook secret ve event listesi panelde dogru ayarlansin
- `enterprise_quotes.sql` migration'i calistirilsin
- `20260710120000_enterprise_limits_snapshot.sql` migration'i calistirilsin
  (yoksa enterprise aktivasyonu `enterprise_limits` kolonunu yazamaz)
- Bir test teklif istegi, bir checkout acilisi ve en az bir simulate webhook ile smoke test yapin
