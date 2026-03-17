# QR Hub Kurulum Rehberi

## Lokal kurulum

Proje klasöründe bağımlılıkları kurup çalıştırın.

```bash
npm install

# Çalıştır
npm run dev
```

Windows PowerShell kullanıyorsanız:

```powershell
npm install
npm run dev
```

## Supabase migration (mevcut kurulumlar için)

- Yeni özellikler (klasörler, user settings, api keys, unique scans vb.) için: `FEATURES_MIGRATION.sql`
- Sadece scan_logs RLS düzeltmesi için: `SECURITY_MIGRATION.sql`

Supabase SQL Editor’da dosya içeriğini çalıştırın. Prod ortamda tablo içeriği olan projelerde **MIGRATION.sql** yerine yukarıdaki “incremental” dosyaları tercih edin.

## Vercel + Custom Domain (White‑label) kurulumu

Bu sistemde kullanıcı bazlı `custom_domain` tanımlanır ve dashboard linkleri/QR indirmeleri bu domain’i “public origin” olarak kullanır.

- Vercel’de ilgili projeye girin ve `Settings → Domains` bölümünden domain’i ekleyin.
- Domain DNS’inde Vercel’in istediği kayıtları (A / CNAME) tanımlayın.
- Domain doğrulandıktan sonra “Primary” olarak işaretleyin (isteğe bağlı).
- Uygulama içinde `Dashboard → Ayarlar → Custom Domain` alanına domain’i girin. Örn: `https://qr.mydomain.com`

Notlar:
- Domain’in HTTPS aktif olması gerekir.
- QR yönlendirme endpoint’i (`/q/[slug]`) yine aynı uygulamayı servis eder; sadece kullanıcıya gösterilen link origin’i değişir.
