# Admin Panel Log

## 2026-06-16 — Dünya Üye Haritası + CSV export

- `app/api/admin/users/geo/route.ts`: yeni endpoint. `scan_logs.country` (ISO-2 kod, `x-vercel-ip-country` header'ından geliyor) ve `qr_codes.user_id` join'i ile ülke bazında benzersiz üye sayısı + tarama sayısı + örnek üye listesi döner. `requireAdminOrOwner` ile korunuyor.
  - Not: Üyenin kendi ülkesi hiçbir yerde tutulmuyor (signup'ta IP/coğrafya kaydı yok). Bu yüzden harita "üyenin QR'larına hangi ülkeden erişildiği" verisini gösteriyor — yaklaşık ama mevcut şemadaki en doğru veri.
- `components/dashboard/WorldMemberGlobe.tsx`: `@react-three/fiber` + `@react-three/drei` ile dönen 3D globe. Lat/lng → 3D nokta dönüşümü, ülke işaretçileri üye sayısına göre boyutlanıyor, tıklayınca seçili ülke parent'a bildiriliyor. `next/dynamic` ile `ssr: false` yüklenmesi gerekiyor (canvas/document SSR'da patlar).
- `app/admin/users/page.tsx`: Globe + sağda detay paneli (seçili ülke: üye/tarama sayısı + üye listesi) eklendi. Ayrıca CSV export butonu eklendi (filtrelenmiş kullanıcı listesini indirir).
- Playwright ile geçici test admin hesabı + sahte QR/scan_logs oluşturup gerçek tarayıcıda doğrulandı (globe render oluyor, tıklama çalışıyor, konsol hatası yok), sonra hepsi silindi.

### Sonraki adımlar (yapılmadı, kapsam dışı bırakıldı)
- Toplu kullanıcı işlemleri (bulk activate/deactivate/delete) — checkbox seçim UI'ı gerekiyor.
- Audit log sayfası — `audit_logs` tablosu `lib/auth/authOptions.ts` signin event'inde zaten yazılıyor ama admin panelde görüntüleme/arama arayüzü yok.
- `knip` çıkışındaki kullanılmayan `lib/services/*`, `lib/middleware/*` dosyaları admin kapsamı dışında, dokunulmadı.
