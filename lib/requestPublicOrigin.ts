import type { NextRequest } from "next/server";
import { getPublicAppOrigin } from "@/lib/publicOrigin";

function forwardedHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

export function getRequestPublicOrigin(req: NextRequest) {
  const forwardedHost = forwardedHeaderValue(req.headers.get("x-forwarded-host"));
  const forwardedProto = forwardedHeaderValue(req.headers.get("x-forwarded-proto")) || "https";
  const host = forwardedHost || forwardedHeaderValue(req.headers.get("host"));

  const forwardedOrigin = host ? `${forwardedProto}://${host}` : "";
  return getPublicAppOrigin(forwardedOrigin || req.nextUrl.origin);
}
