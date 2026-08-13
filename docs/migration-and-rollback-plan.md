# Migration ve rollback planı

1. Staging'de `20260713190000_qr_modes_and_entitlements.sql` uygula.
2. Mevcut QR sayısı, `/q/*` redirectleri ve render çıktısını doğrula.
3. Uygulama statik oluşturma ve atomik entitlement RPC'leriyle birlikte yayınlansın.
4. Yeni kayıtlar için `qr_mode` gözlemlensin; mevcut kayıtları değiştirme.

Rollback: yeni kodu geri al; eklenen kolonlar veri kaybı olmadan kalabilir. Kolon/drop veya mevcut `short_slug` alanı üzerinde destructive işlem yapma. Override tablosu yalnız yeni yetkileri etkiler.
