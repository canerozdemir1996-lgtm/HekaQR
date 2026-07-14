# Manuel QA listesi

- Free: 3 dinamik QR sonrası dördüncü isteğin sunucuda reddi.
- Free: Menu QR için ilk kayıt başarılı, ikincisi reddedilir.
- Starter/Pro: dinamik, Menu, vCard/Multi sınırları doğrulanır.
- Kota dolu dinamik QR `/q/{slug}` yönlendirmeye devam eder.
- Downgrade: redirectler çalışır; limit üstü kaynak düzenlenemez.
- Statik QR: payload doğrudan görsele yazılır, `/q` slug ve scan event oluşturmaz.
- Lemon webhook: aynı event iki kez plan/limit değiştirmez.
- Yeni Lemon variant'ları staging checkout ve webhook ile doğrulanır.
