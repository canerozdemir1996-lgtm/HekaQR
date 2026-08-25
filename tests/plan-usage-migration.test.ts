import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const MIGRATION_PATH = path.join(process.cwd(), "supabase", "migrations", "20260714100000_usage_read_only_and_retention.sql");
const HARDENING_MIGRATION_PATH = path.join(process.cwd(), "supabase", "migrations", "20260825085649_harden_security_definer_permissions.sql");
const USER_ID = "11111111-1111-4111-8111-111111111111";

test("hardening migration fails before privilege changes when required objects are missing", async () => {
  const db = new PGlite();
  try {
    await db.waitReady;
    await db.exec(`
      create table public.plan_entitlements (id integer);
      create table public.plan_usage_counters (id integer);
      create table public.plan_entitlement_overrides (id integer);
    `);
    await assert.rejects(
      db.exec(await readFile(HARDENING_MIGRATION_PATH, "utf8")),
      /missing function public\.cleanup_scan_logs_by_plan_retention\(\)/i,
    );
    const state = await db.query<{ row_security: boolean }>(`
      select relrowsecurity as row_security
      from pg_catalog.pg_class
      where oid = 'public.plan_entitlements'::regclass
    `);
    assert.equal(state.rows[0].row_security, false);
  } finally {
    await db.close();
  }
});

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
      create table public.plan_entitlement_overrides (id uuid primary key default gen_random_uuid());
      create function public.enforce_dynamic_qr_quota() returns trigger language plpgsql security definer as $$ begin return new; end $$;
      create function public.sync_qr_scan_count() returns trigger language plpgsql security definer as $$ begin return new; end $$;
    `);
    await db.exec(await readFile(MIGRATION_PATH, "utf8"));
    await db.exec("insert into public.plan_entitlements (plan_key, active_dynamic_qr_limit) values ('release-test', 7)");
    await db.exec(await readFile(HARDENING_MIGRATION_PATH, "utf8"));
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

    const cleanupPermissions = await db.query<{ anon_can_execute: boolean; service_can_execute: boolean }>(`
      select
        has_function_privilege('anon', 'public.cleanup_scan_logs_by_plan_retention()', 'execute') as anon_can_execute,
        has_function_privilege('service_role', 'public.cleanup_scan_logs_by_plan_retention()', 'execute') as service_can_execute
    `);
    assert.deepEqual(cleanupPermissions.rows[0], { anon_can_execute: false, service_can_execute: true });

    const hardenedFunctions = await db.query<{
      function_name: string;
      is_security_definer: boolean;
      has_empty_search_path: boolean;
    }>(`
      select
        p.proname as function_name,
        p.prosecdef as is_security_definer,
        coalesce('search_path=""' = any(p.proconfig), false) as has_empty_search_path
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = any(array[
          'cleanup_scan_logs_by_plan_retention',
          'consume_monthly_plan_usage',
          'refresh_qr_read_only_for_user',
          'enforce_dynamic_qr_quota',
          'sync_qr_scan_count'
        ])
      order by p.proname
    `);
    assert.equal(hardenedFunctions.rows.length, 5);
    assert.ok(hardenedFunctions.rows.every((row) => row.is_security_definer));
    assert.ok(hardenedFunctions.rows.every((row) => row.has_empty_search_path));

    const tableSecurity = await db.query<{
      relname: string;
      row_security: boolean;
      anon_can_select: boolean;
      authenticated_can_select: boolean;
    }>(`
      select
        c.relname,
        c.relrowsecurity as row_security,
        has_table_privilege('anon', c.oid, 'select') as anon_can_select,
        has_table_privilege('authenticated', c.oid, 'select') as authenticated_can_select
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any(array[
          'plan_entitlements',
          'plan_usage_counters',
          'plan_entitlement_overrides'
        ])
      order by c.relname
    `);
    assert.equal(tableSecurity.rows.length, 3);
    assert.ok(tableSecurity.rows.every((row) => row.row_security));
    assert.ok(tableSecurity.rows.every((row) => !row.anon_can_select && !row.authenticated_can_select));

    const preservedEntitlement = await db.query<{ active_dynamic_qr_limit: number }>(
      "select active_dynamic_qr_limit from public.plan_entitlements where plan_key = 'release-test'",
    );
    assert.equal(preservedEntitlement.rows[0].active_dynamic_qr_limit, 7);

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
