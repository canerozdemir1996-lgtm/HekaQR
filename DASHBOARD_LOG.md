# Dashboard Log

## 2026-06-18

- Hero ikinci turda rafine edildi; tekrar logo kaldirildi, dashboard ve telefon kompozisyonu buyutuldu, orbit chip'lerine alt metin ve daha guclu glass kart hissi verildi, alt fayda seridi ise daha dengeli hale getirildi.
- Landing hero referans tasarıma yaklaştırıldı; yeni scroll tabanlı motion sahnesinde dashboard mockup, mouse ile hafif açılı dönen telefon, yörüngede yaşayan QR tip kartları ve path üzerinde sürekli dolaşan ışık noktaları eklendi.
- Dashboard Ayarlar sayfasina `Billing Health` tani paneli eklendi; yeni `/api/billing/health` endpoint'i Lemon store, variant, mode eslesmesi ve webhook hazirligini owner/admin icin guvenli sekilde raporluyor.
- Pricing checkout akisi odeme env'leri eksikken patlamak yerine once `/api/billing/status` ile readiness kontrolu yapar hale geldi; hazir degilse kullanici teklif akisina yonlendiriliyor.
- `/pricing/enterprise` sayfasi kurumsal paket hesaplayiciya donusturuldu; slider durumlari URL ile senkronize, aylik-yillik toggle aktif ve teklif formu artik server-side quote endpoint'ine kayit aciyor.
- `enterprise_quotes` migration'i, yeni enterprise pricing servisi, rate limit / honeypot korumasi ve feature-flag tabanli Lemon enterprise checkout akisi eklendi.
- Lemon checkout konfigrasyon kontrolu parcalandi; artik webhook secret eksik olsa bile checkout gereksiz yere bloklanmiyor, yalnizca ilgili endpoint kendi zorunlu env'lerini istiyor.
- Lemon Squeezy tabanli guvenli SaaS abonelik akisi eklendi; checkout artik server-side olusturuluyor, kart alani uygulamadan kaldirildi ve webhook ile `subscriptions` / `user_settings` senkronu baglandi.
- Dashboard odeme donusu `payment=success` parametresinde webhook bekleme ve aktiflesme durumunu gosterir hale geldi; aktif paketler icin `Aboneligi Yonet` akisi da eklendi.
- Landing sayfasina swipe mantikli QR tipleri vitrini eklendi; yeni `/components/ui/testimonial-cards.tsx` ve `/components/ui/demo.tsx` bilesenleri URL QR, Menu QR ve Multi URL/vCard akislarini HekaQR tasarim diline uygun kartlarla tanitiyor.
- QR tipleri bolumundeki sag kolon kutu hissi azaltildi; kart sahnesi daha genis, tasma hissi olan ve glow arka planli bir sunuma gecirildi.
- Pricing sayfasina kart onizlemeli odeme deneyimi eklendi; yeni `/components/ui/payment-preview.tsx` ve `/components/ui/payment-card-utils.ts` ile plan secimi sonrasi checkout akisi site tasarimina uyarlanmis halde sergileniyor.
- Dashboard tarafina gorunur `Paketini Yukselt` baglantilari eklendi; pricing kartlari da secim sonrasi dogrudan `/pricing/checkout` odeme ekranina yonlendirecek sekilde baglandi.
- Checkout ekraninda paket degistirme ve aylik/yillik toggle akisi eklendi; kullanici odeme adimindayken Starter/Pro arasinda gecis yapip fiyat farkini aninda gorebiliyor.

## 2026-06-17

- WiFi QR render akisi duzeltildi; WiFi tipinde QR gorseline `/q/slug` linki yerine dogrudan `WIFI:` payload yaziliyor.
- Dashboard kart gorunumundeki dekoratif mor QR rozeti kaldirildi; gercek QR onizlemesi ve secim kutusu korundu.
- QR olusturma/duzenleme Tasarim sekmesi tam QR tasarim editorune genisletildi: renk, gradient, arka plan, modul/goz sekli, goz rengi, margin ve logo yukleme ayarlari QR'a ozel stil olarak kaydediliyor.
- Organizasyon tablolari canli Supabase DB'ye uygulandi; QR kayitlarina `organization_id` eklenerek ortak QR gorunurluk/duzenleme modeli baglandi.
- QR API'leri organizasyon uyelik rollerini tanir hale getirildi: viewer okuyabilir, editor duzenleyebilir/olusturabilir, admin silebilir.
- Dashboard sol menüsünde yüksekliği taşan paket/profil alanı için sidebar scroll düzeni düzeltildi.
- Şifremi unuttum akışı aktif edildi; kullanıcı e-posta ile Supabase recovery linki alabiliyor, linkten gelince yeni şifre belirleyebiliyor.
- Siparişler ekranına hızlı tarih aralığı butonları ve daha detaylı operasyon rapor kartları eklendi.
- Yeni Geri Bildirim QR tipi eklendi; lokasyon bazlı şikayet/öneri/istek formu, public mobil form ve dashboard rapor ekranı oluşturuldu.
- Geri bildirimler için Supabase `feedback_submissions` tablosu, status yönetimi, öncelik/kategori filtresi ve lokasyon raporları eklendi.
- Ayarlar ekranı fatura, ödeme yöntemi notu, bildirim e-postası ve güvenlik iletişim alanlarıyla genişletildi.

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

- Mobil dashboard navigasyonu sabit alt menuye tasindi; Kampanyalar, Klasorler, Siparisler, Raporlar, Sablonlar ve Ayarlar mobilde gorunur hale getirildi.
- Mobil dashboard ust istatistik alani iki sutunlu ve daha kisa kartlarla kompakt hale getirildi.
- Mobil ana icerik alt menuyle cakismasin diye guvenli alt bosluk eklendi.
- Ana sayfa QR Publish markasi, mevcut modul anlatimi, restoran/menu QR akisi ve footer bilgileriyle guncellendi.
- Masa QR ve QR link uretimi public origin standardina alindi; localhost payload riski ve beyaz 500 redirect hatasi icin q route sertlestirildi.

## 2026-06-17

- Dashboard liste gorunumune QR olusturulma ve guncellenme tarihleri eklendi.
- Toplu sablon degistirme oncesinde sablon listesi otomatik yenilenir hale getirildi; QR gorsel cache anahtari guncelleme tarihiyle tazeleniyor.
- Siparis menusU icin yeni siparis rozeti eklendi; yeni siparis varsa yan menu ve mobil menu kirmizi uyari gosteriyor.
- Menu QR musteri akisina Siparislerim paneli eklendi; musteri siparis durumunu telefondan takip edebiliyor.
- Siparis API'sine public siparis takip endpoint'i eklendi, siparis durum guncellemelerinde updatedAt tutuluyor.
- QR olusturma ekraninda client tarafli public-origin zorlamasi geri alindi; QR payload origin duzeltmesi server render tarafinda tutuldu.
- Kullanici dashboard'una mevcut paket, faturalama periyodu, abonelik durumu ve bitis tarihi gorunumu eklendi.
- Siparis menusundeki yeni siparis bildirimi sayili rozet formatina gecirildi; sadece yeni siparis sayisini gosteriyor.
- Siparisler ekranina ayri Siparis Raporlari bolumu eklendi; toplam/yeni/hazirlanan/tamamlanan siparis ve ortalama sepet gosteriliyor.
- Dashboard sol menudeki Siparisler rozeti artik siparis API'sinden yeni siparis sayisini okuyup 10 saniyede bir yeniliyor.
- QR olusturma/duzenleme formuna tum QR tipleri icin ayri Tasarim sekmesi eklendi.
- Anasayfa hero sag gorseli daha urun odakli panel ve mobil menu onizlemesiyle yenilendi.
- QR okutma akisinda scan log ve scan_count guncellemesi redirect oncesinde beklenir hale getirildi; scan_count artik scan_logs toplamiyle senkronlaniyor.
- Siparis API'si kullanici bazli izole edildi; owner/admin user dashboard endpoint'inden baska kullanici siparislerini gore miyor.
- Menu QR musteri siparis takibi masa bazli localStorage anahtarina tasindi; masa 4 ve masa 6 siparisleri telefonda birbirine karismiyor.
- Siparisler ekranI varsayilan olarak bugunu gosteriyor; tarih araligi, durum filtresi, 20/50/100 sayfalama ve aralik bazli rapor ozeti eklendi.
- Ulke bazli rapor haritasi tiklanabilir marker katmani, secili ulke karti ve ulke kodu koordinatlariyla yenilendi.
