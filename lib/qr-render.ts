import QRCode from "qrcode";
import sharp from "sharp";

export type DotType = "square" | "rounded" | "extra-rounded" | "dots" | "classy" | "classy-rounded";
export type EyeFrameType = "square" | "extra-rounded" | "dot" | "dots" | "rounded" | "classy" | "classy-rounded";
export type EyeDotType = "square" | "dot" | "dots" | "rounded" | "extra-rounded" | "classy" | "classy-rounded";
export type ErrorCorrection = "L" | "M" | "Q" | "H";

export type StyleConfig = {
  dotType?: DotType;
  dotColor?: string;
  useGradient?: boolean;
  gradientType?: "linear" | "radial";
  gradientAngle?: number;
  color1?: string;
  color2?: string;
  eyeFrameType?: EyeFrameType;
  eyeDotType?: EyeDotType;
  eyeColor?: string;
  useCustomEyeColor?: boolean;
  bgColor?: string;
  bgTransparent?: boolean;
  margin?: number;
  ecLevel?: ErrorCorrection;
  logoSize?: number;
  savedLogoData?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function asConfig(config: unknown): StyleConfig {
  return config && typeof config === "object" ? (config as StyleConfig) : {};
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

function color(value: unknown, fallback: string) {
  return isHexColor(value) ? value : fallback;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isFinder(row: number, col: number, count: number) {
  const inTop = row < 7;
  const inLeft = col < 7;
  const inRight = col >= count - 7;
  const inBottom = row >= count - 7;
  return (inTop && inLeft) || (inTop && inRight) || (inBottom && inLeft);
}

function roundedRect(x: number, y: number, w: number, h: number, fill: string, radius = 0) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${fill}"/>`;
}

function dotSvg(type: DotType, x: number, y: number, u: number, fill: string, row: number, col: number) {
  if (type === "dots") {
    const r = u * 0.42;
    return `<circle cx="${x + u / 2}" cy="${y + u / 2}" r="${r}" fill="${fill}"/>`;
  }

  if (type === "classy") {
    const r = u * 0.35;
    const tl = (row + col) % 2 === 0 ? r : 0;
    const br = (row + col) % 2 === 0 ? 0 : r;
    return `<path d="M${x + tl} ${y}H${x + u}V${y + u - br}Q${x + u} ${y + u} ${x + u - br} ${y + u}H${x}V${y + tl}Q${x} ${y} ${x + tl} ${y}Z" fill="${fill}"/>`;
  }

  const radius =
    type === "square" ? 0 :
    type === "rounded" ? u * 0.22 :
    type === "classy-rounded" ? u * 0.34 :
    u * 0.45;

  return roundedRect(x, y, u, u, fill, radius);
}

// Tek bir göz blogu (cerceve halkasi veya merkez top) icin sekil ciz —
// dotSvg ile ayni sekil kelimesini (square/rounded/.../dot) paylasir, boylece
// stüdyo editöründeki qr-code-styling secimleriyle gorsel olarak eslesir.
function eyeBlockSvg(type: EyeFrameType | EyeDotType, x: number, y: number, size: number, fill: string) {
  if (type === "dot" || type === "dots") {
    return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${fill}"/>`;
  }
  if (type === "classy") {
    const r = size * 0.32;
    return `<path d="M${x + r} ${y}H${x + size}V${y + size - r}Q${x + size} ${y + size} ${x + size - r} ${y + size}H${x}V${y + r}Q${x} ${y} ${x + r} ${y}Z" fill="${fill}"/>`;
  }
  const radius =
    type === "square" ? 0 :
    type === "rounded" ? size * 0.22 :
    type === "classy-rounded" ? size * 0.34 :
    size * 0.45; // extra-rounded
  return roundedRect(x, y, size, size, fill, radius);
}

function roundedRectPath(x: number, y: number, w: number, h: number, radius = 0) {
  const r = clamp(radius, 0, Math.min(w, h) / 2);
  if (r <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return [
    `M${x + r} ${y}`,
    `H${x + w - r}`,
    `Q${x + w} ${y} ${x + w} ${y + r}`,
    `V${y + h - r}`,
    `Q${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `H${x + r}`,
    `Q${x} ${y + h} ${x} ${y + h - r}`,
    `V${y + r}`,
    `Q${x} ${y} ${x + r} ${y}`,
    "Z",
  ].join("");
}

function circlePath(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
}

function eyeFrameSvg(type: EyeFrameType, x: number, y: number, outer: number, unit: number, fill: string) {
  const mid = 5 * unit;
  const innerX = x + unit;
  const innerY = y + unit;

  if (type === "dot" || type === "dots") {
    const cx = x + outer / 2;
    const cy = y + outer / 2;
    return `<path d="${circlePath(cx, cy, outer / 2)}${circlePath(cx, cy, mid / 2)}" fill="${fill}" fill-rule="evenodd"/>`;
  }

  const radius =
    type === "square" ? 0 :
    type === "rounded" ? outer * 0.16 :
    type === "classy" ? outer * 0.20 :
    type === "classy-rounded" ? outer * 0.28 :
    outer * 0.32;
  const innerRadius = radius > 0 ? Math.max(0, radius - unit) : 0;
  const path = `${roundedRectPath(x, y, outer, outer, radius)}${roundedRectPath(innerX, innerY, mid, mid, innerRadius)}`;
  return `<path d="${path}" fill="${fill}" fill-rule="evenodd"/>`;
}

function eyeSvg(
  x: number,
  y: number,
  u: number,
  frameType: EyeFrameType,
  dotType: EyeDotType,
  eyeColor: string,
) {
  const outer = 7 * u;
  const inner = 3 * u;
  const parts: string[] = [];

  parts.push(eyeFrameSvg(frameType, x, y, outer, u, eyeColor));
  parts.push(eyeBlockSvg(dotType, x + 2 * u, y + 2 * u, inner, eyeColor));

  return parts.join("");
}

function gradientDefs(cfg: StyleConfig, size: number) {
  if (!cfg.useGradient) return "";
  const color1 = color(cfg.color1, "#6366f1");
  const color2 = color(cfg.color2, "#ec4899");

  if (cfg.gradientType === "radial") {
    return `<radialGradient id="dotsGradient" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></radialGradient>`;
  }

  const angle = ((typeof cfg.gradientAngle === "number" ? cfg.gradientAngle : 135) * Math.PI) / 180;
  const cx = size / 2;
  const cy = size / 2;
  const dx = Math.cos(angle) * size * 0.55;
  const dy = Math.sin(angle) * size * 0.55;
  return `<linearGradient id="dotsGradient" gradientUnits="userSpaceOnUse" x1="${cx - dx}" y1="${cy - dy}" x2="${cx + dx}" y2="${cy + dy}"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient>`;
}

export function renderStyledSvg(payload: string, rawConfig: unknown, size: number) {
  const cfg = asConfig(rawConfig);
  const dotType = cfg.dotType ?? "square";
  const eyeFrameType = cfg.eyeFrameType ?? "square";
  const eyeDotType = cfg.eyeDotType ?? "square";
  const dotFill = cfg.useGradient ? "url(#dotsGradient)" : color(cfg.dotColor, "#0f172a");
  const eyeFill = color(cfg.useCustomEyeColor ? cfg.eyeColor : (cfg.useGradient ? cfg.color1 : cfg.dotColor), "#0f172a");
  const isTransparent = cfg.bgTransparent === true;
  const bgFill = isTransparent ? "transparent" : color(cfg.bgColor, "#ffffff");
  const matrix = (QRCode as unknown as {
    create: (data: string, options: { errorCorrectionLevel: ErrorCorrection }) => {
      modules: { size: number; get: (row: number, col: number) => number };
    };
  }).create(payload, { errorCorrectionLevel: "H" });
  const count = matrix.modules.size;
  const minQuietZone = Math.ceil((size / count) * 4);
  const margin = clamp(typeof cfg.margin === "number" ? cfg.margin : 24, minQuietZone, Math.floor(size * 0.18));
  const unit = (size - margin * 2) / count;
  const parts: string[] = [];
  const defs = gradientDefs(cfg, size);

  parts.push(roundedRect(0, 0, size, size, bgFill));

  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!matrix.modules.get(row, col) || isFinder(row, col, count)) continue;
      parts.push(dotSvg(dotType, margin + col * unit, margin + row * unit, unit, dotFill, row, col));
    }
  }

  parts.push(eyeSvg(margin, margin, unit, eyeFrameType, eyeDotType, eyeFill));
  parts.push(eyeSvg(margin + (count - 7) * unit, margin, unit, eyeFrameType, eyeDotType, eyeFill));
  parts.push(eyeSvg(margin, margin + (count - 7) * unit, unit, eyeFrameType, eyeDotType, eyeFill));

  if (typeof cfg.savedLogoData === "string" && cfg.savedLogoData.startsWith("data:image/")) {
    const logoSize = size * clamp(typeof cfg.logoSize === "number" ? cfg.logoSize : 0.22, 0.10, 0.24);
    const pad = Math.max(10, logoSize * 0.18);
    const backing = logoSize + pad * 2;
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;
    const backingX = (size - backing) / 2;
    const backingY = (size - backing) / 2;
    parts.push(roundedRect(backingX, backingY, backing, backing, bgFill, backing * 0.22));
    parts.push(`<image href="${escapeXml(cfg.savedLogoData)}" x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR Code">${defs ? `<defs>${defs}</defs>` : ""}${parts.join("")}</svg>`;
}

export async function renderQrPngBuffer(payload: string, rawConfig: unknown, size: number) {
  const svg = renderStyledSvg(payload, rawConfig, size);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
