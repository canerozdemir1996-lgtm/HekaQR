# QR Publish Responsive Design System Protocol

Bu proje yeni ekranlarda sayfa bazlı CSS mantığı yerine ortak design system sınıflarını kullanır.

## Layout

- Sayfa kökü: `ds-page`
- İç genişlik: `ds-container`
- Çoklu kart düzeni: `ds-grid`
- İki kolonlu içerik: `ds-grid-2`
- Mobilde tüm gridler tek kolona düşmelidir.
- Yatay scroll kabul edilmez; uzun metinlerde `ds-truncate` veya `ds-break` kullanılmalıdır.

## Card

- Standart kart: `ds-card` veya mevcut dashboard ekranlarında `dashboard-card`.
- Kartlar `min-width: 0`, `overflow: hidden`, ortak radius, border ve shadow kullanır.
- Kart içinde nested card kullanılacaksa yalnızca gerçek tekrar eden item, modal veya framed tool için kullanılmalıdır.

## Forms

- Standart input/textarea/select: `ds-control` veya dashboard formlarında `dashboard-input`.
- Tüm kontroller `width: 100%`, `min-width: 0`, ortak yükseklik ve focus ring kullanır.
- Mobilde iki kolonlu form alanları `grid gap-3 sm:grid-cols-2` şeklinde yazılır.

## Buttons

Yeni buton varyantları oluşturulmaz. Kullanılacak varyantlar:

- `primary`
- `secondary`
- `outline`
- `ghost`
- `danger`
- `success`

React tarafında `Button` componenti tercih edilir. CSS-only ihtiyaçlarda `ds-button` ile `ds-btn-*` sınıfları kullanılır.

## Theme Tokens

Yeni component doğrudan HEX renklere yaslanmamalıdır. Öncelik:

- `--app-bg`
- `--card-bg`
- `--border-color`
- `--text-primary`
- `--text-secondary`
- `--accent`
- `--good`
- `--warn`
- `--bad`

Light/dark mode farkı token değişimiyle çözülmelidir.

## Media

- Görseller `max-width: 100%` ve uygun `object-fit` kullanmalıdır.
- Logo/fallback gerektiren alanlarda bozuk URL veya boş metin görsel gibi render edilmemelidir.
