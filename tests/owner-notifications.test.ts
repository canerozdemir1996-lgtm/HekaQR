import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOwnerNotificationContent,
  notifyOwnerOfSubmission,
  resolveOwnerEmail,
  type OwnerLookupClient,
} from "../lib/email/ownerNotifications";

function fakeLookupClient(opts: {
  settingsEmail?: string | null;
  settingsError?: unknown;
  authEmail?: string | null;
  authError?: unknown;
}): OwnerLookupClient {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: opts.settingsEmail !== undefined ? { notification_email: opts.settingsEmail } : null,
                  error: opts.settingsError ?? null,
                }),
              };
            },
          };
        },
      };
    },
    auth: {
      admin: {
        getUserById: async () => ({
          data: opts.authEmail !== undefined ? { user: { email: opts.authEmail } } : null,
          error: opts.authError ?? null,
        }),
      },
    },
  } as unknown as OwnerLookupClient;
}

test("buildOwnerNotificationContent: menu_order summary includes table, item count and amount", () => {
  const { subject, summary, panelPath } = buildOwnerNotificationContent({
    kind: "menu_order",
    qrTitle: "Kahve Dükkanı",
    tableNo: 5,
    itemCount: 3,
    subtotal: 120,
    currency: "TL",
  });
  assert.equal(subject, "Yeni sipariş: Kahve Dükkanı");
  assert.match(summary, /Masa 5/);
  assert.match(summary, /3 ürün/);
  assert.match(summary, /120/);
  assert.equal(panelPath, "/dashboard/orders");
});

test("buildOwnerNotificationContent: booking summary includes customer and time", () => {
  const { subject, summary, panelPath } = buildOwnerNotificationContent({
    kind: "booking",
    qrTitle: "Berber Ali",
    customerName: "Ahmet Yılmaz",
    appointmentDate: "2026-07-01",
    appointmentTime: "14:30",
  });
  assert.equal(subject, "Yeni rezervasyon: Berber Ali");
  assert.match(summary, /Ahmet Yılmaz/);
  assert.match(summary, /2026-07-01/);
  assert.match(summary, /14:30/);
  assert.equal(panelPath, "/dashboard/bookings");
});

test("buildOwnerNotificationContent: feedback summary includes type and subject", () => {
  const { subject, summary, panelPath } = buildOwnerNotificationContent({
    kind: "feedback",
    qrTitle: "Restoran X",
    type: "complaint",
    subject: "Servis",
  });
  assert.equal(subject, "Yeni geri bildirim: Restoran X");
  assert.match(summary, /Servis/);
  assert.match(summary, /complaint/);
  assert.equal(panelPath, "/dashboard/feedback");
});

test("resolveOwnerEmail: prefers user_settings.notification_email override", async () => {
  const sb = fakeLookupClient({ settingsEmail: "override@example.com", authEmail: "auth@example.com" });
  const email = await resolveOwnerEmail(sb, "user-1");
  assert.equal(email, "override@example.com");
});

test("resolveOwnerEmail: falls back to Supabase Auth email when no override set", async () => {
  const sb = fakeLookupClient({ settingsEmail: null, authEmail: "auth@example.com" });
  const email = await resolveOwnerEmail(sb, "user-1");
  assert.equal(email, "auth@example.com");
});

test("resolveOwnerEmail: returns null when neither source has an email", async () => {
  const sb = fakeLookupClient({ settingsEmail: null, authEmail: null });
  const email = await resolveOwnerEmail(sb, "user-1");
  assert.equal(email, null);
});

test("notifyOwnerOfSubmission: calls the send function with the resolved email and built content", async () => {
  const sb = fakeLookupClient({ settingsEmail: "owner@example.com" });
  const calls: Array<{ to: string; subject: string; html: string }> = [];
  const sendEmail = async (payload: { to: string; subject: string; html: string }) => {
    calls.push(payload);
    return { sent: true };
  };

  const result = await notifyOwnerOfSubmission(
    sb,
    "user-1",
    { kind: "feedback", qrTitle: "Restoran X", type: "suggestion", subject: "Menü" },
    sendEmail
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].to, "owner@example.com");
  assert.equal(calls[0].subject, "Yeni geri bildirim: Restoran X");
  assert.match(calls[0].html, /Menü/);
  assert.deepEqual(result, { sent: true });
});

test("notifyOwnerOfSubmission: skips sending and returns no_email when owner has no resolvable address", async () => {
  const sb = fakeLookupClient({ settingsEmail: null, authEmail: null });
  let called = false;
  const sendEmail = async () => {
    called = true;
    return { sent: true };
  };

  const result = await notifyOwnerOfSubmission(
    sb,
    "user-1",
    { kind: "booking", qrTitle: "Berber Ali", customerName: "Ahmet", appointmentDate: "2026-07-01", appointmentTime: "10:00" },
    sendEmail
  );

  assert.equal(called, false);
  assert.deepEqual(result, { sent: false, reason: "no_email" });
});

test("notifyOwnerOfSubmission: swallows send errors and reports reason 'error' instead of throwing", async () => {
  const sb = fakeLookupClient({ settingsEmail: "owner@example.com" });
  const sendEmail = async () => {
    throw new Error("resend down");
  };

  const result = await notifyOwnerOfSubmission(
    sb,
    "user-1",
    { kind: "menu_order", qrTitle: "Kahve Dükkanı", tableNo: 1, itemCount: 1, subtotal: 10, currency: "TL" },
    sendEmail
  );

  assert.deepEqual(result, { sent: false, reason: "error" });
});
