# Dashboard Log

## 2026-06-18

- Landing sayfasina swipe mantikli QR tipleri vitrini eklendi; yeni `/components/ui/testimonial-cards.tsx` ve `/components/ui/demo.tsx` bileşenleri URL QR, Menu QR ve Multi URL/vCard akışlarını HekaQR tasarım diline uygun kartlarla tanıtıyor.

## 2026-06-17

- WiFi QR render akışı düzeltildi; WiFi tipinde QR görseline `/q/slug` linki yerine doğrudan `WIFI:` payload yazılıyor.
- Dashboard kart görünümündeki dekoratif mor QR rozeti kaldırıldı; gerçek QR önizlemesi ve seçim kutusu korundu.
- QR oluşturma/düzenleme Tasarım sekmesi tam QR tasarım editörüne genişletildi: renk, gradient, arka plan, modül/göz şekli, göz rengi, margin ve logo yükleme ayarları QR'a özel stil olarak kaydediliyor.
- Organizasyon tabloları canlı Supabase DB'ye uygulandı; QR kayıtlarına `organization_id` eklenerek ortak QR görünürlük/düzenleme modeli bağlandı.
- QR API'leri organizasyon üyelik rollerini tanır hale getirildi: viewer okuyabilir, editor düzenleyebilir/oluşturabilir, admin silebilir.

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
- Dashboard sol menüdeki Siparişler rozeti artık sipariş API'sinden yeni sipariş sayısını okuyup 10 saniyede bir yeniliyor.
- QR oluşturma/düzenleme formuna tüm QR tipleri için ayrı Tasarım sekmesi eklendi.
- Anasayfa hero sağ görseli daha ürün odaklı panel ve mobil menü önizlemesiyle yenilendi.
- QR okutma akışında scan log ve scan_count güncellemesi redirect öncesinde beklenir hale getirildi; scan_count artık scan_logs toplamıyla senkronlanıyor.
- Sipariş API'si kullanıcı bazlı izole edildi; owner/admin user dashboard endpoint'inden başka kullanıcı siparişlerini göremiyor.
- Menü QR müşteri sipariş takibi masa bazlı localStorage anahtarına taşındı; masa 4 ve masa 6 siparişleri telefonda birbirine karışmıyor.
- Siparişler ekranı varsayılan olarak bugünü gösteriyor; tarih aralığı, durum filtresi, 20/50/100 sayfalama ve aralık bazlı rapor özeti eklendi.
- Ülke bazlı rapor haritası tıklanabilir marker katmanı, seçili ülke kartı ve ülke kodu koordinatlarıyla yenilendi.
