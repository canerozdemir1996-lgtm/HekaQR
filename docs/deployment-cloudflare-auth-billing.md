# QR Publish Production Deployment Notes

Canli ana domain: `https://qrpublish.com`

## App URL and redirects

- `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `PUBLIC_URL` and `AUTH_URL` should point to `https://qrpublish.com`.
- `www.qrpublish.com` is canonicalized to `https://qrpublish.com` in `next.config.js`.
- Auth, password reset, signup verification and Lemon Squeezy redirects must use HTTPS production URLs.

## Cloudflare, DNS and SSL

- Use Cloudflare SSL/TLS mode `Full` or preferably `Full (strict)`.
- Do not use `Flexible` for production auth/payment traffic; it leaves Cloudflare-to-origin traffic on HTTP and can create cookie/redirect issues.
- Main app `A`/`AAAA`/`CNAME` records can be proxied if the origin and app trust proxy headers.
- Mail records (`MX`, `SPF`, `DKIM`, `DMARC`) must stay DNS-only.
- Supabase custom domains should follow Supabase's own DNS instructions.
- Lemon Squeezy custom domains should follow Lemon Squeezy's own DNS/SSL validation instructions; if SSL validation fails behind Cloudflare, set that record to DNS-only until validation completes.
- Set `TRUST_PROXY_HEADERS=true` only when requests reach the app through a trusted proxy such as Cloudflare or the deployment platform.

## Supabase Auth

In Supabase Auth URL settings:

- Site URL: `https://qrpublish.com`
- Redirect URLs:
  - `https://qrpublish.com/**`
  - `https://www.qrpublish.com/**`
  - `https://qrpublish.com/auth/callback`
  - `https://www.qrpublish.com/auth/callback`
  - `https://qrpublish.com/auth/reset`

Supabase requires redirect URLs to be allow-listed; wildcard entries are supported for matching production/preview URL patterns.

## Google OAuth

In Google Cloud Console for the web client:

- Authorized JavaScript origins:
  - `https://qrpublish.com`
  - `https://www.qrpublish.com`
- Authorized redirect URIs:
  - Supabase callback URL, usually `https://<project-ref>.supabase.co/auth/v1/callback`
  - Add any custom callback only if the project uses a separate Google OAuth callback endpoint.

Google web OAuth origins and redirect URIs must use HTTPS in production.

## Lemon Squeezy

- Webhook callback URL: `https://qrpublish.com/api/webhooks/lemon-squeezy`
- Keep `LEMONSQUEEZY_WEBHOOK_SECRET` identical to the signing secret configured in Lemon Squeezy.
- `LEMONSQUEEZY_TEST_MODE=false` for live mode.
- Live variant IDs must be set for Starter/Pro/Enterprise plans.
- VIP/manual plans are not managed through the Lemon customer portal; the app returns a dedicated manual-plan message.

## Database

Manual VIP license fields require the latest Supabase migration:

- `supabase/migrations/20260709113000_user_settings_license_schema_reload.sql`

This migration is idempotent and sends `notify pgrst, 'reload schema';` so Supabase/PostgREST refreshes the `user_settings` schema cache.

## References

- Cloudflare SSL modes: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/
- Cloudflare Full (strict): https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- Supabase redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Google OAuth web setup: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- Google OAuth policies: https://developers.google.com/identity/protocols/oauth2/policies
- Lemon Squeezy webhooks: https://docs.lemonsqueezy.com/help/webhooks
- Lemon Squeezy signing requests: https://docs.lemonsqueezy.com/help/webhooks/signing-requests
