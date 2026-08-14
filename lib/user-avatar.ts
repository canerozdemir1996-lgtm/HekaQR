export type UserAvatarSource = {
  avatar_url?: unknown;
  profile_image?: unknown;
  image?: unknown;
  picture?: unknown;
  full_name?: unknown;
  name?: unknown;
  email?: unknown;
  user_metadata?: Record<string, unknown> | null;
};

export const USER_AVATAR_UPDATED_EVENT = "qrpublish:user-avatar-updated";

export function notifyUserAvatarUpdated(avatarUrl: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(USER_AVATAR_UPDATED_EVENT, {
    detail: { avatarUrl },
  }));
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function usableAvatarUrl(value: unknown) {
  const raw = cleanString(value);
  if (!raw || raw === "null" || raw === "undefined") return null;
  if (/^(https?:\/\/|data:image\/|\/)/i.test(raw)) return raw;
  return null;
}

export function getUserAvatar(...sources: Array<UserAvatarSource | null | undefined>) {
  for (const source of sources) {
    if (!source) continue;
    const candidates = [
      source.avatar_url,
      source.profile_image,
      source.image,
      source.picture,
      source.user_metadata?.avatar_url,
      source.user_metadata?.picture,
      source.user_metadata?.profile_image,
    ];

    for (const candidate of candidates) {
      const url = usableAvatarUrl(candidate);
      if (url) return url;
    }
  }

  return null;
}

export function getUserInitials(...sources: Array<UserAvatarSource | null | undefined>) {
  for (const source of sources) {
    if (!source) continue;
    const name = cleanString(source.full_name) || cleanString(source.name) || cleanString(source.user_metadata?.full_name) || cleanString(source.user_metadata?.name);
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      const initials = parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
      if (initials) return initials;
    }
  }

  for (const source of sources) {
    const email = cleanString(source?.email);
    if (email) return email[0].toUpperCase();
  }

  return "U";
}

export function shouldShowRoleBadge(role?: string | null) {
  return role === "admin" || role === "owner";
}

export function roleBadgeText(role?: string | null) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "";
}
