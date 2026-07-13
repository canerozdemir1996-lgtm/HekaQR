import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendSmtpEmail } from "@/lib/email/smtp";
import { RATE_LIMITS, checkRateLimit, clientIp, tooManyRequestsResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(200).optional(),
});

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`contact:${ip}`, RATE_LIMITS.CONTACT.max, RATE_LIMITS.CONTACT.windowMs)) return tooManyRequestsResponse();

  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Lutfen tum alanlari gecerli bicimde doldurun." }, { status: 400 });

  const { name, email, subject, message, website } = parsed.data;
  if (website?.trim()) return NextResponse.json({ ok: true });

  const result = await sendSmtpEmail({
    to: "contact@qrpublish.com",
    subject: `[Iletisim] ${subject}`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a"><h1>Yeni iletisim mesaji</h1><p><strong>Ad:</strong> ${escapeHtml(name)}</p><p><strong>E-posta:</strong> ${escapeHtml(email)}</p><p><strong>Konu:</strong> ${escapeHtml(subject)}</p><hr><p style="white-space:pre-wrap">${escapeHtml(message)}</p></body></html>`,
  });

  if (!result.sent) {
    console.error("[contact] email delivery failed");
    return NextResponse.json({ error: "Mesaj su an gonderilemedi. Lutfen daha sonra tekrar deneyin." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
