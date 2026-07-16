import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { createBulkImportSchema } from "../lib/schemas/validationSchemas";
import {
  createBulkImportPostHandler,
  type BulkImportPostDependencies,
} from "../lib/server/bulk-import-handler";

const MIGRATION_PATH = path.join(process.cwd(), "supabase", "migrations", "20260716142749_bulk_import_batches.sql");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const FOLDER_ID = "22222222-2222-4222-8222-222222222222";
const ORGANIZATION_ID = "33333333-3333-4333-8333-333333333333";
const STYLE_ID = "44444444-4444-4444-8444-444444444444";

function dbError(error: unknown) {
  const value = error as { message?: string; code?: string };
  return { message: value.message ?? "database error", code: value.code };
}

async function setupDatabase(db: PGlite) {
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
    create table public.organization_members (
      org_id uuid not null references public.organizations(id),
      user_id uuid not null references auth.users(id),
      role text not null,
      status text not null,
      primary key (org_id, user_id)
    );
    create table public.qr_folders (
      id uuid primary key,
      user_id uuid not null references auth.users(id)
    );
    create table public.qr_styles (
      id uuid primary key,
      user_id uuid references auth.users(id),
      visibility text
    );
    create table public.qr_codes (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id)
    );
  `);
  await db.exec(await readFile(MIGRATION_PATH, "utf8"));
  await db.query("insert into auth.users (id) values ($1)", [USER_ID]);
  await db.query("insert into public.organizations (id) values ($1)", [ORGANIZATION_ID]);
  await db.query("insert into public.organization_members (org_id,user_id,role,status) values ($1,$2,'editor','active')", [ORGANIZATION_ID, USER_ID]);
  await db.query("insert into public.qr_folders (id,user_id) values ($1,$2)", [FOLDER_ID, USER_ID]);
  await db.query("insert into public.qr_styles (id,user_id,visibility) values ($1,$2,'private')", [STYLE_ID, USER_ID]);
}

function databaseDependencies(db: PGlite): BulkImportPostDependencies {
  return {
    authenticate: async () => ({ userId: USER_ID }),
    validate: async request => {
      const result = createBulkImportSchema.safeParse(await request.json());
      if (result.success) return { valid: true, data: result.data };
      return { valid: false, error: Object.assign(new Error("Geçersiz payload"), { details: result.error.flatten() }) };
    },
    findExisting: async (userId, keyHash) => {
      try {
        const result = await db.query<Record<string, unknown> & { payload_hash: string }>(
          "select * from public.qr_import_batches where user_id = $1 and idempotency_key_hash = $2",
          [userId, keyHash],
        );
        return { data: result.rows[0] ?? null, error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },
    getPlan: async () => ({ limits: { max_bulk_qr_per_month: 100 } }),
    canAccessBulk: async () => true,
    findFolder: async folderId => {
      try {
        const result = await db.query<{ user_id: string }>("select user_id from public.qr_folders where id = $1", [folderId]);
        return { data: result.rows[0] ?? null, error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },
    findMembership: async (organizationId, userId) => {
      try {
        const result = await db.query<{ role: string; status: string }>(
          "select role,status from public.organization_members where org_id = $1 and user_id = $2",
          [organizationId, userId],
        );
        return { data: result.rows[0] ?? null, error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },
    findStyle: async styleId => {
      try {
        const result = await db.query<{ user_id: string | null; visibility: string | null }>(
          "select user_id,visibility from public.qr_styles where id = $1",
          [styleId],
        );
        return { data: result.rows[0] ?? null, error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },
    insertBatch: async record => {
      try {
        const result = await db.query<Record<string, unknown> & { id: string }>(`
          insert into public.qr_import_batches (
            user_id,organization_id,folder_id,style_id,name,source_file_name,source_format,qr_mode,status,
            idempotency_key_hash,payload_hash,total_rows,valid_rows,updated_at
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          returning *
        `, [
          record.user_id, record.organization_id, record.folder_id, record.style_id, record.name,
          record.source_file_name, record.source_format, record.qr_mode, record.status,
          record.idempotency_key_hash, record.payload_hash, record.total_rows, record.valid_rows, record.updated_at,
        ]);
        return { data: result.rows[0] ?? null, error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },
    insertRows: async records => {
      try {
        for (const record of records) {
          await db.query(`
            insert into public.qr_import_rows (
              batch_id,user_id,row_number,input_payload,normalized_payload,payload_hash,status,updated_at
            ) values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8)
          `, [
            record.batch_id, record.user_id, record.row_number,
            JSON.stringify(record.input_payload), JSON.stringify(record.normalized_payload),
            record.payload_hash, record.status, record.updated_at,
          ]);
        }
        return { error: null };
      } catch (error) {
        return { error: dbError(error) };
      }
    },
    deleteBatch: async (batchId, userId) => {
      await db.query("delete from public.qr_import_batches where id = $1 and user_id = $2", [batchId, userId]);
    },
    safeDbError: (_error, _context, fallback) => fallback ?? "Güvenli DB hatası",
    now: () => "2026-07-16T12:00:00.000Z",
  };
}

test("bulk POST runs schema, authorization, database writes and replay end to end", async () => {
  const db = new PGlite();
  try {
    await db.waitReady;
    await setupDatabase(db);
    const handler = createBulkImportPostHandler(databaseDependencies(db));
    const body = {
      name: "PostgreSQL integration",
      source_format: "csv",
      qr_mode: "dynamic",
      folder_id: FOLDER_ID,
      organization_id: ORGANIZATION_ID,
      style_id: STYLE_ID,
      rows: [
        { title: "Ürün A", type: "url", fields: { url: "https://example.com/a" }, source_row: 2 },
        { title: "Ürün B", type: "url", fields: { url: "https://example.com/b" }, source_row: 3 },
      ],
    };
    const makeRequest = () => new NextRequest("http://localhost/api/v1/imports", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "postgres-integration-key" },
      body: JSON.stringify(body),
    });

    const created = await handler(makeRequest());
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.idempotent_replay, false);
    assert.equal(createdBody.import.total_rows, 2);

    const stored = await db.query<{ batches: number; rows: number }>(`
      select
        (select count(*)::integer from public.qr_import_batches) as batches,
        (select count(*)::integer from public.qr_import_rows) as rows
    `);
    assert.deepEqual(stored.rows[0], { batches: 1, rows: 2 });

    const replay = await handler(makeRequest());
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).idempotent_replay, true);
    const afterReplay = await db.query<{ batches: number; rows: number }>(`
      select
        (select count(*)::integer from public.qr_import_batches) as batches,
        (select count(*)::integer from public.qr_import_rows) as rows
    `);
    assert.deepEqual(afterReplay.rows[0], { batches: 1, rows: 2 });
  } finally {
    await db.close();
  }
});
