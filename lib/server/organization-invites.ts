import { randomBytes } from "node:crypto";

export const ORGANIZATION_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createOrganizationInviteToken() {
  return randomBytes(32).toString("hex");
}

const organizationLocks = new Map<string, Promise<void>>();

/**
 * Serializes seat mutations within one running app process. Database-side
 * post-write checks in the routes remain the final safety net when multiple
 * app processes are serving requests.
 */
export async function withOrganizationSeatLock<T>(
  organizationId: string,
  action: () => Promise<T>,
): Promise<T> {
  const previous = organizationLocks.get(organizationId) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.catch(() => undefined).then(() => current);
  organizationLocks.set(organizationId, queued);

  await previous.catch(() => undefined);
  try {
    return await action();
  } finally {
    release();
    if (organizationLocks.get(organizationId) === queued) {
      organizationLocks.delete(organizationId);
    }
  }
}
