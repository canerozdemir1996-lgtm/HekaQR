# Plan durum ve görsel token matrisi

Tarih: 2026-07-16

Sağ üst plan göstergesi yalnız `/api/v1/plan` tarafından dönen server verisini kullanır. Plan isteği tamamlanana kadar sabit boyutlu skeleton gösterilir; ayarlardaki olası eski `current_plan` değeri header badge'e taşınmaz.

| Plan ailesi | Ana ton | Badge etiketi |
| --- | --- | --- |
| Free / Custom / bilinmeyen | Slate | Server etiketi veya güvenli adlandırılmış fallback |
| Starter / Basic | Blue | Starter |
| Pro | Violet | Pro |
| Business | Emerald | Business |
| Enterprise / Owner | Teal | Enterprise |
| VIP | Amber | VIP |
| Lifetime | Rose | Lifetime |

`active`, `free` ve `trial` durumlarında plan adı tek başına görünür. `expired`, `cancelled` ve `past_due` durumlarında badge kırmızı uyarı tonuna geçer ve durum metnini plan adıyla birlikte gösterir. Her badge'in `role=status`, açıklayıcı `aria-label` ve `title` değeri vardır.

Geri dönüş yaklaşımı: `PlanStatusBadge` kaldırılıp önceki metin badge'i geri alınabilir; API veya veritabanı sözleşmesi değişmedi.
