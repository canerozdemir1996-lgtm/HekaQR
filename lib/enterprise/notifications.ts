import {
  buildEnterpriseSummaryLines,
  formatEnterpriseCurrency,
  type EnterpriseConfiguration,
} from "@/lib/pricing/enterprise-pricing";

type EnterpriseNotificationInput = {
  quoteNumber: string;
  locale?: "tr" | "en";
  fullName: string;
  company: string;
  email: string;
  phone: string;
  note: string | null;
  configuration: EnterpriseConfiguration;
  monthlyPriceCents: number;
  annualPriceCents: number;
  createdAt: string;
  userId?: string | null;
};

export async function sendEnterpriseQuoteNotifications(input: EnterpriseNotificationInput) {
  const salesEmail = process.env.SALES_NOTIFICATION_EMAIL?.trim();
  if (!salesEmail) {
    return { delivered: false, reason: "missing_sales_notification_email" as const };
  }

  const locale = input.locale ?? "tr";
  const summary = buildEnterpriseSummaryLines(input.configuration, locale)
    .map((item) => `${item.label}: ${item.value}`)
    .join(" | ");

  console.info("Enterprise quote notification queued", {
    salesEmail,
    quoteNumber: input.quoteNumber,
    fullName: input.fullName,
    company: input.company,
    email: input.email,
    phone: input.phone,
    note: input.note,
    summary,
    monthly: formatEnterpriseCurrency(input.monthlyPriceCents, locale),
    annual: formatEnterpriseCurrency(input.annualPriceCents, locale),
    createdAt: input.createdAt,
    userId: input.userId ?? null,
  });

  return { delivered: false, reason: "notification_stubbed" as const };
}
