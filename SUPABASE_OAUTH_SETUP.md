# Supabase OAuth Provider Setup

## ÖNEMLI ❗
NextAuth, Supabase OAuth'u değil kendi OAuth provider'larını kullanır.
AMA Supabase'de email/şifre ile login için user tablosu gerekli.

---

## Step 1: Supabase Dashboard'a Git
https://supabase.com/dashboard

## Step 2: Projenizi Seçin ve Settings'e Git
- Sol menü: Settings (⚙️)
- Authentication

## Step 3: Email Provider Etkinleştir
- Email tab'ında
- "Confirm email" checkbox'ı aç
  - Enable confirmations: ON
  - Confirm email change: ON
  - Secure email change: ON

## Step 4: Database Roles Kontrol Et
```sql
-- Supabase SQL Editor'da çalıştır
-- auth şemasında gerekli tabloları kontrol et
SELECT * FROM auth.users LIMIT 1;
```

## Step 5: RLS Politikaları Kontrol Et
- İlgili tablolarda RLS etkinleşmiş mi?
- Doğru politikaları var mı?

```sql
-- RLS enable mi diye kontrol et
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE rowsecurity = true;
```

---

## Supabase'de Google/GitHub OAuth (OPTIONAL)
- Authentication > Providers > Google > Enable
- Authentication > Providers > GitHub > Enable
- Client ID/Secret bilgileri gir

Bu sadece Supabase UI'de login için kullanılır.
NextAuth'da ayrı credentials gerekli!

---

## ✅ Kontrol Listesi

- [x] Email Provider enabled?
- [x] Confirm email enabled?
- [x] RLS policies created?
- [x] Test user oluşturuldu?
- [x] QR codes tablosu verili verisi var?

---

## SORUNLAR?

### "auth.users tablosu yok"
→ COMPLETE_DATABASE_SETUP.sql henüz çalıştırılmadı

### "Permission denied" sırasında login
→ RLS policies yanlış, COMPLETE_DATABASE_SETUP.sql tekrar çalıştır

### "Invalid credentials"
→ Test kullanıcısı şifresi yanlış, new user ekle

```sql
-- Yeni test kullanıcısı ekle
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'newtest@example.com',
  crypt('test123', gen_salt('bf')),
  now(), now(), now()
);
```
