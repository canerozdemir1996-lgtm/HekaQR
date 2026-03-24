# Google OAuth 2.0 Setup

## 1. Google Cloud Console'a Git
Adres: https://console.cloud.google.com/

## 2. Proje Oluştur
- Sol üst köşede "Select a Project"
- "NEW PROJECT" tıkla
- Name: "QR Hub 2026"
- Oluştur ve seç

## 3. OAuth Consent Screen Kur
- Sol menü: APIs & Services > OAuth consent screen
- User Type: External (önerilen)
- Create
- Aşağıdakileri doldur:
  - App name: "QR Hub"
  - User support email: senin@email.com
  - Developer contact email: senin@email.com
- Save and Continue

- Scopes: skip et (default'lar yeter)
- Save and Continue

- Test users: sen@email.com ekle (test için)
- Save and Continue

## 4. OAuth 2.0 Credentials Oluştur
- Sol menü: APIs & Services > Credentials
- "CREATE CREDENTIALS"
- Type: "OAuth client ID"
- Application type: "Web application"

**Authorized JavaScript origins** (EKLE):
```
http://localhost:3000
http://localhost:3000/api/auth/callback/google
https://yourdomain.com (production için)
```

**Authorized redirect URIs** (EKLE):
```
http://localhost:3000/api/auth/callback/google
https://yourdomain.com/api/auth/callback/google (production)
```

- Create
- Copy:
  - Client ID → GOOGLE_CLIENT_ID
  - Client Secret → GOOGLE_CLIENT_SECRET

## 5. .env.local'a Yapıştır
```env
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

## ✅ Test
- Dev sunucu çalış
- http://localhost:3000/login
- "Google ile Giriş" tıkla
