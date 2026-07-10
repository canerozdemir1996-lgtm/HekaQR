-- Kupon bileti: panelden ayarlanabilir tema + sipariş-kodu gate (reveal akışı)
-- theme            : arka plan/accent/metin renkleri, logo, başlıklar, buton, sosyal linkler
-- valid_order_refs : boş ise gate yok (herhangi ref kabul); dolu ise sadece bu ref'ler kodu açar

alter table public.coupon_campaigns
  add column if not exists theme jsonb not null default '{}'::jsonb,
  add column if not exists valid_order_refs text[] not null default '{}'::text[];

-- Reveal denemesi order_ref bazında idempotent olsun diye attempts'e index.
create index if not exists coupon_attempts_order_ref_idx
  on public.coupon_redemption_attempts(campaign_id, order_ref)
  where order_ref is not null;
