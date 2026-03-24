## ⚡ 30 DAKIKA HIZLI KURULUM REHBERI

### 🎯 Hedef
Login olmak ve dashboard'da 3 dummy QR kodu görmek.

---

## 0️⃣ ÖNCESİ: GİTHUB & GOOGLE HESAPLAR HAZIR MI?
- [ ] Google hesabın var?
- [ ] GitHub hesabın var?

Yoksa 2 dakika de oluştur: google.com ve github.com

---

## 🚀 ADÍM 1: SUPABASE SETUP (5 dakika)

1. **Browser'da aç:** https://supabase.com
2. **Sign up** et (e-posta ile)
3. **New Project** tıkla
4. Bilgileri doldur:
   - Name: `qr-hub-2026`
   - Database Password: güçlü şifre ver (KAYDEt!)
   - Region: `Turkey` veya `Europe`
5. **Create new project** tıkla (3 dakika bekle)
6. Oluştuktan sonra:
   - Sol menü: Settings (⚙️) > API
   - Copy et (ayrı tab'da notepad aç):
     ```
     Project URL:              [KOPYALA]
     anon public:              [KOPYALA]  
     service_role (secret):    [KOPYALA]
     ```
7. **Bu proje ID'sine ihtiyacımız var** (URL'den):
   ```
   https://BURASI_PROJE_ID.supabase.co
   ```

---

## 🗄️ ADIM 2: DATABASE SETUP (5 dakika)

1. **Supabase'de**: Sol menü → SQL Editor
2. **New query** tıkla
3. **COMPLETE_DATABASE_SETUP.sql** dosyasını aç (repository'de)
4. Tüm SQL'i editor'a YAPISTIR
5. **Run** tıkla (ctrl+enter)
   - ✅ Ye şileriyor: Database kuruldu!
   - ❌ Error varsa: Hata mesajını not et (sonra çöz)

6. **İkinci adım**: SQL_SETUP_TEST_DATA.sql
   - Yeni query aç
   - SQL_SETUP_TEST_DATA.sql'i yapıştır
   - Run tıkla
   - Test kullanıcı oluşturuldu ✅

7. **Doğrulama**: 
   - Aşağıdaki SQL'i çalıştır:
   ```sql
   SELECT email FROM auth.users LIMIT 1;
   ```
   - Çıktı: `test@example.com` ✅

---

## 🔐 ADIM 3: ENVIRONMENT VARIABLES (2 dakika)

1. **VS Code'da aç:** `.env.local` dosyası
2. **Supabase'den kopyaladığın 3 değeri yapıştır:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

3. **NEXTAUTH değerleri zaten var:**
   ```env
   NEXTAUTH_SECRET=WwOkCHdh9mbWC6mW0YS+kxnpls/IUaq1Pg++Ldkght0=
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Dosyayı kaydet** (ctrl+s)

---

## 🔵 ADIM 4: GOOGLE OAUTH (5 dakika)

1. **Browser'da aç:** https://console.cloud.google.com/
2. **Sign in** et (Google hesabınla)
3. **Select a Project** > **NEW PROJECT**
   - Name: `QR Hub 2026`
   - Create
4. Proje açıldıktan sonra:
   - Sol menü: APIs & Services > **Credentials**
   - **CREATE CREDENTIALS** > OAuth client ID
   - **Application type:** Web application
   - **Authorized JavaScript origins** (ADD):
     ```
     http://localhost:3000
     ```
   - **Authorized redirect URIs** (ADD):
     ```
     http://localhost:3000/api/auth/callback/google
     ```
   - **Create**
5. Açılan popup'tan:
   - **Client ID** [KOPYALA]
   - **Client Secret** [KOPYALA]
6. `.env.local`a yapıştır:
   ```env
   GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
   ```
7. **Dosyayı kaydet**

---

## 🐙 ADIM 5: GITHUB OAUTH (5 dakika)

1. **GitHub login:** https://github.com/login
2. **Settings > Developer settings > OAuth Apps**
3. **New OAuth App** tıkla
4. Formu doldur:
   - Application name: `QR Hub`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
5. **Register application** tıkla
6. Sayfada ⚠️ **ÖNEMLİ**:
   - **Client ID** [KOPYALA - ⬆️ HEMEN yapmak lazım]
   - **Generate a new client secret** tıkla
   - **Client Secret** [KOPYALA - ⚠️ SONRA GÖRÜNTÜLENMEYECEK]
7. `.env.local`a yapıştır:
   ```env
   GITHUB_CLIENT_ID=YOUR_CLIENT_ID
   GITHUB_CLIENT_SECRET=YOUR_CLIENT_SECRET
   ```
8. **Dosyayı kaydet**

---

## ▶️ ADIM 6: ÇALIŞTIR (2 dakika)

1. **Terminal aç** (ctrl+`)
2. **npm run dev** yaz ve Enter
3. **Bekle** - "ready in X.Xs" görmeli
4. **Browser aç**: http://localhost:3000/login

---

## ✅ TEST (3 dakika)

1. **Email & Password ile:**
   - Email: `test@example.com`
   - Şifre: `test123`
   - **Login** tıkla
   - ✅ Dashboard'a gitmelisin!

2. **Dashboard'da kontrol:**
   - ✅ 3 dummy QR kod görüyorum?
   - ✅ İstatistikler gösteriyor (Total, Active, Scans)?
   - ✅ Search bar çalışıyor?
   - ✅ Grid/List toggle çalışıyor?

3. **Logout**:
   - Sağ üst profil menü > **Logout**
   - `/login`'e geri dön

---

## 🔧 SORUNLAR & ÇÖZÜMLERİ

### ❌ "NEXT_PUBLIC_SUPABASE_URL is undefined"
**Çözüm:**
- `.env.local` dosyası kapalı mı? Aç ve kaydet
- Terminal'i kapat ve `npm run dev` yeniden çalıştır
- Browser cache'i temizle (ctrl+shift+del)

### ❌ "Auth error: Invalid credentials"
**Çözüm:**
- Test kullanıcısı oluşturulmadı mı?
  - SQL_SETUP_TEST_DATA.sql tekrar çalıştır
- Şifre yanlış mı?
  - Supabase SQL'de:
    ```sql
    SELECT email FROM auth.users;
    ```
  - Eğer test@example.com yoksa yeniden ekle

### ❌ "Error: Google OAuth failed"
**Çözüm:**
- Client ID/Secret doğru mu? (.env.local'a bak)
- Google Console'da redirect URI doğru mu?
  - `http://localhost:3000/api/auth/callback/google`

### ❌ "Error: GitHub OAuth failed"
**Çözüm:**
- Client ID/Secret doğru mu? (.env.local'a bak)
- GitHub'da Authorization callback URL:
  - `http://localhost:3000/api/auth/callback/github`

### ❌ "RLS error: relation not found"
**Çözüm:**
- COMPLETE_DATABASE_SETUP.sql henüz çalıştırılmadı
- Supabase SQL Editor'de tekrar çalıştır

### ❌ "Dashboard boş - hiç QR kod yok"
**Çözüm:**
- SQL_SETUP_TEST_DATA.sql ile test verisi ekle
- Not: Login olan test@example.com hesabına ait verileri göreceksin

---

## 🎉 TAMAMLANDI!

- ✅ Supabase setup
- ✅ Database kuruldu
- ✅ Test verisi var
- ✅ Google OAuth linked
- ✅ GitHub OAuth linked
- ✅ NextAuth çalışıyor
- ✅ Dashboard 2026 tasarımı canlı!

**İlk production'a atmadan:**
- [ ] NEXTAUTH_SECRET değiştir (rastgele oluştur)
- [ ] NEXTAUTH_URL production URL'ne ayarla
- [ ] Google/GitHub OAuth'u production için ayarla
- [ ] Database backupı al

---

## 📞 SORULAR?

Dosyalara bak:
- `GOOGLE_OAUTH_SETUP.md` - Google detaylı rehber
- `GITHUB_OAUTH_SETUP.md` - GitHub detaylı rehber
- `SUPABASE_OAUTH_SETUP.md` - Supabase detaylı rehber
- `SQL_SETUP_TEST_DATA.sql` - Database detaylı SQL
- `NEXT_STEPS_2026.md` - Bundan sonra yapılacaklar
