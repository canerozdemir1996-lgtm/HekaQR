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

- `supabase/migrations/20260622103000_backup_runs.sql`: `backup_runs` tablosu (kind: db/storage/restore_test, status, boyut, detay). RLS açık ama politika yok — sadece servis anahtarı yazar/okur, tarayıcı erişimi kapalı. Supabase SQL Editor'e manuel uygulandı (2026-06-22).
- `.github/workflows/backup-db.yml`, `backup-storage.yml`, `restore-test.yml`: GitHub Actions cron job'ları. DB dump → `age` ile şifrele → Cloudflare R2'ye yükle (günlük 02:00 UTC). Storage bucket → `rclone` ile R2'ye senkronize et (günlük 02:30 UTC). Aylık restore drill: en son DB yedeğini indir, throwaway Postgres 17'ye geri yükle, `qr_codes` satır sayısını doğrula (0 satırsa job fail).
- `app/api/internal/backups/report/route.ts`: workflow'ların `if: always()` ile sonuç bildirdiği rota. Paylaşılan token (`X-Backup-Token` header, `BACKUP_REPORT_TOKEN` env) ile doğrulanır — kullanıcı oturumu yok, dışarıdan CI tetikler.
- `app/api/admin/backups/route.ts` + `app/admin/backups/page.tsx`: owner-only (admin değil) panel. Her kind için son başarılı yedek zamanı + "GECİKMİŞ" rozet (db/storage 30 saat, restore_test 35 gün eşik) + son 200 çalışmanın geçmişi.
- `app/admin/AdminShell.tsx`: nav'a "Yedekler" eklendi, `ownerOnly` flag'i ile filtrelenip sadece owner rolüne görünüyor.
- Depolama hedefi Backblaze B2'den Cloudflare R2'ye değiştirildi (10GB ücretsiz + sıfır egress ücreti).
- 12 GitHub secret tanımlandı (`SUPABASE_DB_URL` — pooler/IPv4 bağlantısı, `AGE_PUBLIC_KEY`/`AGE_PRIVATE_KEY`, `R2_*` ×4, `SUPABASE_S3_*` ×3, `APP_URL`, `BACKUP_REPORT_TOKEN`) ve `.env.local`'a `BACKUP_REPORT_TOKEN` eklendi.

### 2026-06-22 — workflow_dispatch ile uçtan uca doğrulandı, 5 prod-only bug bulundu/düzeltildi
İlk gerçek çalıştırmalar art arda başarısız oldu, her biri ayrı bir CI-ortamına-özel sorunu ortaya çıkardı:
1. Ubuntu 24.04 runner'da `awscli` apt paketi yok → resmi AWS CLI v2 zip kurulumu.
2. Rapor POST'u nginx'in http→https 301'ine çarpıyordu (`APP_URL` http'ydi, curl `-L` yoktu) → `APP_URL` https'e çevrildi + `curl -sfL`.
3. AWS CLI runner image'ında zaten kurulu geliyor → kurulum `--update` bayrağıyla idempotent yapıldı.
4. `pg_dump`, `db.<ref>.supabase.co` IPv6 adresine bağlanamadı (GitHub runner'lar IPv6 desteklemiyor) → `SUPABASE_DB_URL` Supabase'in pooler (IPv4) bağlantısına çevrildi.
5. `pg_dump` (apt'tan gelen 16.14) ile Supabase sunucusu (17.6) versiyon uyuşmazlığı → PGDG resmi deposundan `postgresql-client-17` kuruldu; `restore-test`'teki throwaway servis 15'ten 17'ye yükseltildi; dump'a `--no-owner --no-acl` eklendi (Supabase'e özel rollere/GRANT'lere bağımlılığı kaldırır, taşınabilirlik için de doğru); vanilla Postgres'te hiç bulunmayan extension'lara (`pg_graphql` vb.) ait kaçınılmaz `CREATE EXTENSION` hatalarının job'ı düşürmesi engellendi (asıl sinyal ayrı satır sayısı kontrolü).

Sonuç: 3 workflow da `workflow_dispatch` ile elle tetiklenip gerçek başarı ile doğrulandı (`backup-db`: 540KB dump, `backup-storage`: 1.4MB sync, `restore-test`: "qr_codes satır sayısı: 11").

### Sonraki adımlar (yapılmadı, kapsam dışı bırakıldı)
- Yok — sistem tam çalışır durumda. Cron zamanlamasına göre kendiliğinden çalışacak (günlük 02:00/02:30 UTC, ayın 1'i 04:00 UTC).
- `age` anahtar çifti henüz üretilmedi (`age-keygen`) — `AGE_PUBLIC_KEY`/`AGE_PRIVATE_KEY` secrets'ları için gerekli.
