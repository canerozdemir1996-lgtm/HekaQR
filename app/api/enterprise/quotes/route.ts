import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createCustomLemonCheckout, detectCheckoutLocale, LemonConfigError } from "@/lib/billing/lemon-squeezy";
import { sendEnterpriseQuoteNotifications } from "@/lib/enterprise/notifications";
import {
  assertEnterpriseRateLimits,
  buildEnterpriseQuoteNumber,
  createEnterpriseQuotePublicId,
  EnterpriseRateLimitError,
  enterpriseRateLimitConfig,
  getEnterpriseClientIp,
  getEnterpriseSelectedPriceCents,
  hashEnterpriseValue,
  isEnterpriseSelfServeCheckoutEnabled,
  resolveEnterpriseCheckoutPlanKey,
  resolveEnterpriseVariantId,
} from "@/lib/enterprise/quote-service";
import {
  enterpriseQuoteRequestSchema,
  normalizeEnterpriseContact,
  sanitizeEnterpriseBillingPreference,
  sanitizeEnterpriseConfiguration,
} from "@/lib/enterprise/quote-schema";
import { calculateEnterprisePricing } from "@/lib/pricing/enterprise-pricing";
import { sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";

async function getQuoteSequenceValue() {
  const { data, error } = await sbAdmin().rpc("next_enterprise_quote_number");
  if (error) throw new Error(error.message);
  const parsed =
    typeof data === "number"
      ? data
      : typeof data === "string"
        ? Number.parseInt(data, 10)
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error("Enterprise quote sequence could not be generated.");
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = enterpriseQuoteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Teklif talebi doğrulanamadı." }, { status: 400 });
  }

  let configuration;
  try {
    configuration = sanitizeEnterpriseConfiguration(parsed.data.configuration, "strict");
  } catch {
    return NextResponse.json({ error: "Secilen paket limitleri gecersiz." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const contact = normalizeEnterpriseContact(parsed.data.contact);
  const billingPreference = sanitizeEnterpriseBillingPreference(parsed.data.billingPreference);
  const pricing = calculateEnterprisePricing(configuration);
  const ipAddress = getEnterpriseClientIp(req.headers);
  const ipHash = hashEnterpriseValue(ipAddress ?? "unknown");
  const sb = sbAdmin();

  try {
    const [ipResult, emailResult] = await Promise.all([
      sb
        .from("enterprise_quotes")
        .select("id", { count: "exact", head: true })
        .eq("request_ip_hash", ipHash)
        .gte(
          "created_at",
          new Date(Date.now() - enterpriseRateLimitConfig.ipWindowMinutes * 60 * 1000).toISOString(),
        ),
      sb
        .from("enterprise_quotes")
        .select("id", { count: "exact", head: true })
        .eq("email", contact.email)
        .gte(
          "created_at",
          new Date(Date.now() - enterpriseRateLimitConfig.emailWindowMinutes * 60 * 1000).toISOString(),
        ),
    ]);

    if (ipResult.error) throw new Error(ipResult.error.message);
    if (emailResult.error) throw new Error(emailResult.error.message);

    assertEnterpriseRateLimits({
      ipCount: ipResult.count ?? 0,
      emailCount: emailResult.count ?? 0,
    });
  } catch (error) {
    if (error instanceof EnterpriseRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error("Enterprise quote rate limit lookup failed", {
      email: contact.email,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Teklif talebi şu an oluşturulamıyor." }, { status: 500 });
  }

  const quoteSequence = await getQuoteSequenceValue();
  const quoteNumber = buildEnterpriseQuoteNumber(quoteSequence);
  const publicId = createEnterpriseQuotePublicId();
  const website = parsed.data.website?.trim() ?? "";
  const isSpam = website.length > 0;
  const estimatedSelectedPrice = getEnterpriseSelectedPriceCents(billingPreference, configuration);
  const now = new Date().toISOString();

  const quoteRow = {
    public_id: publicId,
    quote_number: quoteNumber,
    user_id: userId,
    full_name: contact.fullName,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    note: contact.note,
    dynamic_qr: configuration.dynamicQr,
    menu_qr: configuration.menuQr,
    vcard_pages: configuration.vcardPages,
    monthly_scans: configuration.monthlyScans,
    team_members: configuration.teamMembers,
    white_label_domains: configuration.whiteLabelDomains,
    estimated_monthly_price: pricing.monthlyCents,
    estimated_annual_price: pricing.annualCents,
    currency: pricing.currency,
    billing_preference: billingPreference,
    status: isSpam ? "rejected" : "new",
    source: "enterprise_calculator",
    request_ip_hash: ipHash,
    is_spam: isSpam,
    spam_reason: isSpam ? "honeypot" : null,
    created_at: now,
    updated_at: now,
  };

  const { error: insertError } = await sb.from("enterprise_quotes").insert(quoteRow);
  if (insertError) {
    console.error("Enterprise quote insert failed", {
      email: contact.email,
      message: insertError.message,
    });
    return NextResponse.json({ error: "Teklif talebi kaydedilemedi." }, { status: 500 });
  }

  if (isSpam) {
    return NextResponse.json({
      success: true,
      quoteId: publicId,
      quoteNumber,
      pricing: {
        monthly: pricing.monthlyCents,
        annual: pricing.annualCents,
        currency: pricing.currency,
      },
    });
  }

  let checkoutUrl: string | null = null;
  let checkoutError: { message: string; status: number; code: string } | null = null;
  // Self-serve checkout must be tied to a known account so the webhook can
  // provision the Enterprise plan to a real user. Anonymous visitors still get
  // their quote saved + sales notified, but are asked to sign in before paying.
  const requiresAuth = isEnterpriseSelfServeCheckoutEnabled() && !userId;
  if (isEnterpriseSelfServeCheckoutEnabled() && userId) {
    try {
      const variantId = resolveEnterpriseVariantId(billingPreference);
      const checkout = await createCustomLemonCheckout({
        variantId,
        email: contact.email,
        name: contact.fullName,
        locale: detectCheckoutLocale(req.headers.get("accept-language")),
        redirectPath: "/pricing/enterprise?quote=success",
        customPrice: estimatedSelectedPrice,
        customData: {
          user_id: userId,
          quote_id: publicId,
          quote_number: quoteNumber,
          billing_preference: billingPreference,
          plan_key: resolveEnterpriseCheckoutPlanKey(billingPreference),
        },
      });

      checkoutUrl = checkout.url;

      const { error: checkoutUpdateError } = await sb
        .from("enterprise_quotes")
        .update({
          status: "checkout_created",
          checkout_url: checkoutUrl,
          checkout_created_at: new Date().toISOString(),
          provider_variant_id: variantId,
          updated_at: new Date().toISOString(),
        })
        .eq("public_id", publicId);

      if (checkoutUpdateError) {
        console.error("Enterprise quote checkout update failed", {
          quoteNumber,
          message: checkoutUpdateError.message,
        });
      }
    } catch (error) {
      if (error instanceof LemonConfigError) {
        console.error("Enterprise checkout configuration error", {
          quoteNumber,
          message: error.message,
        });
        checkoutError = {
          message: "Ödeme altyapısı şu anda hazır değil. Lütfen daha sonra tekrar deneyin.",
          status: 503,
          code: "billing_not_configured",
        };
      } else {
        console.error("Enterprise checkout creation failed", {
          quoteNumber,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        checkoutError = {
          message: "Güvenli ödeme oturumu hazırlanamadı. Lütfen tekrar deneyin.",
          status: 502,
          code: "provider_checkout_failed",
        };
      }
    }
  }

  sendEnterpriseQuoteNotifications({
    quoteNumber,
    locale: detectCheckoutLocale(req.headers.get("accept-language")),
    fullName: contact.fullName,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    note: contact.note,
    configuration,
    monthlyPriceCents: pricing.monthlyCents,
    annualPriceCents: pricing.annualCents,
    createdAt: now,
    userId,
  }).catch((error) => {
    console.error("Enterprise quote notification failed", {
      quoteNumber,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  });

  // The quote remains saved for sales follow-up, but never report a completed
  // checkout when Lemon Squeezy did not produce a payment URL.
  if (checkoutError) {
    return NextResponse.json(
      { error: checkoutError.message, code: checkoutError.code, quoteId: publicId, quoteNumber },
      { status: checkoutError.status },
    );
  }

  return NextResponse.json({
    success: true,
    quoteId: publicId,
    quoteNumber,
    checkoutUrl,
    requiresAuth,
    loginUrl: requiresAuth ? "/login" : undefined,
    pricing: {
      monthly: pricing.monthlyCents,
      annual: pricing.annualCents,
      currency: pricing.currency,
    },
  });
}
