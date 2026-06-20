export type EnterpriseLocale = "tr" | "en";
export type EnterpriseBillingPreference = "monthly" | "yearly";
export type EnterpriseQuoteCurrency = "TRY";

export type EnterpriseMetricKey =
  | "dynamicQr"
  | "menuQr"
  | "vcardPages"
  | "monthlyScans"
  | "teamMembers"
  | "whiteLabelDomains";

type LocalizedText = Record<EnterpriseLocale, string>;

export type EnterpriseConfiguration = Record<EnterpriseMetricKey, number>;

export type EnterpriseSliderDefinition = {
  key: EnterpriseMetricKey;
  label: LocalizedText;
  description: LocalizedText;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  includedUnits: number;
  unitPriceCents: number;
  badgeUnit: LocalizedText;
  summaryUnit: LocalizedText;
};

type EnterprisePricingConfig = {
  currency: EnterpriseQuoteCurrency;
  annualDiscountPercent: number;
  minimumMonthlyPriceCents: number;
  minimumAnnualPriceCents: number;
  sliders: EnterpriseSliderDefinition[];
  volumeDiscounts: Array<{
    minMonthlySubtotalCents: number;
    discountPercent: number;
  }>;
};

export type EnterpriseSummaryLine = {
  key: EnterpriseMetricKey;
  label: string;
  value: string;
};

export type EnterprisePriceBreakdown = {
  currency: EnterpriseQuoteCurrency;
  monthlyCents: number;
  annualCents: number;
  annualMonthlyEquivalentCents: number;
  annualDiscountPercent: number;
  appliedVolumeDiscountPercent: number;
};

export type EnterprisePricingCopy = {
  badge: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  summaryTitle: LocalizedText;
  monthlyTitle: LocalizedText;
  yearlyTitle: LocalizedText;
  includedTitle: LocalizedText;
  disclaimer: LocalizedText;
  quoteTitle: LocalizedText;
  quoteDescription: LocalizedText;
  quoteButton: LocalizedText;
  quoteSubmitting: LocalizedText;
  quoteSuccess: LocalizedText;
  quoteError: LocalizedText;
  billingLabel: LocalizedText;
  yearlyAdvantage: LocalizedText;
  backToPricing: LocalizedText;
  trustTitle: LocalizedText;
  formFields: {
    fullName: LocalizedText;
    company: LocalizedText;
    email: LocalizedText;
    phone: LocalizedText;
    note: LocalizedText;
  };
};

export type EnterpriseTrustItem = {
  title: LocalizedText;
  text: LocalizedText;
};

const currency = "TRY" as const;

const enterprisePricingConfig: EnterprisePricingConfig = {
  currency,
  annualDiscountPercent: 20,
  minimumMonthlyPriceCents: 210_000,
  minimumAnnualPriceCents: 2_016_000,
  sliders: [
    {
      key: "dynamicQr",
      label: {
        tr: "Dinamik QR sayisi",
        en: "Dynamic QR count",
      },
      description: {
        tr: "Aktif sekilde yoneteceginiz QR hacmi",
        en: "The volume of QR codes you actively manage",
      },
      min: 150,
      max: 3000,
      step: 50,
      defaultValue: 500,
      includedUnits: 150,
      unitPriceCents: 10_000,
      badgeUnit: { tr: "QR", en: "QR" },
      summaryUnit: { tr: "QR", en: "QR" },
    },
    {
      key: "menuQr",
      label: {
        tr: "Menu QR sayisi",
        en: "Menu QR count",
      },
      description: {
        tr: "Sube veya menu bazli kapasite",
        en: "Capacity across branches or menu groups",
      },
      min: 10,
      max: 300,
      step: 10,
      defaultValue: 40,
      includedUnits: 10,
      unitPriceCents: 16_000,
      badgeUnit: { tr: "menu", en: "menus" },
      summaryUnit: { tr: "menu", en: "menus" },
    },
    {
      key: "vcardPages",
      label: {
        tr: "vCard / Multi URL",
        en: "vCard / Multi URL",
      },
      description: {
        tr: "Profil ve mikro landing sayfasi adedi",
        en: "How many profile or micro landing pages you need",
      },
      min: 20,
      max: 500,
      step: 10,
      defaultValue: 80,
      includedUnits: 20,
      unitPriceCents: 8_000,
      badgeUnit: { tr: "sayfa", en: "pages" },
      summaryUnit: { tr: "sayfa", en: "pages" },
    },
    {
      key: "monthlyScans",
      label: {
        tr: "Aylık scan limiti",
        en: "Monthly scan limit",
      },
      description: {
        tr: "Tarama yoğunluğunuza göre kota",
        en: "Quota based on expected scanning intensity",
      },
      min: 100_000,
      max: 2_000_000,
      step: 50_000,
      defaultValue: 300_000,
      includedUnits: 100_000,
      unitPriceCents: 10_000,
      badgeUnit: { tr: "scan", en: "scans" },
      summaryUnit: { tr: "scan", en: "scans" },
    },
    {
      key: "teamMembers",
      label: {
        tr: "Takım / alt hesap",
        en: "Team / sub-accounts",
      },
      description: {
        tr: "Operasyonu yönetecek kullanıcı sayısı",
        en: "How many users will operate the workspace",
      },
      min: 5,
      max: 100,
      step: 5,
      defaultValue: 15,
      includedUnits: 5,
      unitPriceCents: 18_000,
      badgeUnit: { tr: "kullanıcı", en: "users" },
      summaryUnit: { tr: "kullanıcı", en: "users" },
    },
    {
      key: "whiteLabelDomains",
      label: {
        tr: "White-label domain",
        en: "White-label domain",
      },
      description: {
        tr: "Marka veya müşteri başına özel domain",
        en: "Dedicated domains per brand or customer",
      },
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 3,
      includedUnits: 1,
      unitPriceCents: 64_000,
      badgeUnit: { tr: "domain", en: "domains" },
      summaryUnit: { tr: "domain", en: "domains" },
    },
  ],
  volumeDiscounts: [
    { minMonthlySubtotalCents: 900_000, discountPercent: 3 },
    { minMonthlySubtotalCents: 1_500_000, discountPercent: 6 },
  ],
};

export const enterprisePricingCopy: EnterprisePricingCopy = {
  badge: {
    tr: "Kurumsal paket hesaplayıcı",
    en: "Enterprise package calculator",
  },
  title: {
    tr: "İhtiyacınızı belirleyin,\ntahmini paketi anında görün.",
    en: "Define your needs,\nsee the estimated package instantly.",
  },
  description: {
    tr: "Dinamik QR, Menü QR, ekip ve white-label ihtiyaçlarınızı slider ile şekillendirin. Ardından Teklif Al ile satış ekibine hazır özet gönderin.",
    en: "Shape your dynamic QR, menu QR, team, and white-label needs with sliders, then send a ready summary to the sales team with Get Quote.",
  },
  summaryTitle: {
    tr: "Tahmini fiyat özeti",
    en: "Estimated pricing summary",
  },
  monthlyTitle: {
    tr: "Tahmini aylık",
    en: "Estimated monthly",
  },
  yearlyTitle: {
    tr: "Tahmini yıllık",
    en: "Estimated yearly",
  },
  includedTitle: {
    tr: "Dahil özet",
    en: "Included summary",
  },
  disclaimer: {
    tr: "Bu tutar tahmini fiyatlandırmadır. Vergiler, özel entegrasyonlar, SLA ve kurulum ihtiyaçları nihai teklifte netleşir.",
    en: "This amount is an estimate. Taxes, custom integrations, SLA, and setup requirements are finalized in the final quote.",
  },
  quoteTitle: {
    tr: "Teklif bilgileri",
    en: "Quote details",
  },
  quoteDescription: {
    tr: "Bilgilerinizi gönderin, satış ekibimiz seçtiğiniz paket özetiyle birlikte size ulaşsın.",
    en: "Send your details and our sales team will reach out with the package summary you selected.",
  },
  quoteButton: {
    tr: "Teklif Al",
    en: "Get Quote",
  },
  quoteSubmitting: {
    tr: "Gönderiliyor...",
    en: "Submitting...",
  },
  quoteSuccess: {
    tr: "Teklif talebiniz alındı. Satış ekibimiz en kısa sürede sizinle iletişime geçecek.",
    en: "Your quote request has been received. Our sales team will contact you shortly.",
  },
  quoteError: {
    tr: "Teklif talebi gönderilemedi. Lütfen bilgilerinizi kontrol edip yeniden deneyin.",
    en: "The quote request could not be submitted. Please review your details and try again.",
  },
  billingLabel: {
    tr: "Faturalama tercihi",
    en: "Billing preference",
  },
  yearlyAdvantage: {
    tr: "Yıllık — %20 avantaj",
    en: "Yearly - 20% advantage",
  },
  backToPricing: {
    tr: "Fiyatlara dön",
    en: "Back to pricing",
  },
  trustTitle: {
    tr: "Kurumsal teklifte neler hedefleniyor?",
    en: "What does the enterprise quote optimize for?",
  },
  formFields: {
    fullName: { tr: "Ad Soyad", en: "Full name" },
    company: { tr: "Şirket", en: "Company" },
    email: { tr: "E-posta", en: "Email" },
    phone: { tr: "Telefon", en: "Phone" },
    note: { tr: "Not", en: "Note" },
  },
};

export const enterpriseTrustItems: EnterpriseTrustItem[] = [
  {
    title: {
      tr: "Çoklu ekip akışı",
      en: "Multi-team workflow",
    },
    text: {
      tr: "Farklı ekipler, markalar ve alt hesaplar için merkezi yönetim.",
      en: "Centralized management for different teams, brands, and sub-accounts.",
    },
  },
  {
    title: {
      tr: "Yüksek hacimli kullanım",
      en: "High-volume usage",
    },
    text: {
      tr: "Artan QR, scan ve içerik ihtiyaçlarına göre ölçeklenebilir yapı.",
      en: "A scalable setup for growing QR, scan, and content needs.",
    },
  },
  {
    title: {
      tr: "White-label deneyim",
      en: "White-label experience",
    },
    text: {
      tr: "Markanıza özel domain, logo ve müşteri deneyimi.",
      en: "Branded domains, logos, and customer-facing experiences.",
    },
  },
  {
    title: {
      tr: "Öncelikli destek",
      en: "Priority support",
    },
    text: {
      tr: "Kurumsal kullanım senaryolarına uygun hızlı destek ve onboarding.",
      en: "Faster support and onboarding tailored to enterprise usage.",
    },
  },
];

export const ENTERPRISE_QUERY_KEYS: EnterpriseMetricKey[] = [
  "dynamicQr",
  "menuQr",
  "vcardPages",
  "monthlyScans",
  "teamMembers",
  "whiteLabelDomains",
];

export const ENTERPRISE_STORAGE_KEY = "enterprise-pricing-state";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, min: number, step: number) {
  return min + Math.round((value - min) / step) * step;
}

function percentAmount(amount: number, percent: number) {
  return Math.round((amount * percent) / 100);
}

function resolveDiscountPercent(monthlySubtotalCents: number) {
  let applied = 0;
  for (const item of enterprisePricingConfig.volumeDiscounts) {
    if (monthlySubtotalCents >= item.minMonthlySubtotalCents) {
      applied = item.discountPercent;
    }
  }
  return applied;
}

export function getEnterpriseSliderDefinitions() {
  return enterprisePricingConfig.sliders;
}

export function getEnterpriseDefaultConfiguration(): EnterpriseConfiguration {
  return enterprisePricingConfig.sliders.reduce((acc, slider) => {
    acc[slider.key] = slider.defaultValue;
    return acc;
  }, {} as EnterpriseConfiguration);
}

export function normalizeEnterpriseMetric(
  key: EnterpriseMetricKey,
  value: unknown,
  mode: "clamp" | "strict" = "clamp",
) {
  const slider = enterprisePricingConfig.sliders.find((item) => item.key === key);
  if (!slider) {
    throw new Error(`Unknown enterprise metric: ${key}`);
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    if (mode === "strict") {
      throw new Error(`Invalid value for ${key}`);
    }
    return slider.defaultValue;
  }

  const stepped = roundToStep(parsed, slider.min, slider.step);
  const clamped = clamp(stepped, slider.min, slider.max);

  if (mode === "strict" && clamped !== parsed) {
    throw new Error(`Out-of-range value for ${key}`);
  }

  return clamped;
}

export function normalizeEnterpriseConfiguration(
  input: Partial<Record<EnterpriseMetricKey, unknown>>,
  mode: "clamp" | "strict" = "clamp",
): EnterpriseConfiguration {
  return enterprisePricingConfig.sliders.reduce((acc, slider) => {
    acc[slider.key] = normalizeEnterpriseMetric(slider.key, input[slider.key], mode);
    return acc;
  }, {} as EnterpriseConfiguration);
}

export function normalizeEnterpriseBillingPreference(value: unknown): EnterpriseBillingPreference {
  return value === "monthly" ? "monthly" : "yearly";
}

export function parseEnterpriseConfigurationFromSearch(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
) {
  const input = {} as Partial<Record<EnterpriseMetricKey, unknown>>;
  for (const key of ENTERPRISE_QUERY_KEYS) {
    input[key] = searchParams.get(key);
  }
  return normalizeEnterpriseConfiguration(input, "clamp");
}

export function buildEnterpriseSearchParams(
  configuration: EnterpriseConfiguration,
  billingPreference: EnterpriseBillingPreference,
) {
  const params = new URLSearchParams();
  for (const slider of enterprisePricingConfig.sliders) {
    params.set(slider.key, String(configuration[slider.key]));
  }
  params.set("billing", billingPreference);
  return params;
}

export function calculateEnterprisePricing(configuration: EnterpriseConfiguration): EnterprisePriceBreakdown {
  let monthlyCents = enterprisePricingConfig.minimumMonthlyPriceCents;

  for (const slider of enterprisePricingConfig.sliders) {
    const selected = configuration[slider.key];
    const overIncluded = Math.max(0, selected - slider.includedUnits);
    const billableSteps = Math.ceil(overIncluded / slider.step);
    monthlyCents += billableSteps * slider.unitPriceCents;
  }

  const appliedVolumeDiscountPercent = resolveDiscountPercent(monthlyCents);
  if (appliedVolumeDiscountPercent > 0) {
    monthlyCents -= percentAmount(monthlyCents, appliedVolumeDiscountPercent);
  }

  const annualDiscountMultiplier = 100 - enterprisePricingConfig.annualDiscountPercent;
  const annualCents = Math.max(
    enterprisePricingConfig.minimumAnnualPriceCents,
    Math.round((monthlyCents * 12 * annualDiscountMultiplier) / 100),
  );
  const annualMonthlyEquivalentCents = Math.round(annualCents / 12);

  return {
    currency,
    monthlyCents,
    annualCents,
    annualMonthlyEquivalentCents,
    annualDiscountPercent: enterprisePricingConfig.annualDiscountPercent,
    appliedVolumeDiscountPercent,
  };
}

export function formatEnterpriseNumber(value: number, locale: EnterpriseLocale = "tr") {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(value);
}

export function formatEnterpriseCurrency(
  cents: number,
  locale: EnterpriseLocale = "tr",
  currencyCode: EnterpriseQuoteCurrency = currency,
) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function buildEnterpriseSummaryLines(
  configuration: EnterpriseConfiguration,
  locale: EnterpriseLocale,
): EnterpriseSummaryLine[] {
  return enterprisePricingConfig.sliders.map((slider) => {
    const rawValue = configuration[slider.key];
    const value =
      slider.key === "monthlyScans"
        ? `${formatEnterpriseNumber(rawValue, locale)} ${slider.summaryUnit[locale]}`
        : `${formatEnterpriseNumber(rawValue, locale)} ${slider.summaryUnit[locale]}`;

    return {
      key: slider.key,
      label: slider.label[locale],
      value,
    };
  });
}

export function getEnterprisePricingConfig() {
  return enterprisePricingConfig;
}

type ReadonlyURLSearchParams = {
  get(name: string): string | null;
};
