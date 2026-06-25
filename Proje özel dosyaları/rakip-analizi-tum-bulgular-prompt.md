GÖREV: Aşağıda, HekaQR (canlı isim: "QR Publish", hekaqr.com / test ortamı qr.158.220.106.172.nip.io) için yapılan canlı site incelemesi (kendi ürün, oturum açık dashboard, admin paneli) ve 6 rakibin (QRCodeChimp, QRCodeCreator, QRFY, QR Code Monkey, QR Planet, Uniqode) Chrome üzerinden canlı incelenmesi sonucunda tespit edilen TÜM hatalar, eksikler ve geliştirme fırsatları tek bir listede toplanmıştır. Bu listedeki her maddeyi değerlendir, ilgili kod/dosyaları bul, ve uygulanabilir olanları uygula; uygulama gerektirmeyen (fiyatlandırma/pazarlama kararı gibi) maddelerde kullanıcıdan onay iste.

## A) CANLIDA TESPİT EDİLEN HATALAR / RİSKLER

1. `/privacy-policy` sayfasında unutulmuş placeholder/şablon metin canlıda görünüyor: "This template text was prepared to provide basic disclosure required when opening the platform to MVP launch stage. Final commercial details should be clarified with legal review before publication." Bu metni kaldırıp gerçek, KVKK/GDPR uyumlu bir gizlilik politikası metniyle değiştir.

2. `/dashboard/settings` sayfasındaki "Billing Health" paneli normal müşteriye Lemon Squeezy store adı, webhook secret durumu, plan ID konfigürasyon kontrolleri ("Configured/Reachable/Subscription/Mode Match/Store Match" — Starter/Pro Monthly/Yearly) gibi iç mühendislik teşhis bilgilerini doğrudan gösteriyor. Bu paneli müşteri ayarlar sayfasından kaldır, admin paneline taşı.

3. `/login` sayfası SSR yapmıyor, sadece "Yükleniyor..." client-render shell döndürüyor; SEO ve sosyal paylaşım önizlemeleri için zararlı. SSR fallback eklenmeli.

4. `/cookie-policy` ve `/terms` sayfalarında "son güncelleme" tarihi olarak "23.06.2026" gibi muhtemelen hardcoded bir tarih görünüyor; dinamik olmalı, kontrol edilmeli.

5. Anasayfadaki "10.000+ kullanıcı / 1M+ tarama" istatistik iddiası ve "Piksel Erhan" adlı müşteri yorumu, ürünün gerçek (MVP/erken aşama) kullanıcı tabanına göre abartılı/placeholder görünüyor; gerçek sayılarla veya kaldırılarak güncellenmeli.

6. `/dashboard/organizations` sayfası incelemem sırasında liste içeriğini yüklemedi (boş geldi) — gerçek bir yükleme/render hatası olup olmadığı kontrol edilmeli.

7. `/dashboard/qrcodes`, `/dashboard/studio` gibi bazı URL'ler 404 dönüyor; bu kasıtlı bir routing yapısıysa sorun değil, ama iç linkler/dokümantasyon bu adreslere referans veriyorsa düzeltilmeli.

8. `/dashboard/settings` içindeki Zapier / Make / Google Sheets entegrasyon etiketlerinin gerçekten çalışan bir OAuth/webhook entegrasyonu mu yoksa sadece statik etiket mi olduğu doğrulanmadı. Eğer sadece etiketse bu yanlış/abartılı bir pazarlama iddiası riski taşıyor — gerçek entegrasyon kurulmalı veya iddia kaldırılmalı.

9. Public/anonim ziyaretçi için `/doc`, `/feedback`, `/appstore`, `/booking`, `/menu`, `/print`, `/card`, `/links` gibi tahmin edilen üst seviye pazarlama/dokümantasyon sayfaları 404 dönüyor — yani ürünün bu özellikleri var ama hiçbir public demo veya dokümantasyon sayfası yok.

## B) YAPISAL/STRATEJİK EKSİKLER (6 rakibin tamamında var, bizde yok)

10. Anasayfada **kayıt olmadan çalışan, anında PNG/SVG indirme yapan** bir QR oluşturucu yok. QRCodeChimp, QRCodeCreator, QRFY, QR Code Monkey, QR Planet'in tamamında bu var. HekaQR'da QR oluşturma tamamen login arkasında (`/dashboard/qrcodes/new`).

11. Trust/güven sinyalleri eksik: SOC2/GDPR rozet görselleri, Trustpilot/Google puanı (rakiplerde 4.9 olarak öne çıkarılıyor), büyük marka müşteri logoları (Uniqode: Amazon/Toyota/Pepsi/Hilton/Marriott/Deloitte/Nestlé), 15 gün geri ödeme garantisi (QRCodeChimp) gibi sosyal kanıt unsurları anasayfada yok.

## C) BACKEND HAZIR, UI'A BAĞLANMAMIŞ ÖZELLİKLER (düşük efor, hızlı kazanç)

12. `lib/services/qrContentBuilder.ts` içinde Event/iCal (`buildEventQrContent`), Location/Maps (`buildLocationQrContent`), Coupon (`buildCouponQrContent`), GS1/Product barcode (`buildGS1QrContent`), Audio/MP3 (`buildAudioQrContent`) için builder fonksiyonları hazır ama `/dashboard/qrcodes/new` akışındaki QR tipi listesinde yok (mevcut liste: Web Sitesi, Ürün QR, Dijital Kartvizit, Multi URL, Menü QR, Geri Bildirim, Rezervasyon, Doküman, App Store, WiFi, SMS, WhatsApp, E-posta, Telefon, Düz Metin). Bu 5 tipi UI'a ekle.

## D) RAPORLAMA / ANALİTİK EKSİKLERİ

13. `/dashboard/reports` sayfasında görünür bir CSV/Excel/PDF export butonu yok. QRCodeChimp (Excel export) ve QR Planet bunu standart sunuyor — ekle.

14. Admin panelindeki zengin analitik (paket dağılımı, leaderboard, ülke/cihaz/QR tipi kırılımı, heatmap) müşteri tarafındaki `/dashboard/reports`'a kıyasla çok daha gelişmiş; bazı görselleştirmeler (heatmap takvimi, QR türü dağılımı) müşteri raporlarına da taşınabilir.

## E) TASARIM STÜDYOSU EKSİKLERİ

15. `/dashboard/templates` stüdyosunda sadece 6 nokta şekli ve sınırlı göz seçenekleri var. QRCodeChimp'te 20+ gövde deseni (insan ikonu dahil), 11 göz çerçevesi, 11 göz topu tipi (yıldız/elmas), "3D Efekt" seçeneği var. QR Planet'te ayrı Frames + Patterns + Background katmanları var. QRFY'de bağlama özel dekoratif CTA çerçeveleri (restoran/kargo/zarf ikonlu) var.

16. AI ile görsel/sanatsal QR kod üretimi (AI-generated QR art) hiçbir incelenen rakipte derinlemesine yok ama pazar araştırmasında taramaları %40'a kadar artırdığı belirtiliyor — fark yaratma fırsatı.

17. "Decorate your picture" / görseli QR'a gömme (QRCodeChimp) gibi bir image-to-QR özelliği yok.

## F) vCARD / DİJİTAL KARTVİZİT EKSİKLERİ

18. `/dashboard/vcard-builder` NFC uyumluluğu, Apple Wallet/Google Wallet'a ekleme (.pkpass / Google Wallet API), Lead Collection, Contact Exchange, Auto Save Contact desteklemiyor — QRCodeChimp'in en güçlü olduğu alan.

19. Dijital kartvizit/form QR'larda CRM senkronizasyonu (HubSpot/Salesforce) yok — Uniqode bunu sunuyor.

## G) BULK / TOPLU İŞLEM EKSİKLERİ

20. `/dashboard/bulk` toplu QR oluşturucu sadece "title,url" CSV formatını (URL tipi) destekliyor; vCard, WiFi gibi diğer tiplerde toplu oluşturma yok.

## H) GÜVENLİK / KURUMSAL ÖZELLİK EKSİKLERİ

21. SSO, 2FA/MFA, Active Directory/Entra ID entegrasyonu yok — QRCodeChimp Pro/Ultima planlarında, Uniqode Plus/Business+ planlarında bu var.

22. HIPAA uyumluluğu mesajlaşması yok — "Hastane/Sağlık Güveni" şablonumuz olduğu halde (Uniqode HIPAA'yı öne çıkarıyor). Not: gerçek sertifikasyon olmadan HIPAA iddiası kullanılmamalı, sadece "veri güvenliği" diliyle sınırlı kalınmalı.

23. Quishing/QR phishing koruması (hedef URL doğrulama, zararlı içerik taraması) gibi bir güvenlik özelliği/mesajı yok — pazar trendi olarak yükselişte.

## I) ENTEGRASYON / GELİŞTİRİCİ DENEYİMİ EKSİKLERİ

24. Public bir API dokümantasyon sayfası yok (`/doc` 404) — `/api/v1` altında zaten bir API var ama dışa açık dokümantasyonu yok.

25. Herhangi bir dosyayı (MP3, PDF, vb.) doğrudan QR'a yükleme özelliği yok — QR Code Monkey'de var.

26. Ayrı bir Chrome eklentisi / tarayıcı uzantısı yok — QR Code Monkey'de var.

## J) FİYATLANDIRMA MODELİ FARKLARI (ürün kararı, kullanıcı onayı gerekir)

27. HekaQR Starter planında 10.000 tarama/ay sınırı var; QRFY ve QR Planet tüm planlarda **sınırsız tarama** sunuyor (sadece QR adedi/landing page sayısı sınırlı), QRCodeCreator Basic'ten itibaren sınırsız tarama veriyor. Bu sınır yoğun kullanıcılar için caydırıcı olabilir — model gözden geçirilmeli.

28. Analitik veri saklama süresine göre kademeli fiyatlandırma (Uniqode: 60/90/180 gün/ömür boyu) bizde yok — ek bir fiyatlandırma kaldıracı olabilir.

29. À la carte/granül ek satın alma (Uniqode: ekstra QR $6.25/adet, ekstra linkpage $1/ay, ekstra kullanıcı koltuğu tek tek fiyatlandırılmış) sadece bizim Enterprise hesaplayıcımızda var, Starter/Pro seviyesinde yok.

30. Retargeting pixel özelliği (Meta Pixel) zaten var ama ayrı, adlandırılmış bir pazarlama özelliği olarak öne çıkarılmıyor — Takip sekmesinde gömülü, pazarlama materyalinde vurgulanmıyor.

## K) GENEL/DİĞER

31. GS1 Digital Link / 2D barkod standardına geçiş (2027 "Sunrise" zorunluluğu) için ileriye dönük bir hazırlık/mesaj yok — backend'de GS1 builder var (madde 12) ama bu standarda özel bir konumlandırma yok.

32. NFC etiket + QR yakınsaması (fiziksel NFC tag ile QR'ı eşleştirme, tap/scan hibrit akış) desteklenmiyor — pazar trendi olarak yükselişte, ödeme ve vCard senaryolarında özellikle talep var.

33. Çok dilli son-kullanıcı landing page'leri (tarayıcı diline göre otomatik içerik) yok — sadece pazarlama/pricing sayfasında TR/EN ayrımı var, QR'ların kendi landing page'lerinde (menü, kartvizit, vb.) çok dillilik yok.

---

## UYGULAMA NOTU

- A bölümündeki maddeler (1-9) düzeltme/bug niteliğinde, doğrudan uygulanabilir.
- C, D, E, F, G bölümleri (12-20) özellik geliştirme, kod tabanına uygun şekilde uygulanabilir.
- H, I bölümleri (21-26) daha büyük efor gerektiren kurumsal/entegrasyon özellikleri, önceliklendirme gerekir.
- J bölümü (27-30) ürün/fiyatlandırma kararıdır, **kod değişikliğinden önce kullanıcı onayı alınmalı**.
- K bölümü (31-33) uzun vadeli/stratejik konumlandırma önerileridir, hemen uygulama gerektirmez.
