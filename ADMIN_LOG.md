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

## 2026-06-22 — Sistem yedekleri (DB + Storage + restore drill)

- `supabase/migrations/20260622103000_backup_runs.sql`: `backup_runs` tablosu (kind: db/storage/restore_test, status, boyut, detay). RLS açık ama politika yok — sadece servis anahtarı yazar/okur, tarayıcı erişimi kapalı. **Uygulanmadı**, `PENDING_MIGRATIONS.txt`'e eklendi (CLI `db push` rol izni hatası veriyor — Supabase SQL Editor'e manuel yapıştırılmalı).
- `.github/workflows/backup-db.yml`, `backup-storage.yml`, `restore-test.yml`: GitHub Actions cron job'ları. DB dump → `age` ile şifrele → Backblaze B2'ye yükle (günlük 02:00 UTC). Storage bucket → `rclone` ile B2'ye senkronize et (günlük 02:30 UTC). Aylık restore drill: en son DB yedeğini indir, throwaway Postgres'e geri yükle, `qr_codes` satır sayısını doğrula (0 satırsa job fail).
- `app/api/internal/backups/report/route.ts`: workflow'ların `if: always()` ile sonuç bildirdiği rota. Paylaşılan token (`X-Backup-Token` header, `BACKUP_REPORT_TOKEN` env) ile doğrulanır — kullanıcı oturumu yok, dışarıdan CI tetikler.
- `app/api/admin/backups/route.ts` + `app/admin/backups/page.tsx`: owner-only (admin değil) panel. Her kind için son başarılı yedek zamanı + "GECİKMİŞ" rozet (db/storage 30 saat, restore_test 35 gün eşik) + son 200 çalışmanın geçmişi.
- `app/admin/AdminShell.tsx`: nav'a "Yedekler" eklendi, `ownerOnly` flag'i ile filtrelenip sadece owner rolüne görünüyor.

### Sonraki adımlar (yapılmadı, kapsam dışı bırakıldı)
- Migration Supabase SQL Editor'e manuel yapıştırılmalı (yukarıda not edildi).
- GitHub repo secrets tanımlanmalı: `SUPABASE_DB_URL`, `AGE_PUBLIC_KEY`, `AGE_PRIVATE_KEY`, `B2_KEY_ID`, `B2_APP_KEY`, `B2_ENDPOINT`, `B2_BUCKET`, `SUPABASE_S3_ACCESS_KEY`, `SUPABASE_S3_SECRET_KEY`, `SUPABASE_S3_ENDPOINT`, `APP_URL`, `BACKUP_REPORT_TOKEN` (son ikisi hem GitHub'da hem prod `.env`'de aynı olmalı).
- Lokal `.env.local`'a `BACKUP_REPORT_TOKEN` eklenmedi — eklenmeden `/admin/backups` boş kalır (503/401 vermez ama hiç veri gelmez).
- `age` anahtar çifti henüz üretilmedi (`age-keygen`) — `AGE_PUBLIC_KEY`/`AGE_PRIVATE_KEY` secrets'ları için gerekli.
