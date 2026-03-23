import { createCanvas } from 'canvas'; // npm install canvas
import sharp from 'sharp'; // npm install sharp

/**
 * QR Kodu üzerine logo ekle
 */
export async function addLogoToQR(
  qrBuffer: Buffer, // QR code PNG buffer
  logoUrl: string,
  logoSizePercent: number = 30, // QR kodunun % kaçı
  transparent: boolean = false
): Promise<Buffer> {
  try {
    // QR kodunun bilgilerini al
    const qrMetadata = await sharp(qrBuffer).metadata();
    const qrSize = qrMetadata.width || 512;

    // Logo download ve resize
    const logoResponse = await fetch(logoUrl);
    if (!logoResponse.ok) throw new Error('Logo fetch failed');
    const logoBuffer = await logoResponse.arrayBuffer();

    // Logo boyutu hesapla
    const logoSize = (qrSize * logoSizePercent) / 100;

    // Transparent background ekle
    let logoProcessed = sharp(Buffer.from(logoBuffer));
    
    if (transparent) {
      // Logo'yu resize et ve transparent background'ı koru
      logoProcessed = logoProcessed.resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    } else {
      // Logo'yu white background'la resize et
      logoProcessed = logoProcessed.resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255 },
      });
    }

    const logoResized = await logoProcessed.png().toBuffer();

    // Logo pozisyonu: orta
    const logoX = (qrSize - logoSize) / 2;
    const logoY = (qrSize - logoSize) / 2;

    // Composite: QR + Logo
    const result = await sharp(qrBuffer)
      .composite([
        {
          input: logoResized,
          left: Math.round(logoX),
          top: Math.round(logoY),
        },
      ])
      .png()
      .toBuffer();

    return result;
  } catch (error) {
    console.error('Error adding logo to QR:', error);
    return qrBuffer; // Hata durumunda QR'ı olduğu gibi döndür
  }
}

/**
 * QR Kodu çerçeve (frame) ile dekore et
 */
export async function addFrameToQR(
  qrBuffer: Buffer,
  frameStyle: string,
  qrSize: number = 512
): Promise<Buffer> {
  try {
    const frameConfigs: Record<string, { bgColor: string; borderWidth: number; borderColor: string; borderRadius: number }> = {
      default: { bgColor: '#ffffff', borderWidth: 0, borderColor: '#000000', borderRadius: 0 },
      professional: { bgColor: '#f8fafc', borderWidth: 4, borderColor: '#1e40af', borderRadius: 8 },
      fun: { bgColor: '#fef3c7', borderWidth: 8, borderColor: '#f59e0b', borderRadius: 16 },
      minimal: { bgColor: '#ffffff', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 4 },
      retro: { bgColor: '#fef3c7', borderWidth: 12, borderColor: '#0f172a', borderRadius: 0 },
    };

    const config = frameConfigs[frameStyle] || frameConfigs.default;
    const borderWidth = config.borderWidth;
    const totalSize = qrSize + borderWidth * 2;

    // Canvas oluştur
    const canvas = createCanvas(totalSize, totalSize);
    const ctx = canvas.getContext('2d');

    // Arka plan
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, totalSize, totalSize);

    // Border
    if (borderWidth > 0) {
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(borderWidth / 2, borderWidth / 2, totalSize - borderWidth, totalSize - borderWidth);
    }

    // QR kodu ortaya yerleştir
    const qrImage = await sharp(qrBuffer).toBuffer();
    const qrCanvas = createCanvas(qrSize, qrSize);
    const qrCtx = qrCanvas.getContext('2d');

    // QR'ı canvas'a çiz
    const imageData = await sharp(qrImage)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // QR'ı frame içine koy
    ctx.drawImage(qrImage as any, borderWidth, borderWidth);

    return Buffer.from(canvas.toBuffer('image/png'));
  } catch (error) {
    console.error('Error adding frame to QR:', error);
    return qrBuffer;
  }
}

/**
 * Tasarım konfigürasyonu uygula
 */
export function applyDesignConfig(designConfig: any): any {
  // qr-code-styling kütüphanesi için options
  return {
    type: 'svg',
    width: designConfig.width || 512,
    data: designConfig.data || '',
    image: designConfig.image || undefined,
    margin: designConfig.margin || 0,
    qrOptions: {
      typeNumber: 0,
      mode: 'Byte',
      errorCorrectionLevel: 'H',
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.4,
      margin: 12,
    },
    dotsOptions: {
      color: designConfig.bodyColor || '#000000',
      type: designConfig.bodyShape || 'square', // dots, square, rounded, extra-rounded, classy, classy-rounded, square-extra-rounded, circle
    },
    cornersSquareOptions: {
      color: designConfig.cornerColor || '#000000',
      type: designConfig.cornerShape || 'square', // square, dot, extra-rounded
    },
    cornersDotsOptions: {
      color: designConfig.cornerColor || '#000000',
      type: designConfig.cornerShape || 'dot',
    },
    backgroundOptions: {
      color: designConfig.backgroundColor || '#ffffff',
    },
  };
}
