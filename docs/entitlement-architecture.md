# Entitlement mimarisi

Tek kaynak `PlanEntitlements` olmalıdır. Sunucu tarafında plan, aktif abonelik, Enterprise snapshot ve yönetici override'ı birleştirilir. Her denetim `{ allowed, feature, limit, used, remaining, reason, recommendedPlan }` döndürmelidir.

Uygulama öncesi kaynaklar: QR oluşturma/güncelleme, menu, vCard/Multi, klasör, bulk, API, domain, ekip daveti, pixel/GTM/webhook. İstemci yalnız bu sonucu gösterir; karar vermez.

Kota artışı atomik PostgreSQL RPC ile yapılır. Dinamik QR oluşturma aynı transaction'da sayaç kontrolü ve insert yapar. Downgrade hiçbir QR'ı silmez veya redirect'i kapatmaz; limit üstü dinamik kaynaklar `read_only` olur.
