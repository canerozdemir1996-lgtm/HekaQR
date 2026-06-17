# Dashboard Log

## 2026-06-17

- Public site icin yeni `/pricing` ve `/pricing/enterprise` akisi eklendi; monthly-yearly toggle, TR-EN lokalizasyonu, TL-USD fiyat gostergesi ve enterprise slider hesaplayici hazirlandi.
- Landing sayfasina pricing girisleri eklendi ve pricing icerikleri ortak `lib/pricing.ts` veri modeli altinda toplandi.
- Enterprise teklif akisi simdilik `mailto:support@heka-qr.com` taslagi uretir sekilde kuruldu.

## 2026-06-17

- CreateQRModal icine yeni `Multi URL` QR tipi eklendi; sablon, renk, profil, link ve iletisim bloklariyla mobil landing page olusturma akisi baglandi.
- Public tarafta yeni `app/links/[slug]` rotasi ve `/q/[slug] -> /links/[slug]` yonlendirmesi eklendi.
- Dashboard listeleme ve tip etiketleri yeni QR tipini taniyacak sekilde guncellendi.
- Dogrulama olarak `npx tsc --noEmit` ve `npm run build` basariyla calistirildi.

## 2026-06-16

- Mobil dashboard navigasyonu sabit alt menüye taşındı; Kampanyalar, Klasörler, Siparişler, Raporlar, Şablonlar ve Ayarlar mobilde görünür hale getirildi.
- Mobil dashboard üst istatistik alanı iki sütunlu ve daha kısa kartlarla kompakt hale getirildi.
- Mobil ana içerik alt menüyle çakışmasın diye güvenli alt boşluk eklendi.
- Ana sayfa QR Publish markası, mevcut modül anlatımı, restoran/menü QR akışı ve footer bilgileriyle güncellendi.
- Masa QR ve QR link üretimi public origin standardına alındı; localhost payload riski ve beyaz 500 redirect hatası için q route sertleştirildi.

## 2026-06-17

- Dashboard liste görünümüne QR oluşturulma ve güncellenme tarihleri eklendi.
- Toplu şablon değiştirme öncesinde şablon listesi otomatik yenilenir hale getirildi; QR görsel cache anahtarı güncelleme tarihiyle tazeleniyor.
- Sipariş menüsü için yeni sipariş rozeti eklendi; yeni sipariş varsa yan menü ve mobil menü kırmızı uyarı gösteriyor.
- Menü QR müşteri akışına Siparişlerim paneli eklendi; müşteri sipariş durumunu telefondan takip edebiliyor.
- Sipariş API'sine public sipariş takip endpoint'i eklendi, sipariş durum güncellemelerinde updatedAt tutuluyor.
- QR oluşturma ekranında client taraflı public-origin zorlaması geri alındı; QR payload origin düzeltmesi server render tarafında tutuldu.
- Kullanıcı dashboard'una mevcut paket, faturalama periyodu, abonelik durumu ve bitiş tarihi görünümü eklendi.
- Sipariş menüsündeki yeni sipariş bildirimi sayılı rozet formatına geçirildi; sadece yeni sipariş sayısını gösteriyor.
- Siparişler ekranına ayrı Sipariş Raporları bölümü eklendi; toplam/yeni/hazırlanan/tamamlanan sipariş ve ortalama sepet gösteriliyor.
