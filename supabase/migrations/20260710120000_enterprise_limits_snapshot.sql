-- Enterprise per-user limit snapshot.
-- When a user completes a self-serve Enterprise checkout, the slider selection
-- they paid for (dynamicQr / monthlyScans / teamMembers / ...) is snapshotted
-- here so runtime limit resolution can enforce exactly what was purchased
-- instead of a blanket-unlimited Enterprise tier.
--
-- Shape (jsonb):
--   {
--     "dynamicQr": 500, "menuQr": 40, "vcardPages": 80,
--     "monthlyScans": 300000, "teamMembers": 15, "whiteLabelDomains": 3,
--     "quote_id": "quote_...", "billing_preference": "yearly",
--     "updated_at": "2026-07-10T00:00:00.000Z"
--   }
--
-- NULL = no snapshot -> Enterprise falls back to the static unlimited tier
-- (also the case for admin/VIP-granted Enterprise entitlements). Additive only;
-- Free/Starter/Pro/VIP behaviour is unchanged.

alter table public.user_settings
  add column if not exists enterprise_limits jsonb;

notify pgrst, 'reload schema';
