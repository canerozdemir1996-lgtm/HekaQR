// ─── QR Code Content Builders ──────────────────────────────────────────────

/**
 * Event QR Code - iCal format
 */
export function buildEventQrContent(event: {
  title: string;
  description?: string;
  startDate: string; // ISO 8601
  endDate?: string;
  location?: string;
}) {
  const formatDate = (date: string) => date.replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HekaQR//QR Code Generator//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(event.startDate)}`,
  ];

  if (event.endDate) lines.push(`DTEND:${formatDate(event.endDate)}`);
  lines.push(`SUMMARY:${event.title}`);
  if (event.description) lines.push(`DESCRIPTION:${event.description}`);
  if (event.location) lines.push(`LOCATION:${event.location}`);
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Location QR Code - Google Maps URL
 */
export function buildLocationQrContent(location: {
  latitude: number;
  longitude: number;
  title?: string;
}) {
  const query = location.title || `${location.latitude},${location.longitude}`;
  return `https://maps.google.com?q=${encodeURIComponent(query)}`;
}

/**
 * Coupon QR Code - vCard-like coupon format
 */
export function buildCouponQrContent(coupon: {
  code: string;
  discount: string;
  validUntil?: string;
  description?: string;
}) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${coupon.discount} İndirim`,
    `NOTE:Kod: ${coupon.code}`,
  ];
  if (coupon.description) lines.push(`DESCRIPTION:${coupon.description}`);
  if (coupon.validUntil) lines.push(`RELATED:${coupon.validUntil}`);
  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Feedback QR Code - form URL builder
 */
export function buildFeedbackQrContent(feedbackUrl: string) {
  return feedbackUrl;
}

/**
 * GS1 QR Code (Product) - barcode format
 */
export function buildGS1QrContent(product: {
  gtin: string; // Global Trade Item Number
  serialNumber?: string;
  batchNumber?: string;
}) {
  // GS1 format: (01)gtin(21)serialnumber(10)batch
  let content = `(01)${product.gtin}`;
  if (product.serialNumber) content += `(21)${product.serialNumber}`;
  if (product.batchNumber) content += `(10)${product.batchNumber}`;
  return content;
}

/**
 * Menu QR Code - simple HTML menu
 */
export function buildMenuQrHtml(menu: {
  title: string;
  items: Array<{ name: string; price?: string; description?: string }>;
  businessName?: string;
}) {
  const itemsHtml = menu.items
    .map(
      (item) =>
        `<div style="margin-bottom:12px; border-bottom:1px solid #ddd; padding-bottom:8px;">
        <strong>${item.name}</strong> ${item.price ? `<span style="float:right;">${item.price}</span>` : ''}
        ${item.description ? `<div style="font-size:12px; color:#666;">${item.description}</div>` : ''}
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${menu.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #f5f5f5; }
    .container { max-width: 400px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { text-align: center; color: #333; }
    .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${menu.title}</h1>
    ${menu.businessName ? `<p class="subtitle">${menu.businessName}</p>` : ''}
    ${itemsHtml}
  </div>
</body>
</html>`;
}

/**
 * Audio QR Code - M3U playlist format
 */
export function buildAudioQrContent(audioUrls: string[]) {
  const lines = ['#EXTM3U'];
  audioUrls.forEach((url, i) => {
    lines.push(`#EXTINF:-1,Track ${i + 1}`);
    lines.push(url);
  });
  return lines.join('\n');
}

/**
 * Validate dynamic content
 */
export function validateDynamicContent(
  qrType: string,
  content: any
): { valid: boolean; error?: string } {
  if (!qrType || !content) {
    return { valid: false, error: 'QR type and content are required' };
  }

  switch (qrType) {
    case 'url':
      if (!content.target_url || typeof content.target_url !== 'string') {
        return { valid: false, error: 'Invalid URL' };
      }
      try {
        new URL(content.target_url);
      } catch {
        return { valid: false, error: 'Invalid URL format' };
      }
      return { valid: true };

    case 'event':
      if (!content.title || !content.startDate) {
        return { valid: false, error: 'Event title and start date required' };
      }
      return { valid: true };

    case 'location':
      if (!content.latitude || !content.longitude) {
        return { valid: false, error: 'Latitude and longitude required' };
      }
      return { valid: true };

    case 'coupon':
      if (!content.code || !content.discount) {
        return { valid: false, error: 'Coupon code and discount required' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}
