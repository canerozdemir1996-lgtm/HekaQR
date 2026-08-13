# Statik ve dinamik QR davranışı

Statik QR nihai payload'ı görsele yazar, short slug/redirect/analitik oluşturmaz ve her plan için sınırsızdır. İçerik değiştirildiğinde yeni görsel gerekir; eski basılı kopya değişmez.

Dinamik QR `/q/{slug}` yönlendirmesiyle çalışır, hedefi düzenlenebilir ve analitik üretir. Dinamik limit yalnız aktif kaynakları sayar. Kotalı tarama bittiğinde redirect devam eder, ayrıntılı event yazımı durur.

URL, WhatsApp, e-posta, konum ve basit vCard iki modu destekler. Wi-Fi, metin, telefon ve SMS yalnız statiktir. Menu, hosted vCard, Multi URL, dosya, form, App Store ve booking yalnız dinamiktir.
