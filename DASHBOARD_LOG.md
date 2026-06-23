# Dashboard Log

## 2026-06-22

- Booking ve feedback API'leri eski/eksik Supabase şemalarına karşı geriye dönük uyumlu hale getirildi; eksik kolonlarda modern sorgu yerine legacy alanlara düşülüyor ve kullanıcı artık anlamsız genel hata yerine daha doğru mesaj görüyor.
- Public booking ve feedback sayfalarına "Bu QR henüz yapılandırılmamış" empty state'i eklendi; eksik tarih/saat veya form içeriğinde bozuk ekran yerine yönlendirici durum gösteriliyor.
- Şablon koleksiyon akışı sertleştirildi; yeni koleksiyon kaydından sonra liste server'dan tazeleniyor, kompakt koleksiyon filtre chip'leri eklendi ve templates sol paneli daha kontrollü hale getirildi.
- Yeni idempotent Supabase migration `20260622174500_dashboard_schema_guard.sql` ile `qr_template_collections`, `profiles.username/last_login_at`, `booking_submissions`, `feedback_submissions` ve ilgili policy/grant eksikleri güvenli şekilde tamamlanıyor.

- QR olusturma ve duzenleme akisi sadelestirildi: Tasarim sekmesi kaldirildi, QR Studyosu her QR turunde dogrudan ve kalici calisma alani olarak gosteriliyor.
- Ortak hazir QR tasarim koleksiyonu eklendi; ayni presetler hem Sablonlar ekraninda hem QR olusturma ekraninda kullaniliyor. Kullanici sablonlari `Tasarımlarım` alaninda ozel ve kaydirilabilir tutuluyor.
- Sablon sayfasi sabit masaustu yuksekligi, kompakt koleksiyon kartlari ve mobilde dikey responsive yerlesimle yenilendi; sablon sayisi onizleme/editor yuksekligini artik buyutmuyor.
- `Yeni Kampanya` komutlari `Yeni QR Olustur` olarak guncellendi. Landing, oturum acik kullaniciya giris/kayit CTA'si yerine profil ve panel baglantisi gosteriyor.
- Dogrulama: `npx.cmd tsc --noEmit`, 33/33 birim test ve production build basarili. Landing 1280px ve 390px viewportlarda yatay tasma ve console error olmadan kontrol edildi.

- Rezervasyon ve geri bildirim ekranlarındaki genel veri yükleme hatası, OAuth kimliklerinin UUID kolonlarına doğrudan gönderilmesini engelleyen merkezi Supabase kullanıcı çözümlemesiyle düzeltildi; iki endpoint canlı authentication smoke testinde `200` döndü.
- Üyelik akışı eklendi: `/signup` e-posta/şifre, Google ve GitHub kayıt seçeneklerini sunuyor; e-posta doğrulama ve mevcut giriş/reset akışlarıyla bağlı çalışıyor. Landing CTA ve login ekranı kayıt sayfasına bağlandı.
- Yeni `/dashboard/profile` hesap merkezi eklendi; hesap/e-posta durumu, paket ve limitler, QR kullanımı, fatura bilgileri, abonelik durumu, ödeme yöntemi marka/son dört hane ve doğrulanmış ödeme geçmişi tek responsive ekranda gösteriliyor.
- Canlı Supabase şeması plan kolonları, `subscriptions`, `billing_payment_history`, `billing_webhook_events`, QR `deleted_at` ve stil sahipliği alanlarıyla tamamlandı; RLS ve kullanıcı bazlı şablon izolasyonu uygulandı.
- Şablon güncellendiğinde bağlı QR kayıtlarının render sürümü otomatik yenileniyor; QR oluşturma/düzenleme API'leri yalnızca kullanıcının kendi şablonunu kabul ediyor.
- Billing saf durum fonksiyonları DB import zincirinden ayrıldı; test runner açık handle sorunu giderildi.
- Doğrulama: `npx.cmd tsc --noEmit`, 33/33 birim test ve `npm.cmd run build` başarılı. Signup/login tarayıcı kontrollerinde içerik, yönlendirme, yatay taşma ve console error kontrolleri geçti.

## 2026-06-19

- Supabase `booking_submissions` ve `feedback_submissions` tabloları canlı DB'de yeniden sertleştirildi; eksik alias kolonları, `completed_at`, `feedback_type`, yeni `in_progress` status modeli, RLS policy'leri ve PostgREST schema reload migration'ı eklendi.
- Booking API eski ve yeni payload alanlarını birlikte kabul eder hale getirildi; rezervasyon süreci `new / in_progress / completed / cancelled` durumlarına taşındı ve tamamlanma zaman damgası güncelleniyor.
- Billing checkout route'u provider çağrısından önce konfigürasyon readiness kontrolü yapıyor; eksik Lemon Squeezy ayarında secret sızdırmadan `billing_not_configured` cevabı ve teklif akışı fallback'i korunuyor.
- Landing hero responsive revize edildi; alt güven kartları hero kolonundan çıkarılıp tam genişlik responsive grid'e taşındı, başlık clamp ile küçültüldü ve feature/telefon mockup taşmaları azaltıldı.
- Doğrulama: canlı Supabase kolon/constraint kontrolü yapıldı, `npx.cmd tsc --noEmit` ve `npm.cmd run build` başarılı. Bu Windows oturumunda dev server arka planda kalıcı başlamadığı için otomatik viewport screenshot testi tamamlanamadı.

- Landing hero alanı QR Publish odağında yeniden tasarlandı; mevcut logo korunarak sol içerik, CTA'lar, özellik balonları, dashboard mockup, mobil menü önizlemesi ve güven unsurları tek temiz/premium akışta toplandı.
- Hero animasyonları `prefers-reduced-motion` desteğiyle hafifletildi; mockup HTML/CSS ile kuruldu ve ağır görsel/kütüphane eklenmedi.
- Doğrulama: `npm.cmd run build` başarılı, build sonrası `npx.cmd tsc --noEmit` başarılı. Türkçe metinlerin UTF-8 kaynakta doğru kaldığı Node ile kontrol edildi.

- Kullanici tarafinda eklenen `Logo.webp` ve `Icon.webp` brand asset'leri aktif kullanima alindi; logo component'i tum public ve dashboard girislerinde yeni logo dosyasina baglandi, metadata site icon'lari da yeni webp icon ile degistirildi.
- Landing hero yeniden dengelendi; checkerboard gorunen eski logo yerine temiz SVG brand dosyalari eklendi, hero sahnesinde dashboard-telefon hiyerarsisi toparlandi ve orbit QR tipleri daha dogal bir kompozisyona cekildi.

- Dashboard ana sayfadaki klasör şeridi overlay sağ/sol oklarla gerçek slider davranışına geçirildi; oklar artık mobil ve desktop görünümde sürekli erişilebilir.
- QR oluşturma/düzenleme içindeki Tasarım sekmesi, Şablonlar ekranındaki QR Stüdyosu düzenine yaklaştırıldı: koleksiyon kartları, panel sekmeleri, hazır tema/gradient presetleri, nokta/göz/logo/gelişmiş kontrolleri ve canlı önizleme tek akışa alındı.
- Doğrulama olarak `npx tsc --noEmit` ve `npm run build` başarıyla çalıştırıldı.

## 2026-06-19

- Dashboard ana sayfadaki klasör şeridi sağ/sol oklarla kaydırılabilir hale getirildi; çok klasörlü hesaplarda yatay kullanım iyileştirildi.
- Sol menü altındaki tekrar eden paket kartı kaldırıldı; paket bilgisi ana dashboard kartında ve üst aksiyonlarda korunuyor.
- Geri Bildirim QR public formu hastane/tesis kullanımına daha uygun hale getirildi: sabit lokasyon vurgusu, hızlı tür seçimi, konu seçimi, öncelik seçimi ve daha temiz mobil form akışı eklendi.
- Dashboard ana istatistik kartındaki 3D canvas kaldırılıp hafif CSS arka planla değiştirildi; production build'de `/dashboard` route boyutu 25.1 kB'den 24.2 kB'e indi.
- Doğrulama olarak `npx tsc --noEmit`, `npm run build` ve canlı HTTP route smoke testleri çalıştırıldı.

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

## 2026-06-19

- Rakip QR platformlarındaki booking, dokuman landing ve app store yonlendirme mantigi incelendi; ilk entegrasyon fazi projeye eklendi.
- Yeni QR tipleri eklendi: Rezervasyon/Randevu (`booking`), Google Docs/Dosya (`doc`) ve App Store/Google Play (`appstore`).
- QR olusturma ekraninda bu yeni tipler icin icerik alanlari, validasyon, target URL ve `dynamic_content.kind` kaydi baglandi.
- Public rotalar eklendi: `/booking/[slug]`, `/doc/[slug]`, `/appstore/[slug]`; `/q/[slug]` bu dinamik tipleri ilgili landing/redirect sayfalarina yonlendiriyor.
- Rezervasyon kayitlari icin `/api/v1/bookings` endpoint'i ve `/dashboard/bookings` panel ekrani eklendi.
- Supabase `booking_submissions` tablosu, RLS policy'leri ve private insert helper fonksiyonu migration ile olusturuldu; canli DB'ye uygulandi ve dogrulandi.
- Dogrulama: `npx.cmd tsc --noEmit` ve `npm.cmd run build` basariyla calistirildi.

## 2026-06-19

- Geri Bildirim QR akisi yeniden duzenlendi: `/q/{slug}` feedback QR'lari `/temiz/qr/{qrId}` sayfasina yonlendiriyor ve `deviceId` bilgisi korunuyor.
- Public "Sikayet / Oneri / Istek" formu panelden yonetilen baslik, aciklama, konu, etiket, zorunlu alan, basari mesaji ve gizlilik metniyle dinamik hale getirildi.
- Dashboard "Geri Bildirimler" sayfasi liste + detay + surec yonetimi seklinde yenilendi; durum degistirme, admin notu, arama, etiket filtresi, tarih ve sayfalama eklendi.
- Supabase `feedback_submissions` semasi yeni `type`, `subject`, `tags`, `device_id`, `admin_note`, `completed_at` alanlariyla guncellendi; status modeli `new/in_progress/completed/cancelled` olarak tasindi.
- Feedback insert RLS'i private schema helper fonksiyonuyla guvenli hale getirildi ve PostgREST schema cache yenilemesi migration'a eklendi.
- Dashboard QR aramasi etiket/lokasyon/form bilgilerini kapsayacak sekilde genisletildi; QR kart ve liste basliklari 2 satira kadar okunabilir hale getirildi.
- Dogrulama: `npx tsc --noEmit` ve `npm run build` basariyla calistirildi.

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

## 2026-06-23

- Toplu şablon uygulama işlemi seçilen şablonun tasarım snapshot'ını `qr_design` alanına da yazar hale getirildi.
- Şablon stüdyosundaki hazır tasarımlar responsive 2/3/6 kolonlu kompakt galeriye taşındı; kişisel şablon listesi sayfalandı.
- Rezervasyon ve geri bildirim API hata mesajları loading/empty/database durumlarını ayırt edecek şekilde modül bazlı hale getirildi.
- Supabase üzerinde private şablon izolasyonu iki ayrı kullanıcı bağlamında doğrulandı; system/public şablon görünürlüğü çalışıyor.
- Rezervasyon slotlarının kullanıcı bazlı sorguları için eksik yabancı anahtar indeksi eklendi.

- Dashboard ve admin mesaj ekranlarinda guvenli HTML render katmani eklendi; buyuk gorseller kart icinde tasma yapmadan gorunuyor.
- Dashboard header rozeti ve kullanici alani icin yanlis plan flasini azaltan cache/skeleton akisi eklendi; admin analytics/messages linklerinde prefetch kapatildi.
- Dashboard QR silme ve klasor silme akislari onay dialogu + loading state ile sertlestirildi; mobil FAB ve klasor filtre seridi alt nav ile uyumlu hale getirildi.
- QR olusturma formunda hata mesajlari inputlar duzeldikce temizleniyor; ilk hatali alana otomatik scroll eklendi. QR studio sekmeleri yatay kaydirma ile responsive hale getirildi.
- Admin tarama trendi grafiginde Y ekseni padding/tick hesaplamasi duzeltildi; siparis para birimi TRY formatina alindi ve raporlar sayfasina bos durum mesaji eklendi.
