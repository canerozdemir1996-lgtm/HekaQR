# SEO test aracı güvenlik sözleşmesi

## Erişim ve ürün kararı

Araç tüm oturumlu planlarda Ayarlar içinde kullanılabilir; veritabanına kayıt yazmaz. Dış istek maliyeti kullanıcı başına 10 dakika içinde 10 analizle sınırlıdır. API yanıtı `no-store` döner.

## SSRF tehdit modeli

| Tehdit | Kontrol |
| --- | --- |
| `file:`, `ftp:` ve benzeri protokoller | Yalnız HTTP/HTTPS |
| Localhost ve iç DNS suffix'leri | localhost, `.local`, `.internal`, `.lan` bloklu |
| Cloud metadata | Bilinen metadata hostname'leri ve link-local IP bloklu |
| IPv4 private/loopback/link-local/CGNAT | CIDR kontrolüyle bloklu |
| IPv6 loopback/ULA/link-local/multicast/doc/NAT64 | Prefix kontrolüyle bloklu |
| DNS rebinding | Tüm DNS cevapları kontrol edilir; istek doğrulanan tek IP'ye pinlenir, Host/SNI gerçek hostname kalır |
| Zararlı redirect | En fazla 3; her hedef protokol, host, port ve DNS kontrollerinden yeniden geçer |
| Port tarama | Yalnız standart HTTP 80 ve HTTPS 443 |
| Yavaş/hedefi büyük yanıt | 8 saniye timeout, 1 MB streaming sınırı, `Accept-Encoding: identity` |
| Binary/JSON indirme | Yalnız HTML/XHTML content-type |
| Stored/reflected XSS | Ham HTML dönmez; metin alanları tag/control karakterlerinden arındırılır ve uzunluk sınırlıdır |

## Analiz sözleşmesi

Çıktı HTTP durumunu, final URL/redirect sayısını, response boyut/süresini; title, description, canonical, robots, lang, H1, OG, viewport ve JSON-LD sayısını içerir. Skor bir arama sıralaması vaadi değildir; yalnız bu on teknik kontrolün durum özetidir.

## Bilinen sınır

Bu araç JavaScript çalıştırmaz ve tarayıcı render'ı yapmaz. Client-side üretilen metadata görünmeyebilir. Core Web Vitals, index durumu, backlink veya gerçek sıralama ölçmez.
