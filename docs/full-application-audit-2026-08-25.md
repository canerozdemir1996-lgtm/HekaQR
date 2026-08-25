# QRPublish — Full Application Audit

Date: 2026-08-25  
Scope: application architecture, API routes, Supabase schema/RLS, authentication/MFA, QR creation/editing/delivery, integrations, uploads, public UX, dependencies, build and test posture.  
Method: static code review, dependency audit, migration execution with PGlite, production build, full automated test suite, live production smoke checks and local browser smoke checks.

## 1. Executive summary

QRPublish has a broad, coherent product surface and a generally sound server-side ownership pattern, but the audit found several production-critical trust-boundary defects. The highest-impact application defects were fixed in this change set: user-controlled metadata could grant an admin role, legacy integration routes exposed service-role operations without authentication, the MFA completion cookie was forgeable, outbound webhooks were SSRF-capable, maintenance RPCs could inherit public execution permission, and public QR pages rendered stored executable URLs/HTML.

The original QR link editing error is also fixed and covered by regression tests. Product QR records now hydrate their URL field during edit, and legacy static records compare edits against `target_url` when `static_payload` is absent.

The remaining release blocker is the framework line: Next.js 14.2.35 has current high-severity advisories for which npm proposes a breaking Next.js 16 migration. The official codemod was intentionally not run because a 14→16 rewrite requires explicit approval and staged compatibility testing. Production should not be considered fully hardened until that migration and the new database migration are deployed.

### Scores after the fixes in this branch

| Area | Score | Summary |
|---|---:|---|
| Functional correctness | 8.5/10 | Build and 246 tests pass; QR edit regression is covered. |
| Security | 7/10 | Critical app flaws fixed; Next 14 advisories and CSP posture remain. |
| UX and accessibility | 8/10 | Responsive public surface is solid; touch-target and 404 semantics need follow-up. |
| Performance | 6.5/10 | Large client bundles/components and scan-path work remain. |
| Reliability | 7.5/10 | Good error isolation and tests; migration drift and in-memory rate limiting remain. |
| Maintainability | 6/10 | Clear modules, but several 800–5,000 line components create change risk. |
| Production readiness | 6.5/10 | Requires Next upgrade, migration deployment, secrets, and staged CSP enforcement. |

## 2. Architecture and module inventory

### Runtime architecture

1. Next.js App Router serves the marketing site, authenticated dashboard/admin UI, public QR landing pages and Route Handler APIs.
2. Supabase Auth provides cookie-backed sessions through `@supabase/ssr`.
3. Route Handlers commonly use the Supabase service role after authenticating the request and checking record or organization ownership.
4. Supabase Postgres stores QR records, content, organizations, plans, analytics, submissions, billing state and operational records.
5. Supabase Storage hosts public uploaded assets.
6. QR delivery starts at `/q/[slug]`, applies status/password/plan/routing rules, records analytics on a best-effort basis and redirects to a target or a first-party landing page.
7. External systems include Lemon Squeezy, Resend/SMTP, SMS providers, Sentry, Google/Meta tags, custom-domain provisioning and user webhooks.
8. The repository contains Vercel metadata, but deployment scripts and configuration describe a self-hosted, single-instance PM2 deployment with an atomic `.next` swap.

### Product modules

| Module | Main responsibilities |
|---|---|
| Marketing and SEO | Home, pricing, solution pages, blog, metadata, sitemap, robots, JSON-LD. |
| Authentication | Login/signup/reset, Supabase session refresh, safe post-login redirects. |
| MFA | Custom TOTP setup/challenge, backup codes, admin MFA gate. |
| QR management | Create, edit, delete, folders, templates, styles, static/dynamic modes, plan quotas. |
| QR rendering | SVG/PNG generation, Sharp rasterization, PDF/export and QR styling. |
| Public QR delivery | Slug resolution, custom-domain isolation, password/expiry/scan-limit checks and redirects. |
| Smart QR content | vCard, multi-link, menu, feedback, booking, document, app store, quiz/exam, coupon, GS1/product, audio, Wi-Fi and text. |
| Analytics | Scan logs, counters, dashboards, reports and exports. |
| Organizations | Memberships, roles, invites, shared QR ownership and branding. |
| Billing and plans | Lemon Squeezy checkout/webhooks, entitlements, usage counters and read-only downgrade behavior. |
| Integrations | API keys, webhooks, CSV/Google Sheets compatibility import and SEO audit. |
| Admin | Users, analytics, pricing, billing health, backups, broadcasts, SMS, audit logs and tests. |
| Operations | Backup/restore workflows, Sentry instrumentation, health/status and custom-domain provisioning. |

### Primary user flows

- Visitor → signup/login → optional/required MFA → dashboard.
- User → create QR → select static/dynamic mode and type → configure design/content → publish/share/download.
- User → edit existing QR → load stored target/content → validate immutable static behavior → save.
- Scanner → `/q/{slug}` → domain/status/password/rule checks → analytics → public landing page or HTTP redirect.
- QR visitor → submit booking/feedback/lead/order/exam/coupon action → owner dashboard/realtime notification.
- Team owner → create organization → invite members → assign roles → collaborate on organization QR records.
- Customer → select paid plan → Lemon Squeezy checkout → signed webhook → plan/entitlement refresh.
- Admin/owner → MFA gate → user, billing, messaging, backup and operational tools.
- Power user → API key or bulk import → validated/authorized batch → asynchronous processing and reporting.

## 3. Findings and fixes

### P0 — fixed

#### SEC-001: User-editable metadata granted administrative roles

- Evidence: `lib/auth.ts` previously trusted `user.user_metadata.role` as well as `app_metadata.role`.
- Exploit: an authenticated user can update their own Supabase `user_metadata`; setting `role=admin` or `owner` reached server admin guards.
- Impact: administrative account takeover, user management and sensitive operational access.
- Root cause: mixing user-controlled profile metadata with server-controlled authorization claims.
- Fix: `roleFromMetadata` now trusts only `app_metadata` (plus the explicit root-owner email rule). Client admin pages no longer fall back to `user_metadata.role`.
- Verification: `tests/auth-role.test.ts`.

#### SEC-002: Integration endpoints performed service-role operations without authentication

- Evidence: `/api/v1/integrations/webhooks` and `/api/v1/integrations/google-sheets` accepted arbitrary QR/user IDs while using the service-role key.
- Exploit: an unauthenticated caller could read another QR's recent analytics, send those details to an attacker-controlled URL, alter webhook subscriptions or create QR records for an arbitrary user.
- Impact: cross-tenant data disclosure, unauthorized writes, outbound abuse and cost amplification.
- Fix: session/API authentication, owner binding, QR ownership checks, trigger allowlists, body/row limits, safe errors and per-user rate limits.
- Compatibility note: the legacy Google Sheets endpoint remains a simple comma-separated compatibility importer; quoted-comma CSV should use the main bulk-import module.

#### SEC-003: MFA completion cookie was forgeable

- Evidence: `lib/mfaCookie.ts` used `SHA-256(userId)` as the complete cookie value.
- Exploit: anyone with a stolen Supabase session knows the user ID and could generate the MFA cookie without the TOTP or backup code.
- Impact: complete bypass of the second authentication factor, including the admin MFA gate.
- Fix: the cookie is now `__Host-` scoped and HMAC-signed with `MFA_COOKIE_SECRET`, `NEXTAUTH_SECRET`, or the service-role secret. Verification is length-aware and constant-time. Challenge/setup verification is rate-limited.
- Required deployment action: set a dedicated, high-entropy `MFA_COOKIE_SECRET`.
- Verification: `tests/mfa-cookie.test.ts`.

#### DB-001: Data-deleting `SECURITY DEFINER` RPCs inherited public execution

- Evidence: `cleanup_scan_logs_by_plan_retention()` and legacy `cleanup_free_plan_scan_logs()` were granted to `service_role` without first revoking PostgreSQL's default PUBLIC execute privilege. The legacy monthly counter helper had the same pattern.
- Exploit: if exposed through PostgREST RPC, anon/authenticated callers could invoke maintenance or counter functions.
- Impact: destructive analytics deletion and quota manipulation.
- Fix: `20260825085649_harden_security_definer_permissions.sql` explicitly revokes PUBLIC/anon/authenticated execution, grants only `service_role`, hardens trigger functions and enables/restricts RLS on entitlement internals. Legacy functions are handled conditionally so clean environments still migrate.
- Verification: the migration executes in PGlite and its privileges are asserted by `tests/plan-usage-migration.test.ts`.
- Required deployment action: review and apply the migration through the normal Supabase promotion process.

### P1 — fixed

#### SEC-004: Outbound webhook SSRF and DNS-rebinding exposure

- Evidence: webhook dispatch used `fetch()` on tenant-controlled URLs.
- Impact: probes or requests to loopback, private networks, metadata endpoints or a DNS-rebinding target.
- Fix: webhook delivery now accepts only standard HTTP(S), resolves and rejects non-public/mixed DNS answers, pins the request to the validated IP, preserves Host/TLS SNI, revalidates redirects, limits response bytes and uses a five-second timeout.
- Verification: existing webhook tests plus `tests/seo-audit.test.ts` SSRF cases.

#### SEC-005: Stored XSS/executable links on public QR pages

- Evidence: vCard block text used raw `dangerouslySetInnerHTML`; vCard buttons and multi-link/document/app-store/audio/coupon URLs were rendered or redirected without a final scheme allowlist.
- Impact: a malicious tenant could target QR visitors with stored script execution or executable URLs.
- Fix: vCard text renders as text, public links are normalized through an HTTP(S)-only helper, document/app-store redirects fail closed, and QR rule URLs receive a strict HTTP(S) schema.
- Verification: `tests/public-url.test.ts` and `tests/validation-schemas.test.ts`.

#### SEC-006: Upload MIME spoofing and unbounded abuse surface

- Evidence: asset upload trusted the multipart MIME declaration and parsed before applying an abuse boundary.
- Impact: public storage of disguised content, storage/bandwidth abuse and unnecessary memory pressure.
- Fix: signature checks for JPEG/PNG/WebP/GIF/AVIF/PDF, request/file limits, authenticated per-user/IP rate limiting and non-leaking storage errors.
- Verification: `tests/upload-validation.test.ts`.

#### SEC-007: One-time MFA backup code could be consumed twice concurrently

- Evidence: select-then-update flow had no `used=false` condition on the update.
- Impact: concurrent replay of a single backup code.
- Fix: one conditional `UPDATE ... WHERE used=false RETURNING` consumes the code atomically.

#### QR-001: Product/legacy static QR edit failed

- Evidence: edit hydration only loaded `target_url` for type `url`, not `product`; static legacy rows compared against a nullable `static_payload` only.
- User impact: editing a product QR could submit an empty target and fail; editing title/settings on an older static QR could be rejected as a target change.
- Fix: product and URL types share URL hydration; legacy static comparison falls back to the stored `target_url`.
- Verification: `tests/qr-edit.test.ts`.

### P1 — open / release blocking

#### DEP-001: Next.js 14.2.35 has unresolved high-severity advisories

- `npm audit` still reports Next.js and its bundled PostCSS as high severity. The reported issues include DoS, SSRF/request-smuggling and cache-related advisories relevant to a self-hosted App Router deployment.
- npm's supported fix is a breaking migration to Next.js 16.3.2. The official upgrade path also requires React 19, async request APIs and configuration/proxy changes.
- The official codemod was requested but not authorized because it is a broad source/dependency rewrite. Do not use `npm audit fix --force` blindly.
- Recommendation: create a dedicated upgrade branch, run the official 14→15 and 15→16 codemods, migrate all async `headers/cookies/params/searchParams`, stage against a copy of production data, run E2E tests and then deploy.
- References: [Next.js 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15), [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16), [official codemods](https://nextjs.org/docs/app/guides/upgrading/codemods).

#### DEP-002: `geoip-lite` retains a vulnerable `ip-address` dependency

- npm reports one moderate direct chain and a high transitive advisory.
- Current application use is limited to IP geolocation lookup; it does not call the vulnerable HTML emitters or use the package as an SSRF authorization boundary. This reduces practical exposure but does not make the dependency clean.
- Recommendation: replace `geoip-lite` with a maintained GeoIP provider/database integration, or isolate it behind a narrow validated adapter and documented risk acceptance.

#### OPS-001: Database migration sources are split

- The repository contains both `supabase/migrations/` and a root `migrations/` directory. Runtime code calls functions that exist only in the legacy directory.
- Impact: a clean environment may not match production; disaster recovery and onboarding can silently omit security-critical functions/grants.
- Recommendation: inventory production migration history, move/recreate legacy migrations in the Supabase CLI chain, add `supabase/config.toml`, and make CI reset/apply/test the canonical chain.

#### SEC-008: CSP is report-only and permissive

- `Content-Security-Policy-Report-Only` allows `script-src 'unsafe-inline' https:` and broad image/connect sources.
- Impact: CSP does not currently contain an XSS or compromised third-party script.
- Recommendation: collect violation reports, introduce nonces/hashes, enumerate analytics/payment hosts and promote a tested policy to enforcing mode.

#### SEC-009: QR access passwords are stored as plaintext

- The password field is read directly and compared as plaintext; it is also used when deriving unlock-cookie signatures.
- Impact: database/service-role disclosure reveals QR access passwords.
- Recommendation: migrate to Argon2id/scrypt hashes with a versioned format. Sign unlock cookies using QR ID + password-hash/version, not plaintext.

### P2 — open

#### PERF-001: Large client bundles and oversized components

- Production build: home first load 226 kB, dashboard 393 kB, several admin/report pages approximately 250–295 kB.
- `components/CreateQRModal.tsx` is approximately 5,000 lines; multiple dashboard/admin files are 800–1,900 lines.
- Impact: slower parse/hydration, more regressions and difficult code ownership.
- Recommendation: split QR type editors into lazy-loaded modules, isolate previews/renderers, move schemas/state machines out of the modal and add per-route bundle budgets.

#### PERF-002: Scan redirect path performs avoidable work

- `/q/[slug]` performs plan lookup/counter reservation, optional database scan count, geo lookup and log insertion before returning the redirect.
- `geoip-lite` loads a large local data set lazily.
- Recommendation: measure p50/p95 redirect latency, move analytics to a durable queue/outbox, cache plan data and keep redirect authorization checks synchronous/minimal.

#### REL-001: Rate limiting is process-local

- Current deployment comments indicate a single PM2 instance, so behavior is consistent today.
- Any horizontal scaling, rolling overlap or serverless deployment would create independent counters.
- Recommendation: move security/cost limits to Redis/Upstash or atomic Postgres functions before scaling out.

#### QA-001: Browser coverage is Chromium-only

- Playwright configuration does not cover Firefox, WebKit or representative mobile projects.
- Recommendation: add desktop Chromium/Firefox/WebKit and iPhone/Android viewports for login, QR creation/edit, scan redirect, public smart pages and checkout handoff.

#### UX-001: Small touch targets and 404 semantics

- Live responsive sampling at 320–1920 px found no horizontal overflow, but 14–22 inline/footer targets per sampled public page were below a 44 px touch-height target.
- A local nonexistent vCard page rendered the 404 title without a page `<h1>`.
- Recommendation: enlarge high-frequency mobile controls and standardize public not-found pages with one descriptive H1.

#### OPS-002: Release identity is not trustworthy

- Live production footer displayed `v1.0.0 · Build local`.
- Impact: support and incident response cannot reliably identify the deployed revision.
- Recommendation: inject immutable commit SHA/build time at CI build and expose it in `/status` and Sentry release metadata.

#### QA-002: Lint debt is visible

- Full lint completes with zero errors and 56 warnings: impure render-time randomness, effect-driven synchronous state updates, missing hook dependencies, large use of raw `<img>` and unused suppressions.
- Recommendation: fix purity/hook warnings first and introduce a non-increasing warning budget in CI.

### P3 — improvement opportunities

- Consolidate repeated public-page QR lookup/domain/status logic into one server helper.
- Replace scattered `any`/record-shaped dynamic content with discriminated Zod schemas per QR type.
- Add explicit JSON request body ceilings to every public write route, not only the highest-risk endpoints.
- Replace compatibility CSV parsing with the canonical bulk parser.
- Add performance budgets for middleware (currently 150 kB) and first-load JS.
- Document data retention, analytics consent and deletion/export SLA with legal review.

## 4. Dependency result

- `npm install` restored the previously missing Excel and PGlite dependencies.
- `npm audit fix` updated safe transitive packages including `brace-expansion`, `js-yaml`, `nanoid` and direct PostCSS.
- Sharp was upgraded from 0.33.x to 0.35.3 to remove the reported libvips vulnerabilities; build and rendering imports compile successfully.
- Remaining audit result: four vulnerabilities — one moderate and three high — grouped under `geoip-lite`/`ip-address` and Next.js/bundled PostCSS.
- Node.js 22.23.1 satisfies Sharp 0.35 and the future Next 16 minimum. Production runtime must be Node 20.9+ before deploying this dependency change.

## 5. Verification record

| Check | Result |
|---|---|
| Dependency installation | Pass; missing packages restored. |
| TypeScript `tsc --noEmit` | Pass. |
| Unit/integration suite | Pass; 234 tests. Catalog contains 48 files / 246 tests including E2E cases. |
| Security regression tests | Pass: roles, MFA cookie, webhook/SSRF, URL schemes, upload signatures, QR edit. |
| Migration execution/privileges | Pass in PGlite. |
| ESLint | Pass with 0 errors / 56 warnings. |
| Production build | Pass; 95 static pages generated. |
| Build warnings | Sentry/OpenTelemetry dynamic require and large webpack cache string. |
| Live production public smoke | Home, pricing, login, signup, privacy, terms and 404 loaded without observed console errors. |
| Responsive smoke | 320, 375, 390, 430, 768, 1024, 1366, 1440 and 1920 px; no horizontal overflow. |
| Local public smoke | Home and public/error routes load; no horizontal overflow; home has one H1, named buttons and image alt text. |
| Authenticated browser E2E | Not completed: no test account/session was provided and local Supabase auth was unavailable in the sandbox. |

## 6. Required release sequence

1. Generate strong `MFA_COOKIE_SECRET` and `QR_UNLOCK_SECRET` in every production/staging environment.
2. Confirm production Node is at least 20.9 because Sharp 0.35 requires it.
3. Review and apply `20260825085649_harden_security_definer_permissions.sql` in staging, verify RPC/table grants, then promote to production.
4. Deploy this application patch and run authenticated QR create/edit regression checks, especially product QR and legacy static QR records.
5. Open a dedicated, explicitly approved Next 16 migration task; do not force-upgrade in the release patch.
6. Replace/accept the `geoip-lite` dependency risk.
7. Enforce a staged CSP after violation cleanup.
8. Run the release E2E matrix with a real test tenant, organization member, admin+MFA user and Lemon Squeezy test subscription.

## 7. Supabase production notes

All Data API tables should have RLS enabled and intentional grants/policies. Security-definer functions must have an immutable/search-path strategy and explicit execute grants. Views exposed through the API should use security-invoker semantics where appropriate. See [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [securing the Data API](https://supabase.com/docs/guides/api/securing-your-api), and [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
