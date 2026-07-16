import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const MIGRATION_PATH = path.join(process.cwd(), "supabase", "migrations", "20260716113809_bulk_import_batches.sql");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

async function createBaseline(db: PGlite) {
  await db.exec(`
    create role anon noinherit;
    create role authenticated noinherit;
    create role service_role noinherit bypassrls;

    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    create table public.organizations (id uuid primary key);
    create table public.qr_folders (id uuid primary key, user_id uuid not null references auth.users(id));
    create table public.qr_styles (id uuid primary key, user_id uuid references auth.users(id));
    create table public.qr_codes (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id));
  `);
}

test("bulk import migration applies and enforces RLS/claim invariants on PostgreSQL", async () => {
  const db = new PGlite();
  try {
    await db.waitReady;
    await createBaseline(db);
    await db.exec(await readFile(MIGRATION_PATH, "utf8"));

    const schema = await db.query<{
      batches_rls: boolean;
      rows_rls: boolean;
      anon_can_execute: boolean;
      authenticated_can_execute: boolean;
      service_can_execute: boolean;
    }>(`
      select
        (select relrowsecurity from pg_class where oid = 'public.qr_import_batches'::regclass) as batches_rls,
        (select relrowsecurity from pg_class where oid = 'public.qr_import_rows'::regclass) as rows_rls,
        has_function_privilege('anon', 'public.claim_qr_import_rows(uuid,uuid,integer,boolean,uuid)', 'execute') as anon_can_execute,
        has_function_privilege('authenticated', 'public.claim_qr_import_rows(uuid,uuid,integer,boolean,uuid)', 'execute') as authenticated_can_execute,
        has_function_privilege('service_role', 'public.claim_qr_import_rows(uuid,uuid,integer,boolean,uuid)', 'execute') as service_can_execute
    `);
    assert.deepEqual(schema.rows[0], {
      batches_rls: true,
      rows_rls: true,
      anon_can_execute: false,
      authenticated_can_execute: false,
      service_can_execute: true,
    });

    await db.query("insert into auth.users (id) values ($1), ($2)", [USER_ID, OTHER_USER_ID]);
    const batch = await db.query<{ id: string }>(`
      insert into public.qr_import_batches (
        user_id, name, source_format, idempotency_key_hash, payload_hash, total_rows, valid_rows
      ) values ($1, 'Integration batch', 'csv', 'key-hash', 'payload-hash', 3, 3)
      returning id
    `, [USER_ID]);
    const batchId = batch.rows[0].id;
    await db.query(`
      insert into public.qr_import_rows (
        batch_id, user_id, row_number, input_payload, normalized_payload, payload_hash
      ) values
        ($1, $2, 2, '{}'::jsonb, '{}'::jsonb, 'row-2'),
        ($1, $2, 3, '{}'::jsonb, '{}'::jsonb, 'row-3'),
        ($1, $2, 4, '{}'::jsonb, '{}'::jsonb, 'row-4')
    `, [batchId, USER_ID]);

    const firstClaim = await db.query<{ row_number: number }>(
      "select row_number from public.claim_qr_import_rows($1, $2, 2, false) order by row_number",
      [batchId, USER_ID],
    );
    const secondClaim = await db.query<{ row_number: number }>(
      "select row_number from public.claim_qr_import_rows($1, $2, 2, false) order by row_number",
      [batchId, USER_ID],
    );
    assert.deepEqual(firstClaim.rows.map(row => row.row_number), [2, 3]);
    assert.deepEqual(secondClaim.rows.map(row => row.row_number), [4]);

    await db.query(
      "update public.qr_import_rows set status = 'failed' where batch_id = $1",
      [batchId],
    );
    const retryRunId = "33333333-3333-4333-8333-333333333333";
    const retryOne = await db.query<{ row_number: number }>(
      "select row_number from public.claim_qr_import_rows($1, $2, 2, true, $3) order by row_number",
      [batchId, USER_ID, retryRunId],
    );
    await db.query(
      "update public.qr_import_rows set status = 'failed' where batch_id = $1 and status = 'processing'",
      [batchId],
    );
    const retryTwo = await db.query<{ row_number: number }>(
      "select row_number from public.claim_qr_import_rows($1, $2, 2, true, $3) order by row_number",
      [batchId, USER_ID, retryRunId],
    );
    await db.query(
      "update public.qr_import_rows set status = 'failed' where batch_id = $1 and status = 'processing'",
      [batchId],
    );
    const retryExhausted = await db.query<{ row_number: number }>(
      "select row_number from public.claim_qr_import_rows($1, $2, 2, true, $3)",
      [batchId, USER_ID, retryRunId],
    );
    assert.deepEqual(retryOne.rows.map(row => row.row_number), [2, 3]);
    assert.deepEqual(retryTwo.rows.map(row => row.row_number), [4]);
    assert.equal(retryExhausted.rows.length, 0);

    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [USER_ID]);
    const ownRows = await db.query<{ user_id: string }>("select user_id from public.qr_import_batches");
    assert.deepEqual(ownRows.rows.map(row => row.user_id), [USER_ID]);
    await assert.rejects(
      db.query(`
        insert into public.qr_import_batches (
          user_id, name, source_format, idempotency_key_hash, payload_hash, total_rows, valid_rows
        ) values ($1, 'Forbidden client insert', 'csv', 'forbidden-key', 'forbidden-payload', 1, 1)
      `, [USER_ID]),
      /permission denied|row-level security/i,
    );
    await db.exec("reset role");

    await db.query(`
      insert into public.qr_import_batches (
        user_id, name, source_format, idempotency_key_hash, payload_hash, total_rows, valid_rows
      ) values ($1, 'Other batch', 'xlsx', 'other-key', 'other-payload', 1, 1)
    `, [OTHER_USER_ID]);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [USER_ID]);
    const isolated = await db.query<{ user_id: string }>("select user_id from public.qr_import_batches order by created_at");
    assert.deepEqual(isolated.rows.map(row => row.user_id), [USER_ID]);
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});
