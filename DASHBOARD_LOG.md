# Dashboard Log

## 2026-06-17

- CreateQRModal icine yeni `Multi URL` QR tipi eklendi; sablon, renk, profil, link ve iletisim bloklariyla mobil landing page olusturma akisi baglandi.
- Public tarafta yeni `app/links/[slug]` rotasi ve `/q/[slug] -> /links/[slug]` yonlendirmesi eklendi.
- Dashboard listeleme ve tip etiketleri yeni QR tipini taniyacak sekilde guncellendi.
- Dogrulama olarak `npx tsc --noEmit` ve `npm run build` basariyla calistirildi.

## 2026-06-16

- Mobil dashboard navigasyonu sabit alt menüye taşındı; Kampanyalar, Klasörler, Siparişler, Raporlar, Şablonlar ve Ayarlar mobilde görünür hale getirildi.
- Mobil dashboard üst istatistik alanı iki sütunlu ve daha kısa kartlarla kompakt hale getirildi.
- Mobil ana içerik alt menüyle çakışmasın diye güvenli alt boşluk eklendi.
- Ana sayfa QR Publish markasi, mevcut modul anlatimi, restoran/menu QR akisi ve footer bilgileriyle guncellendi.
- Masa QR ve QR link uretimi public origin standardina alindi; localhost payload riski ve beyaz 500 redirect hatasi icin q route sertlestirildi.
