import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendSmtpEmail } from "@/lib/email/smtp";
import { RATE_LIMITS, checkRateLimit, clientIp, tooManyRequestsResponse } from "@/lib/rateLimit";
import { randomUUID } from "node:crypto";
import {
  ContactBodyTooLargeError,
  canonicalContactAttachmentName,
  contactAttachmentMatchesMime,
  normalizeContactAttachmentMime,
  readContactBodyWithLimit,
} from "@/lib/contact-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_MULTIPART_BODY_BYTES = MAX_TOTAL_ATTACHMENT_BYTES + 512 * 1024;

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(200).optional(),
  kind: z.enum(["contact", "support"]).default("contact"),
  category: z.string().trim().max(80).optional(),
  priority: z.enum(["Düşük", "Normal", "Yüksek", "Acil"]).optional(),
});

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

async function parseContactRequest(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return { body: await req.json().catch(() => null), files: [] as File[] };
  }

  const rawBody = await readContactBodyWithLimit(req.body, MAX_MULTIPART_BODY_BYTES);
  const form = await new Response(rawBody, { headers: { "content-type": contentType } }).formData().catch(() => null);
  if (!form) return { body: null, files: [] as File[] };

  const stringValue = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : undefined;
  };

  return {
    body: {
      name: stringValue("name"),
      email: stringValue("email"),
      subject: stringValue("subject"),
      message: stringValue("message"),
      website: stringValue("website"),
      kind: stringValue("kind"),
      category: stringValue("category"),
      priority: stringValue("priority"),
    },
    files: form.getAll("attachments").filter((value): value is File => typeof value !== "string"),
  };
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`contact:${ip}`, RATE_LIMITS.CONTACT.max, RATE_LIMITS.CONTACT.windowMs)) return tooManyRequestsResponse();

  const isMultipart = req.headers.get("content-type")?.toLowerCase().includes("multipart/form-data");
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (isMultipart && Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BODY_BYTES) {
    return NextResponse.json({ error: "Toplam istek boyutu 10 MB sınırını aşıyor." }, { status: 413 });
  }

  let requestData: Awaited<ReturnType<typeof parseContactRequest>>;
  try {
    requestData = await parseContactRequest(req);
  } catch (error) {
    if (error instanceof ContactBodyTooLargeError) {
      return NextResponse.json({ error: "Toplam istek boyutu 10 MB sınırını aşıyor." }, { status: 413 });
    }
    throw error;
  }
  const { body, files } = requestData;
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Lütfen tüm alanları geçerli biçimde doldurun." }, { status: 400 });

  const { name, email, subject, message, website, kind, category, priority } = parsed.data;
  if (website?.trim()) return NextResponse.json({ ok: true });

  if (files.length > MAX_ATTACHMENTS) {
    return NextResponse.json({ error: `En fazla ${MAX_ATTACHMENTS} dosya ekleyebilirsiniz.` }, { status: 400 });
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (files.some((file) => file.size > MAX_ATTACHMENT_BYTES) || totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "Her dosya en fazla 5 MB, toplam ek boyutu en fazla 10 MB olabilir." }, { status: 400 });
  }
  const typedFiles = files.map((file) => ({ file, contentType: normalizeContactAttachmentMime(file.type) }));
  if (typedFiles.some(({ contentType }) => !contentType)) {
    return NextResponse.json({ error: "Yalnızca JPG, PNG, WEBP, PDF veya TXT dosyaları eklenebilir." }, { status: 400 });
  }

  const reference = kind === "support" ? `SUP-${randomUUID().slice(0, 8).toUpperCase()}` : null;
  const normalizedSubject = subject.replace(/[\r\n]+/g, " ");
  const mailSubject = kind === "support"
    ? `[Destek ${reference}] [${category || "Genel"}/${priority || "Normal"}] ${normalizedSubject}`
    : `[İletişim] ${normalizedSubject}`;
  const attachmentCandidates = await Promise.all(typedFiles.map(async ({ file, contentType }) => ({
    file,
    content: Buffer.from(await file.arrayBuffer()),
    contentType: contentType!,
  })));
  if (attachmentCandidates.some((attachment) => !contactAttachmentMatchesMime(attachment.content, attachment.contentType))) {
    return NextResponse.json({ error: "Ek dosyanın içeriği bildirilen dosya türüyle eşleşmiyor." }, { status: 400 });
  }
  const attachments = attachmentCandidates.map(({ file, content, contentType }) => ({
    filename: canonicalContactAttachmentName(file.name, contentType),
    content,
    contentType,
  }));

  const result = await sendSmtpEmail({
    to: "contact@qrpublish.com",
    subject: mailSubject,
    replyTo: email,
    attachments,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a"><h1>${kind === "support" ? "Yeni destek talebi" : "Yeni iletişim mesajı"}</h1>${reference ? `<p><strong>Talep No:</strong> ${escapeHtml(reference)}</p>` : ""}<p><strong>Ad:</strong> ${escapeHtml(name)}</p><p><strong>E-posta:</strong> ${escapeHtml(email)}</p>${category ? `<p><strong>Kategori:</strong> ${escapeHtml(category)}</p>` : ""}${priority ? `<p><strong>Öncelik:</strong> ${escapeHtml(priority)}</p>` : ""}<p><strong>Konu:</strong> ${escapeHtml(normalizedSubject)}</p><hr><p style="white-space:pre-wrap">${escapeHtml(message)}</p></body></html>`,
  });

  if (!result.sent) {
    console.error("[contact] email delivery failed");
    return NextResponse.json({ error: "Mesaj şu an gönderilemedi. Lütfen daha sonra tekrar deneyin." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, reference });
}
