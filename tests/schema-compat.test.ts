import assert from "node:assert/strict";
import test from "node:test";
import { isSchemaCompatError, safeDbErrorMessage } from "../lib/server/api-helpers";

<<<<<<< Updated upstream
test("schema compatibility detection accepts concrete Postgres/PostgREST schema errors", () => {
  assert.equal(isSchemaCompatError({ code: "42P01", message: 'relation "booking_submissions" does not exist' }), true);
  assert.equal(isSchemaCompatError({ code: "PGRST205", message: "Could not find the table in the schema cache" }), true);
});

test("schema compatibility detection does not classify ordinary text as a schema error", () => {
  assert.equal(isSchemaCompatError({ code: "500", message: "Could not find a matching reservation" }), false);
  assert.equal(isSchemaCompatError({ code: "500", message: "Table reservation is full" }), false);
});

test("database errors return the route fallback without exposing migration instructions", () => {
  const message = safeDbErrorMessage({ code: "42P01", message: 'relation "feedback_submissions" does not exist' }, "test", "Kayıtlar yüklenemedi.");
  assert.equal(message, "Kayıtlar yüklenemedi.");
=======
test("schema compatibility detection only accepts concrete database errors", () => {
  assert.equal(isSchemaCompatError({ code: "42P01", message: "relation does not exist" }), true);
  assert.equal(isSchemaCompatError({ code: "PGRST204", message: "schema cache" }), true);
  assert.equal(isSchemaCompatError({ message: "column qr_design does not exist" }), true);
  assert.equal(isSchemaCompatError({ message: "Unable to sort this column" }), false);
  assert.equal(isSchemaCompatError({ message: "Table reservation failed validation" }), false);
});

test("database details remain in logs while users receive the route fallback", () => {
  const fallback = "Rezervasyon kayıtları şu anda alınamadı.";
  assert.equal(
    safeDbErrorMessage({ code: "42P01", message: "relation booking_submissions does not exist" }, "test", fallback),
    fallback,
  );
>>>>>>> Stashed changes
});
