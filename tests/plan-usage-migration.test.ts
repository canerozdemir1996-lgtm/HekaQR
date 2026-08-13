import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const MIGRATION_PATH = path.join(process.cwd(), "supabase", "migrations", "20260714100000_usage_read_only_and_retention.sql");
const USER_ID = "11111111-1111-4111-8111-111111111111";

test("monthly bulk usage reservations are atomic and service-role only", async () => {
  const db = new PGlite();
  try {
    await db.waitReady;
    await db.exec(`
      create role anon noinherit;
      create role authenticated noinherit;
      create role service_role noinherit bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key);
      create table public.user_settings (
        user_id uuid primary key references auth.users(id),
        current_plan text,
        enterprise_limits jsonb
      );
      create table public.plan_entitlements (
        plan_key text primary key,
        active_dynamic_qr_limit integer
      );
      create table public.qr_codes (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id),
        created_at timestamptz not null default now(),
        qr_mode text,
        is_active boolean,
        deleted_at timestamptz,
        read_only_reason text
      );
      create table public.scan_logs (
        qr_id uuid references public.qr_codes(id),
        created_at timestamptz not null default now()
      );
    `);
    await db.exec(await readFile(MIGRATION_PATH, "utf8"));
    await db.query("insert into auth.users (id) values ($1)", [USER_ID]);

    const permissions = await db.query<{
      anon_can_execute: boolean;
      authenticated_can_execute: boolean;
      service_can_execute: boolean;
    }>(`
      select
        has_function_privilege('anon', 'public.consume_monthly_plan_usage(uuid,text,text,integer,integer)', 'execute') as anon_can_execute,
        has_function_privilege('authenticated', 'public.consume_monthly_plan_usage(uuid,text,text,integer,integer)', 'execute') as authenticated_can_execute,
        has_function_privilege('service_role', 'public.consume_monthly_plan_usage(uuid,text,text,integer,integer)', 'execute') as service_can_execute
    `);
    assert.deepEqual(permissions.rows[0], {
      anon_can_execute: false,
      authenticated_can_execute: false,
      service_can_execute: true,
    });

    const reservations = await Promise.all(Array.from({ length: 8 }, async () => {
      const result = await db.query<{ accepted: boolean }>(
        "select public.consume_monthly_plan_usage($1, '2026-07', 'bulk_qr_created', 3, 1) as accepted",
        [USER_ID],
      );
      return result.rows[0].accepted;
    }));
    assert.equal(reservations.filter(Boolean).length, 3);

    const counter = await db.query<{ used: number }>(`
      select used from public.plan_usage_counters
      where user_id = $1 and period = '2026-07' and usage_key = 'bulk_qr_created'
    `, [USER_ID]);
    assert.equal(counter.rows[0].used, 3);
  } finally {
    await db.close();
  }
});
