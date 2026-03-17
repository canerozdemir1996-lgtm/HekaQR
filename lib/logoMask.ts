export interface LogoMaskOptions {
  source: File | string;
  canvasSize?: number;
  logoRatio?: number;
  shadowBlur?: number;
  shape?: "circle" | "square" | "rounded";
  size?: number; // 0.1–0.5, overrides imageSize in QR
}

function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    } else {
      img.crossOrigin = "anonymous";
      img.src = source;
    }
  });
}

export async function createLogoMask(opts: LogoMaskOptions): Promise<string> {
  const { source, canvasSize = 400, logoRatio = 0.72, shadowBlur = 6, shape = "circle" } = opts;
  const logoImg = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d")!;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const r = canvasSize / 2 - shadowBlur;

  ctx.clearRect(0, 0, canvasSize, canvasSize);

  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.8)";
  ctx.shadowBlur = shadowBlur;

  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape === "square") {
    const s = r * 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - r, cy - r, s, s);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - r, cy - r, s, s);
    ctx.clip();
  } else {
    // rounded square
    const s = r * 2;
    const rad = r * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - r + rad, cy - r);
    ctx.lineTo(cx + r - rad, cy - r);
    ctx.quadraticCurveTo(cx + r, cy - r, cx + r, cy - r + rad);
    ctx.lineTo(cx + r, cy + r - rad);
    ctx.quadraticCurveTo(cx + r, cy + r, cx + r - rad, cy + r);
    ctx.lineTo(cx - r + rad, cy + r);
    ctx.quadraticCurveTo(cx - r, cy + r, cx - r, cy + r - rad);
    ctx.lineTo(cx - r, cy - r + rad);
    ctx.quadraticCurveTo(cx - r, cy - r, cx - r + rad, cy - r);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - r + rad, cy - r);
    ctx.lineTo(cx + r - rad, cy - r);
    ctx.quadraticCurveTo(cx + r, cy - r, cx + r, cy - r + rad);
    ctx.lineTo(cx + r, cy + r - rad);
    ctx.quadraticCurveTo(cx + r, cy + r, cx + r - rad, cy + r);
    ctx.lineTo(cx - r + rad, cy + r);
    ctx.quadraticCurveTo(cx - r, cy + r, cx - r, cy + r - rad);
    ctx.lineTo(cx - r, cy - r + rad);
    ctx.quadraticCurveTo(cx - r, cy - r, cx - r + rad, cy - r);
    ctx.closePath();
    ctx.clip();
  }

  const maxDim = (r * 2 - shadowBlur) * logoRatio;
  const scale = Math.min(maxDim / logoImg.naturalWidth, maxDim / logoImg.naturalHeight);
  const lw = logoImg.naturalWidth * scale;
  const lh = logoImg.naturalHeight * scale;
  ctx.drawImage(logoImg, cx - lw / 2, cy - lh / 2, lw, lh);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

// Backwards compat
export async function createLogoWithWhiteCircle(opts: LogoMaskOptions): Promise<string> {
  return createLogoMask({ ...opts, shape: "circle" });
}
export async function createLogoForPrint(source: File | string): Promise<string> {
  return createLogoMask({ source, canvasSize: 800, logoRatio: 0.70, shadowBlur: 10, shape: "circle" });
}
