# GitHub OAuth Setup

## 1. GitHub Settings'e Git
Adres: https://github.com/settings/developers

## 2. OAuth Apps > New OAuth App Tıkla

**İçindekileri doldur:**

| Alan | Değer |
|------|-------|
| Application name | QR Hub 2026 |
| Homepage URL | http://localhost:3000 |
| Authorization callback URL | http://localhost:3000/api/auth/callback/github |
| Application description | QR Code Management 2026 |

## 3. App Oluştur
- "Register application" tıkla
- Sayfada:
  - **Client ID**: Kopyala
  - **Generate a new client secret**: Tıkla ve kopyala
    - Secret'lar sonra görüntülenmez! HEMEN KOPYALa

## 4. .env.local'a Yapıştır
```env
GITHUB_CLIENT_ID=YOUR_CLIENT_ID
GITHUB_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

## ✅ Test
- Dev sunucu çalış
- http://localhost:3000/login
- "GitHub ile Giriş" tıkla

---

## Production için:
- Authorization callback URL: 
  ```
  https://yourdomain.com/api/auth/callback/github
  ```
