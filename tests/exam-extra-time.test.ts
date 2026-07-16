import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExamExtraTimeEvent,
  currentExamExtraTime,
  examDeadline,
  examRemainingSeconds,
  isExamDeadlineExpired,
} from "../lib/exam-extra-time";

test("exam deadline includes participant extra time", () => {
  assert.equal(examDeadline({
    startedAt: "2026-07-16T10:00:00.000Z",
    timeLimitMinutes: 20,
    extraTimeMinutes: 10,
  }), "2026-07-16T10:30:00.000Z");
});

test("unlimited exams do not receive a deadline", () => {
  assert.equal(examDeadline({ startedAt: "2026-07-16T10:00:00.000Z", timeLimitMinutes: 0, extraTimeMinutes: 30 }), null);
});

test("latest audit event determines current extra time", () => {
  const events = [
    { answer: buildExamExtraTimeEvent({ minutes: 10, reason: "İlk düzenleme", actorId: "owner", now: new Date("2026-07-16T10:00:00Z") }), created_at: "2026-07-16T10:00:00Z" },
    { answer: buildExamExtraTimeEvent({ minutes: 25, previousMinutes: 10, reason: "Resmî ek süre", actorId: "owner", now: new Date("2026-07-16T10:05:00Z") }), created_at: "2026-07-16T10:05:00Z" },
  ];
  assert.equal(currentExamExtraTime(events)?.minutes, 25);
  assert.equal(currentExamExtraTime(events)?.previousMinutes, 10);
});

test("remaining time and expiry use server deadline with grace", () => {
  const deadline = "2026-07-16T10:30:00.000Z";
  assert.equal(examRemainingSeconds(deadline, new Date("2026-07-16T10:29:00Z")), 60);
  assert.equal(isExamDeadlineExpired(deadline, new Date("2026-07-16T10:30:10Z"), 15), false);
  assert.equal(isExamDeadlineExpired(deadline, new Date("2026-07-16T10:30:16Z"), 15), true);
});

test("extra time is bounded to four hours", () => {
  const event = buildExamExtraTimeEvent({ minutes: 999, reason: "İstisna", actorId: "owner" });
  assert.equal(event.minutes, 240);
});
