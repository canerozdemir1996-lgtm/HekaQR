# HekaQR - Yeni Özellikler Kurulum Rehberi

## Yapılan Güncellemeler (Dönem 1)

Bu dökümantasyon, HekaQR projesine eklenen yeni özellikleri açıklamaktadır.

---

## 1. 🔄 Dinamik QR Kodları

**Özellik**: QR kodlarının içeriğini yazdıktan sonra değiştirebilme.

### Migration Dosyaları
- `DYNAMIC_QR_MIGRATION.sql` - DB şeması güncellemeleri

### Yapılan Değişiklikler
- `qr_codes` tablosuna `is_dynamic` ve `dynamic_content` alanları eklendi
- `dynamic_qr_history` tablosu oluşturuldu (değişiklik geçmişi)
- `/api/v1/qrcodes/[id]/route.ts` - PUT endpoint'i
- `/app/q/[slug]/route.ts` - Dinamik URL yönlendirmesi

### Kullanım
```typescript
// Dinamik QR oluştur
POST /api/v1/qrcodes
{
  "is_dynamic": true,
  "dynamic_content": {
    "target_url": "https://example.com"
  }
  // ... diğer alanlar
}

// Dinamik QR güncelleştir
PUT /api/v1/qrcodes/{id}
{
  "dynamic_content": {
    "target_url": "https://newurl.com"
  }
}
```

---

## 2. 🎨 Logo & Çerçeve Tasarımı

**Özellik**: QR kodlarına logo ekle ve çeşitli frame stillerini uygula.

### Migration Dosyaları
- `LOGO_FRAME_MIGRATION.sql` - Tasarım tabloları ve şablonları

### Yapılan Değişiklikler
- `qr_design_templates` tablosu - Önceden tanımlı denşmlonlar
- `user_qr_designs` tablosu - Kullanıcı özel tasarımlar
- `/lib/services/qrDesignService.ts` - Logo & frame işleme
  - `addLogoToQR()` - Logo ekleme
  - `addFrameToQR()` - Frame uygulama
  - `applyDesignConfig()` - Tasarım konfigürasyonu

### Önceden Tanımlı Şablonlar
- Modern
- Pro
- Vibrant
- Dark Mode
- Retro

### Kullanım
```typescript
// Logo ekle
const qrWithLogo = await addLogoToQR(
  qrBuffer,
  "https://example.com/logo.png",
  30, // %30 boyut
  true // transparent background
);

// Frame uygula
const qrWithFrame = await addFrameToQR(
  qrBuffer,
  "professional"
);
```

---

## 3. 📋 Yeni QR Türleri

**Özellik**: Daha fazla QR kod türü desteği (Event, Location, Document, Audio, Coupon vb.)

### Yeni Türler
- `event` - iCal format takvim etkinliği
- `location` - Google Maps linki
- `document` - PDF/dosya indirmesi
- `audio` - Müzik/ses dosyası
- `coupon` - İndirim kupon kodu
- `feedback` - Form/anket linki
- `gs1` - Ürün barcode'u
- `menu` - Restaurant menüsü

### Migration Dosyaları
- `qr_codes` tablosunda `event_data`, `location_data`, `document_urls` alanları

### Services
- `/lib/services/qrContentBuilder.ts` - İçerik oluşturma fonksiyonları

### Kullanım
```typescript
import { buildEventQrContent, buildLocationQrContent } from "@/lib/services/qrContentBuilder";

// Event QR
const iCal = buildEventQrContent({
  title: "Konferans",
  startDate: "2026-03-23T14:00:00Z",
  location: "İstanbul"
});

// Location QR
const mapUrl = buildLocationQrContent({
  latitude: 41.0082,
  longitude: 28.9784,
  title: "Cafe örneği"
});
```

---

## 4. 📊 Gelişmiş Analytics

**Özellik**: Conversion tracking, anomaly detection, cohort analysis.

### Migration Dosyaları
- `ADVANCED_ANALYTICS_MIGRATION.sql` - Analytics tabloları

### Yeni Tablolar
- `conversion_events` - Dönüşüm olayları (satın alma, form gönderimi vb.)
- `anomaly_logs` - Şüpheli tarama tespiti
- `cohort_data` - Retention analizi
- `scan_daily_summary` - Günlük özet cache

### Services
- `/lib/services/analyticsService.ts` - Analytics işlemleri
  - `trackConversionEvent()` - Dönüşüm kaydı
  - `detectAnomalies()` - Anomali tespiti
  - `getConversionMetrics()` - Dönüşüm oranları

### Kullanım
```typescript
// Conversion kaydı
await analyticsService.trackConversionEvent(
  qrId,
  scanLogId,
  "purchase",
  99.99,
  { product_id: "123" }
);

// Conversion rate
const metrics = await analyticsService.getConversionMetrics(qrId, 30);
```

---

## 5. 🔗 Entegrasyonlar

### Webhooks (Zapier/Make uyumlu)
- `/api/v1/integrations/webhooks/route.ts`

**Triggers**:
- `qr_created` - QR oluşturulduğunda
- `qr_updated` - QR güncellendiğinde
- `scan_received` - Tarama alındığında
- `scan_milestone` - 100, 500, 1000 tarama vb.
- `conversion_event` - Dönüşüm olayı
- `anomaly_detected` - Anomali tespit edildiğinde

```typescript
// Webhook kurun
PUT /api/v1/integrations/webhooks
{
  "qr_id": "uuid",
  "user_id": "uuid",
  "webhook_url": "https://zapier.com/hooks/catch/...",
  "triggers": ["scan_received", "conversion_event"],
  "active": true
}
```

### Google Sheets Entegrasyonu
- `/api/v1/integrations/google-sheets/route.ts`

**Bulk QR İmport**:
```typescript
POST /api/v1/integrations/google-sheets
{
  "userId": "uuid",
  "csvData": "title,url,qr_type,tags,notes\n...",
  "sheetName": "QRs"
}
```

CSV Şeması:
```
title,url,qr_type,tags,notes
"Ürün 1","https://example.com/p1","url","product|sale",""
"Etkinlik","https://forms.google.com/form","event","event",""
```

---

## 6. 🛡️ Güvenlik & Audit

### Rate Limiting
- API key başına 100 istek/dakika
- `/lib/middleware/auditLog.ts`

### Audit Logs
- Tüm API işlemleri kaydedilir
- QR değişiklikler izlenir

### Yeni Tablolar
- `audit_logs` - API işlem logs
- `qr_change_logs` - QR değişiklikler
- `webhook_subscriptions` - Webhook ayarları
- `webhook_delivery_logs` - Webhook teslimat logs

---

## 📦 Gerekli Paket Güncellemeleri

```json
{
  "canvas": "^2.11.0",
  "sharp": "^0.33.0",
  "qr-code-styling": "^1.6.0"
}
```

Kurulum:
```bash
npm install canvas sharp
```

---

## 🚀 Sonraki Adımlar (Dönem 2)

- [ ] SSO/MFA (NextAuth.js)
- [ ] Team Workspaces & Role Management
- [ ] Mobile Landing Page Builder (no-code)
- [ ] Lead Generation Forms
- [ ] Çoklu Dil Desteği (i18n)
- [ ] Mobil Uygulama (React Native)

---

## 📝 Database Migrations Sırası

```sql
-- 1. Açın: DYNAMIC_QR_MIGRATION.sql
-- 2. Açın: LOGO_FRAME_MIGRATION.sql
-- 3. Açın: ADVANCED_ANALYTICS_MIGRATION.sql
-- 4. Açın: /lib/middleware/auditLog.ts -> AUDIT_MIGRATION
```

Supabase SQL Editor'de sırası ile çalıştırın.

---

## 🐛 Troubleshooting

### Logo overlay hatası
- Dosya URL'si erişilebilir olduğundan emin olun
- Ha

ata CORS hataları varsa, sharp versiyonunu güncelleyin

### Rate limit aşıldı
- API key'i kontrol edin
- 60 saniye bekleyin

### Webhook yok
- Webhook URL'sinin POST kabul ettiğinden emin olun
- Webhook delivery logs'u kontrol edin

---

## 📞 Destek

Daha fazla bilgi için proje belgelendirmesine bakın veya sorunları GitHub'da açın.
