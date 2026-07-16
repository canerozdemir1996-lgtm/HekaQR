export const EXAM_EXTRA_TIME_EVENT_QUESTION_ID = "__system_extra_time__";
export const MAX_EXAM_EXTRA_TIME_MINUTES = 240;

export type ExamExtraTimeEvent = {
  minutes: number;
  previousMinutes: number;
  reason: string;
  actorId: string;
  grantedAt: string;
};

function boundedMinutes(value: unknown) {
  const minutes = Math.round(Number(value));
  if (!Number.isFinite(minutes)) return 0;
  return Math.max(0, Math.min(MAX_EXAM_EXTRA_TIME_MINUTES, minutes));
}

export function normalizeExamExtraTimeEvent(value: unknown): ExamExtraTimeEvent | null {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : null;
  if (!raw) return null;
  const grantedAt = new Date(String(raw.grantedAt ?? ""));
  return {
    minutes: boundedMinutes(raw.minutes),
    previousMinutes: boundedMinutes(raw.previousMinutes),
    reason: String(raw.reason ?? "").trim().slice(0, 500),
    actorId: String(raw.actorId ?? "").trim().slice(0, 160),
    grantedAt: Number.isNaN(+grantedAt) ? new Date(0).toISOString() : grantedAt.toISOString(),
  };
}

export function currentExamExtraTime(events: Array<{ answer?: unknown; created_at?: string | null }> | null | undefined) {
  const normalized = (events ?? [])
    .map(event => ({ value: normalizeExamExtraTimeEvent(event.answer), createdAt: String(event.created_at ?? "") }))
    .filter((event): event is { value: ExamExtraTimeEvent; createdAt: string } => Boolean(event.value))
    .sort((a, b) => Date.parse(b.createdAt || b.value.grantedAt) - Date.parse(a.createdAt || a.value.grantedAt));
  return normalized[0]?.value ?? null;
}

export function buildExamExtraTimeEvent(input: {
  minutes: unknown;
  previousMinutes?: unknown;
  reason: unknown;
  actorId: string;
  now?: Date;
}): ExamExtraTimeEvent {
  return {
    minutes: boundedMinutes(input.minutes),
    previousMinutes: boundedMinutes(input.previousMinutes),
    reason: String(input.reason ?? "").trim().slice(0, 500),
    actorId: String(input.actorId ?? "").trim().slice(0, 160),
    grantedAt: (input.now ?? new Date()).toISOString(),
  };
}

export function examDeadline(input: {
  startedAt: string | Date;
  timeLimitMinutes: number;
  extraTimeMinutes?: number;
}) {
  const startedAt = new Date(input.startedAt);
  const baseMinutes = Math.max(0, Number(input.timeLimitMinutes) || 0);
  if (Number.isNaN(+startedAt) || baseMinutes === 0) return null;
  const extraMinutes = boundedMinutes(input.extraTimeMinutes);
  return new Date(+startedAt + (baseMinutes + extraMinutes) * 60_000).toISOString();
}

export function examRemainingSeconds(deadlineAt: string | null, now = new Date()) {
  if (!deadlineAt) return 0;
  const deadline = new Date(deadlineAt);
  if (Number.isNaN(+deadline)) return 0;
  return Math.max(0, Math.ceil((+deadline - +now) / 1000));
}

export function isExamDeadlineExpired(deadlineAt: string | null, now = new Date(), graceSeconds = 15) {
  if (!deadlineAt) return false;
  const deadline = new Date(deadlineAt);
  if (Number.isNaN(+deadline)) return false;
  return +now > +deadline + Math.max(0, graceSeconds) * 1000;
}
