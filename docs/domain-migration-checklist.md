# Domain Migration Checklist

Bu doküman, platformun şu anki geçici adresinden (`qr.158.220.106.172.nip.io`,
nip.io wildcard DNS — IP'ye bağlı, gerçek bir domain değil) kalıcı bir markalı
domaine taşınması için yapılması gerekenleri listeler. Kod tarafı zaten
domain-agnostic hazırlanmıştır (`lib/publicOrigin.ts`); bu checklist sadece
**ortam/altyapı** adımlarını kapsar, kod değişikliği gerektirmez.

## Kapsam dışı (bilerek ayrı tutulan)

- **White-label kısa link domaini** (`custom_domain` — kullanıcıların kendi
  QR linkleri için ayarladığı alan adı, `app/dashboard/settings/page.tsx`)
  bu migrasyondan tamamen ayrı ve bağımsızdır. Platformun kendi pazarlama/
  uygulama domaini değişse de kullanıcıların white-label domainleri etkilenmez.

## 1. DNS

- [ ] Yeni domain için A/AAAA (veya CNAME, sağlayıcıya göre) kaydı sunucu IP'sine
      yönlendirilir.
- [ ] nip.io adresi DNS açısından geçişin tamamlanmasına kadar paralel
      çalışabilir durumda bırakılır (rollback için).

## 2. SSL/TLS

- [ ] Yeni domain için sertifika alınır (Let's Encrypt/Certbot veya
      sağlayıcının otomatik sertifikası).
- [ ] nginx/reverse proxy `server_name` ve sertifika yolları güncellenir.
- [ ] **HSTS uyarısı**: `next.config.js` içindeki
      `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
      başlığı `preload` bayrağı içerir. Bu başlık host'a özeldir — eski nip.io
      adresinde tarayıcılarda iz bırakmaz, ama yeni domain canlıya alınır
      alınmaz HSTS preload listesine girme süreci (hstspreload.org) ayrıca ve
      bilerek başlatılmalı; aceleyle preload'a girmek, sertifika/DNS henüz
      stabil değilken domaine HTTPS-only kilitleyebilir.

## 3. Ortam değişkenleri

Aşağıdaki env değişkenleri yeni domaine güncellenmeli (`.env.local` / sunucu
ortamı):

- [ ] `NEXT_PUBLIC_APP_URL` ve `APP_URL` → yeni domain
      (`lib/publicOrigin.ts` ve `lib/billing/lemon-squeezy.ts` bunları okur;
      `APP_URL` boşsa Lemon Squeezy checkout/portal akışı `LemonConfigError`
      fırlatır — bilerek sessiz bir fallback yoktur, bu yüzden bu adım
      atlanırsa ödeme akışı tamamen kırılır, sadece eski domaine düşmez).
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase projesi değişmiyorsa dokunulmaz.

## 4. Üçüncü taraf entegrasyonlar

- [ ] **Lemon Squeezy**: Store ayarlarında ve checkout/portal redirect
      domain allowlist'inde yeni domain tanımlanmalı (yoksa checkout sonrası
      yönlendirme reddedilir).
- [ ] **Supabase Auth**: Dashboard → Authentication → URL Configuration'da
      "Site URL" ve "Redirect URLs" yeni domain ile güncellenmeli.
- [ ] GA4/GTM (varsa, kullanıcı bazlı entegrasyon) — platformun kendi
      domaini için ayrı bir aksiyon gerekmez, kullanıcı tarafı entegrasyonlar
      etkilenmez.

## 5. Doğrulama (geçiş sonrası)

- [ ] `app/sitemap.ts` / `app/robots.ts` çıktısının yeni domaini yansıttığını
      doğrula (`getPublicAppOrigin()` üzerinden otomatik gelir, ek aksiyon
      gerekmez — sadece env değişkeni doğru ayarlandıysa).
- [ ] Yeni domainden tam bir ödeme akışı (checkout → webhook → plan aktivasyonu)
      test edilir.
- [ ] Yeni domainden bir login + dashboard erişimi test edilir (Supabase
      redirect URL allowlist'i tutmazsa auth callback'i sessizce başarısız
      olabilir).
- [ ] Eski nip.io adresi belirli bir süre 301 ile yeni domaine yönlendirilir
      (mevcut basılı QR'lar/paylaşılmış linkler kırılmasın).
