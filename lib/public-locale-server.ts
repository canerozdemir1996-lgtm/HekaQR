import { cookies } from "next/headers";
import {
  PUBLIC_LOCALE_COOKIE,
  resolvePublicLocale,
  type PublicLocale,
} from "@/lib/public-locale";

export async function resolveRequestPublicLocale(
  value?: string | string[] | null,
): Promise<PublicLocale> {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === "tr" || normalized === "en") return normalized;

  const cookieStore = await cookies();
  return resolvePublicLocale(undefined, cookieStore.get(PUBLIC_LOCALE_COOKIE)?.value);
}
