# "Failed to fetch" Hatası Giderme

## 1. Hızlı Bağlantı Testi

Terminalde çalıştır:
```bash
# Supabase projenize ulaşılabiliyor mu?
curl -I https://didtokkkaglzxytzebhn.supabase.co/rest/v1/ --max-time 10

# Beklenen: HTTP/2 200 veya 401
# Hata: "Could not resolve host" → DNS sorunu
# Hata: timeout → Güvenlik grubu engelliyor
```

## 2. Node.js ile Test

```bash
cd ~/QRproject/HekaQRS
npm install  # önce paketleri kur
node test-connection.mjs
```

## 3. Olası Sebepler ve Çözümler

### A) Supabase projesi "Paused" (En yaygın sebep!)
- https://supabase.com/dashboard adresine gidin
- Projenizi açın
- "Your project is paused" uyarısı varsa **"Restore project"** butonuna basın
- Ücretsiz planda 1 hafta inaktif kalırsa proje duruyor

### B) AWS Güvenlik Grubu engeli
EC2 instance'ınızın güvenlik grubu dışarıya giden (egress) HTTPS trafiğini engelliyor olabilir.

AWS Console → EC2 → Security Groups → Outbound rules:
- HTTPS (443) All traffic → 0.0.0.0/0 kuralı ekleyin

### C) API Key formatı uyumsuzluğu
Eski `eyJ...` format yerine `sb_publishable_...` formatı kullanıyorsanız:
- Supabase Dashboard → Settings → API
- "Legacy API keys" bölümünden eski `eyJ...` formatını kopyalayın
- .env.local dosyasını güncelleyin

## 4. Çalışıyor mu Kontrol

Uygulama çalışırken tarayıcıda:
```
http://localhost:3000/api/check-env
```
Bu sayfa tüm env değerlerini ve Supabase ping sonucunu gösterir.
