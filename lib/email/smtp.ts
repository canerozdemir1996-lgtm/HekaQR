import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number.parseInt(process.env.SMTP_PORT?.trim() || "", 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  if (!host || !Number.isFinite(port) || !user || !pass) return null;
  return { host, port, user, pass, secure: process.env.SMTP_SECURE?.trim() === "true" || port === 465 };
}

function getTransporter() {
  const config = getSmtpConfig();
  if (!config) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
  }
  return transporter;
}

export function isSmtpConfigured() {
  return Boolean(getSmtpConfig());
}

export async function sendSmtpEmail(input: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}) {
  const client = getTransporter();
  if (!client) return { sent: false, reason: "not_configured" as const };

  try {
    await client.sendMail({
      from: process.env.SMTP_FROM_EMAIL?.trim() || "QR Publish <contact@qrpublish.com>",
      to: input.to,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo,
      attachments: input.attachments,
    });
    return { sent: true as const };
  } catch (error) {
    console.error("[smtp] send failed", { message: error instanceof Error ? error.message : "Unknown error" });
    return { sent: false, reason: "send_failed" as const };
  }
}
