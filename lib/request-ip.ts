type HeaderReader = { get(name: string): string | null };

const IP_PORT_RE = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/;

function parseBoolean(value: string | undefined) {
  if (value == null || value.trim() === "") return null;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

function isTrustedProxyHeaderEnabled() {
  const configured = parseBoolean(process.env.TRUST_PROXY_HEADERS);
  if (configured !== null) return configured;
  return process.env.NODE_ENV !== "development";
}

function cleanIp(value?: string | null) {
  const first = value?.split(",")[0]?.trim() ?? "";
  if (!first) return null;
  const withoutPort = first.match(IP_PORT_RE)?.[1] ?? first;
  const normalized = withoutPort.startsWith("::ffff:") ? withoutPort.slice(7) : withoutPort;
  if (!/^[a-f0-9:.]+$/i.test(normalized)) return null;
  return normalized;
}

export function getClientIp(req: { headers: HeaderReader }) {
  if (!isTrustedProxyHeaderEnabled()) return "unknown";

  return (
    cleanIp(req.headers.get("cf-connecting-ip")) ||
    cleanIp(req.headers.get("x-forwarded-for")) ||
    cleanIp(req.headers.get("x-real-ip")) ||
    "unknown"
  );
}

export function getClientIpFromHeaders(headers: HeaderReader) {
  return getClientIp({ headers });
}
