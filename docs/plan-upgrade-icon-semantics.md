# Plan ve yükseltme ikon semantiği

Tarih: 2026-07-16

- Mevcut ve sağlıklı plan: `BadgeCheck`. Anlamı kullanıcının sahip olduğu doğrulanmış plan durumudur.
- Sorunlu abonelik durumu: `CircleAlert`. Metinde expired, cancelled veya past due durumu da açıkça yazılır.
- Yükseltme eylemi: `Rocket`. Yalnız `/pricing` eyleminde kullanılır; mevcut planı temsil etmez.

İkonlar `lucide-react` içinden gelir; yeni paket eklenmedi. Plan ikonları dekoratif olarak `aria-hidden` tutulur ve kapsayıcı status etiketi anlamı verir. Yükseltme bağlantısı görünür metne ek olarak “Mevcut paketi yükseltme seçeneklerini aç” erişilebilir adına sahiptir. Header aksiyonları mevcut `dashboard-action` minimum yüksekliğini ve klavye focus davranışını korur.

Geri dönüş yaklaşımı yalnız `DashboardShell` ikon importunu ve ilgili JSX düğümünü geri almaktır; route, API ve entitlement mantığı değişmez.
