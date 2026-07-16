export type PricingLocale = "tr" | "en";
export type BillingCycle = "monthly" | "yearly";
export type PlanKey = "free" | "starter" | "pro" | "enterprise";
export type CurrencyCode = "TRY" | "USD";

type LocalizedText = Record<PricingLocale, string>;
type LocalizedPrice = Record<CurrencyCode, number>;

type PlanPrice = Record<BillingCycle, LocalizedPrice>;

export type PlanDefinition = {
  key: PlanKey;
  highlighted?: boolean;
  custom?: boolean;
  ctaHref: string;
  price?: PlanPrice;
  badge: LocalizedText;
  name: LocalizedText;
  description: LocalizedText;
  caption: LocalizedText;
  ctaLabel: LocalizedText;
  bullets: Array<LocalizedText>;
};

export function normalizePricingPlanKey(value?: string | null): PlanKey {
  const normalized = (value || "").toLowerCase();
  if (normalized === "free" || normalized === "starter" || normalized === "pro" || normalized === "enterprise") {
    return normalized;
  }
  return "pro";
}

export function normalizeBillingCycle(value?: string | null): BillingCycle {
  return value === "monthly" || value === "yearly" ? value : "yearly";
}

export function findPricingPlan(planKey?: string | null) {
  const normalized = normalizePricingPlanKey(planKey);
  return pricingPlans.find((plan) => plan.key === normalized) ?? pricingPlans.find((plan) => plan.key === "pro") ?? pricingPlans[0];
}

export function getPlanCheckoutHref(planKey: PlanKey, billing: BillingCycle) {
  if (planKey === "free") return "/login";
  if (planKey === "enterprise") return "/pricing/enterprise";
  return `/pricing/checkout?plan=${planKey}&billing=${billing}`;
}

export type ComparisonRow = {
  key: string;
  label: LocalizedText;
  values: Record<PlanKey, LocalizedText>;
};

export type TrustItem = {
  title: LocalizedText;
  text: LocalizedText;
};

export type FaqItem = {
  question: LocalizedText;
  answer: LocalizedText;
};

export type EnterpriseSliderKey =
  | "dynamicQr"
  | "menuQr"
  | "vcard"
  | "scans"
  | "team"
  | "domains";

export type EnterpriseSliderConfig = {
  key: EnterpriseSliderKey;
  label: LocalizedText;
  description: LocalizedText;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  included: number;
  unitPrice: LocalizedPrice;
  summaryUnit: LocalizedText;
};

export type EnterpriseQuoteInput = Record<EnterpriseSliderKey, number>;

type EnterpriseSummary = {
  title: LocalizedText;
  text: LocalizedText;
};

export const PRICING_LOCALE_KEY = "pricing-locale";
export const BILLING_CYCLE_KEY = "pricing-billing";

export const localeLabels: Record<PricingLocale, LocalizedText> = {
  tr: { tr: "TR", en: "TR" },
  en: { tr: "EN", en: "EN" },
};

export const currencyByLocale: Record<PricingLocale, CurrencyCode> = {
  tr: "TRY",
  en: "USD",
};

export const pricingPageCopy = {
  navBack: { tr: "Ana sayfa", en: "Home" },
  navPricing: { tr: "Fiyatlandırma", en: "Pricing" },
  navEnterprise: { tr: "Kurumsal", en: "Enterprise" },
  login: { tr: "Giriş Yap", en: "Log In" },
  heroBadge: {
    tr: "Dinamik QR, Menu QR, vCard ve white-label için esnek paketler",
    en: "Flexible plans for dynamic QR, menu QR, vCard, and white-label growth",
  },
  heroTitle: {
    tr: "İhtiyacınıza göre başlayın, büyüdükçe planınızı yükseltin.",
    en: "Start with what you need and upgrade as your QR operation grows.",
  },
  heroText: {
    tr: "Küçük işletmelerden restoran zincirlerine kadar tüm ekipler için net limitler, güçlü analitik ve ölçeklenebilir plan yapısı sunuyoruz.",
    en: "From small businesses to restaurant chains, clear limits and scalable analytics-backed plans for every team.",
  },
  monthly: { tr: "Aylık", en: "Monthly" },
  yearly: { tr: "Yıllık", en: "Yearly" },
  yearlyHint: { tr: "Yıllık ödemede tasarruf edin", en: "Save with annual billing" },
  included: { tr: "Plana dahil", en: "Included in plan" },
  compareTitle: {
    tr: "Plan karşılaştırması",
    en: "Plan comparison",
  },
  compareText: {
    tr: "Her paketin sunduğu yetkileri tek tabloda görün; ihtiyacınız arttığında hangi noktada yükseltme yapmanız gerektiğini netleştirin.",
    en: "See every entitlement in one table and know exactly when it makes sense to upgrade.",
  },
  trustBadge: { tr: "Operasyon güveni", en: "Operational confidence" },
  trustTitle: { tr: "Fiyata sadece kota değil, operasyon güveni de dahil.", en: "Plans include operational confidence, not just quotas." },
  trustText: {
    tr: "Raporlama, destek, güvenlik ve markalama ihtiyaçlarını her seviyede kontrollü şekilde açıyoruz.",
    en: "Reporting, support, security, and branding capabilities expand in a controlled way at every level.",
  },
  faqTitle: { tr: "Sık sorulan sorular", en: "Frequently asked questions" },
  faqText: {
    tr: "Paket yükseltme, para birimi, enterprise teklif ve özellik limitleriyle ilgili en yaygın sorular.",
    en: "The most common questions around upgrades, currencies, enterprise quotes, and feature limits.",
  },
  bottomTitle: {
    tr: "Plan seçmekte zorlanıyorsanız, kurumsal hesaplayıcıyla başlayın.",
    en: "If you are unsure which plan fits, start with the enterprise calculator.",
  },
  bottomText: {
    tr: "QR hacmi, menu sayısı ve white-label ihtiyacınıza göre tahmini paket maliyetini anında görün.",
    en: "Estimate your package instantly based on QR volume, menu count, and white-label needs.",
  },
  bottomCta: { tr: "Kurumsal hesaplayıcıyı aç", en: "Open enterprise calculator" },
  customLabel: { tr: "Özel", en: "Custom" },
  monthSuffix: { tr: "/ ay", en: "/ mo" },
} as const;

export const pricingPlans: PlanDefinition[] = [
  {
    key: "free",
    ctaHref: "/login",
    price: {
      monthly: { USD: 0, TRY: 0 },
      yearly: { USD: 0, TRY: 0 },
    },
    badge: { tr: "Yeni başlayanlar", en: "For first-time users" },
    name: { tr: "Free", en: "Free" },
    description: {
      tr: "Ürünü deneyin, ilk QR akışınızı kurun.",
      en: "Try the product and launch your first QR flow.",
    },
    caption: {
      tr: "İlk giriş yapan kullanıcılar için başlangıç paketi.",
      en: "Starter pack for newly onboarded users.",
    },
    ctaLabel: { tr: "Ücretsiz Başla", en: "Start Free" },
    bullets: [
      { tr: "3 dinamik QR + sınırsız statik QR", en: "3 dynamic QR codes + unlimited static QR" },
      { tr: "1.000 tarama / ay", en: "1,000 scans / month" },
      { tr: "1 vCard veya Multi URL", en: "1 vCard or Multi URL" },
      { tr: "Sınırlı temel raporlama", en: "Limited basic reporting" },
    ],
  },
  {
    key: "starter",
    ctaHref: "/login",
    price: {
      monthly: { USD: 12, TRY: 399 },
      yearly: { USD: 9, TRY: 299 },
    },
    badge: { tr: "Küçük işletme", en: "Small business" },
    name: { tr: "Starter", en: "Starter" },
    description: {
      tr: "Tek marka ya da tek lokasyon için dengeli başlangıç.",
      en: "A balanced entry point for a single brand or location.",
    },
    caption: {
      tr: "İlk sürekli kullanım ve düzenli kampanyalar için.",
      en: "For consistent usage and recurring campaigns.",
    },
    ctaLabel: { tr: "Hemen Başla", en: "Get Started" },
    bullets: [
      { tr: "25 dinamik QR + sınırsız statik QR", en: "25 dynamic QR codes + unlimited static QR" },
      { tr: "25.000 tarama / ay", en: "25,000 scans / month" },
      { tr: "10 vCard / Multi URL", en: "10 vCard / Multi URL pages" },
      { tr: "Menu QR ve temel analitik", en: "Menu QR and basic analytics" },
    ],
  },
  {
    key: "pro",
    highlighted: true,
    ctaHref: "/login",
    price: {
      monthly: { USD: 29, TRY: 949 },
      yearly: { USD: 23, TRY: 749 },
    },
    badge: { tr: "En popüler", en: "Most popular" },
    name: { tr: "Pro", en: "Pro" },
    description: {
      tr: "Restoran, perakende ve büyüyen markalar için ana paket.",
      en: "The core plan for restaurants, retail, and growing brands.",
    },
    caption: {
      tr: "White-label, gelişmiş raporlama ve ekip akışları açılır.",
      en: "Unlock white-label, advanced reporting, and team workflows.",
    },
    ctaLabel: { tr: "Pro'ya Geç", en: "Upgrade to Pro" },
    bullets: [
      { tr: "200 dinamik QR + sınırsız statik QR", en: "200 dynamic QR codes + unlimited static QR" },
      { tr: "250.000 tarama / ay", en: "250,000 scans / month" },
      { tr: "100 vCard / Multi URL", en: "100 vCard / Multi URL pages" },
      { tr: "White-label, bulk ve gelişmiş analitik", en: "White-label, bulk tools, and advanced analytics" },
      { tr: "Retargeting Pixel (Meta/Facebook)", en: "Retargeting Pixel (Meta/Facebook)" },
      { tr: "API erişimi ve webhook entegrasyonu", en: "API access and webhook integration" },
    ],
  },
  {
    key: "enterprise",
    custom: true,
    ctaHref: "/pricing/enterprise",
    badge: { tr: "Özel kurgulama", en: "Custom build" },
    name: { tr: "Enterprise", en: "Enterprise" },
    description: {
      tr: "Kapasiteyi slider mantığıyla belirleyin, tahmini fiyatı anında görün.",
      en: "Scale capacity with sliders and see your estimated price instantly.",
    },
    caption: {
      tr: "Çoklu marka, ekip ve domain ihtiyaçları için esnek model.",
      en: "Flexible model for multi-brand, multi-team, and multi-domain needs.",
    },
    ctaLabel: { tr: "Teklif Al", en: "Get Quote" },
    bullets: [
      { tr: "Özelleştirilebilir dynamic QR hacmi", en: "Customizable dynamic QR volume" },
      { tr: "Menu QR, vCard ve scan slider'ları", en: "Slider-based menu QR, vCard, and scan configuration" },
      { tr: "Çoklu domain ve alt hesap yapısı", en: "Multi-domain and sub-account structure" },
      { tr: "Satış ekibiyle teklif akışı", en: "Quote workflow with sales team" },
    ],
  },
];

export const comparisonRows: ComparisonRow[] = [
  {
    key: "static",
    label: { tr: "Sınırsız statik QR", en: "Unlimited static QR" },
    values: {
      free: { tr: "Sınırsız", en: "Unlimited" },
      starter: { tr: "Sınırsız", en: "Unlimited" },
      pro: { tr: "Sınırsız", en: "Unlimited" },
      enterprise: { tr: "Sınırsız", en: "Unlimited" },
    },
  },
  {
    key: "dynamic",
    label: { tr: "Dinamik QR sayısı", en: "Dynamic QR count" },
    values: {
      free: { tr: "3", en: "3" },
      starter: { tr: "25", en: "25" },
      pro: { tr: "200", en: "200" },
      enterprise: { tr: "Özel", en: "Custom" },
    },
  },
  {
    key: "scans",
    label: { tr: "Aylık analiz edilen tarama", en: "Monthly analyzed scans" },
    values: {
      free: { tr: "1.000", en: "1,000" },
      starter: { tr: "25.000", en: "25,000" },
      pro: { tr: "250.000", en: "250,000" },
      enterprise: { tr: "Özel", en: "Custom" },
    },
  },
  {
    key: "menu",
    label: { tr: "Menu QR", en: "Menu QR" },
    values: {
      free: { tr: "1 temel menü", en: "1 basic menu" },
      starter: { tr: "3 menü", en: "3 menus" },
      pro: { tr: "25 menü", en: "25 menus" },
      enterprise: { tr: "Özel", en: "Custom" },
    },
  },
  {
    key: "vcard",
    label: { tr: "vCard / Multi URL", en: "vCard / Multi URL" },
    values: {
      free: { tr: "1", en: "1" },
      starter: { tr: "10", en: "10" },
      pro: { tr: "100", en: "100" },
      enterprise: { tr: "Özel", en: "Custom" },
    },
  },
  {
    key: "studio",
    label: { tr: "QR tasarım stüdyosu", en: "QR design studio" },
    values: {
      free: { tr: "Temel", en: "Basic" },
      starter: { tr: "Standart", en: "Standard" },
      pro: { tr: "Tam erişim", en: "Full access" },
      enterprise: { tr: "Tam erişim", en: "Full access" },
    },
  },
  {
    key: "bulk",
    label: { tr: "Toplu oluşturma", en: "Bulk generation" },
    values: {
      free: { tr: "Yok", en: "No" },
      starter: { tr: "Sınırlı", en: "Limited" },
      pro: { tr: "Var", en: "Included" },
      enterprise: { tr: "İleri seviye", en: "Advanced" },
    },
  },
  {
    key: "folders",
    label: { tr: "Klasör yönetimi", en: "Folder management" },
    values: {
      free: { tr: "1 klasör", en: "1 folder" },
      starter: { tr: "10 klasör", en: "10 folders" },
      pro: { tr: "Sınırsız", en: "Unlimited" },
      enterprise: { tr: "Sınırsız", en: "Unlimited" },
    },
  },
  {
    key: "analytics",
    label: { tr: "Analitik seviyesi", en: "Analytics level" },
    values: {
      free: { tr: "Temel", en: "Basic" },
      starter: { tr: "Standart", en: "Standard" },
      pro: { tr: "Gelişmiş", en: "Advanced" },
      enterprise: { tr: "Özel raporlama", en: "Custom reporting" },
    },
  },
  {
    key: "whiteLabel",
    label: { tr: "White-label / custom domain", en: "White-label / custom domain" },
    values: {
      free: { tr: "1 kullanıcı", en: "1 user" },
      starter: { tr: "Yok", en: "No" },
      pro: { tr: "1 domain", en: "1 domain" },
      enterprise: { tr: "Çoklu domain", en: "Multiple domains" },
    },
  },
  {
    key: "team",
    label: { tr: "Takım / alt hesap", en: "Team / sub-accounts" },
    values: {
      free: { tr: "Yok", en: "No" },
      starter: { tr: "1 kullanıcı", en: "1 user" },
      pro: { tr: "5 kullanıcı", en: "5 users" },
      enterprise: { tr: "Özel", en: "Custom" },
    },
  },
  {
    key: "integrations",
    label: { tr: "API / webhook / pixel / GTM", en: "API / webhook / pixel / GTM" },
    values: {
      free: { tr: "Yok", en: "No" },
      starter: { tr: "Kısmi", en: "Partial" },
      pro: { tr: "Var", en: "Included" },
      enterprise: { tr: "Özel entegrasyon", en: "Custom integration" },
    },
  },
  {
    key: "support",
    label: { tr: "Destek seviyesi", en: "Support level" },
    values: {
      free: { tr: "Standart", en: "Standard" },
      starter: { tr: "Öncelikli e-posta", en: "Priority email" },
      pro: { tr: "Öncelikli destek", en: "Priority support" },
      enterprise: { tr: "Onboarding + satış", en: "Onboarding + sales" },
    },
  },
];

export const trustItems: TrustItem[] = [
  {
    title: { tr: "Büyümeyle açılan yetkiler", en: "Entitlements that grow with you" },
    text: {
      tr: "Planlar yalnızca sayı limiti değil; raporlama, white-label ve ekip akışlarını da katmanlı açar.",
      en: "Plans scale not only quotas, but also reporting, white-labeling, and team workflows.",
    },
  },
  {
    title: { tr: "Yerel ve uluslararası fiyat gösterimi", en: "Localized and international pricing" },
    text: {
      tr: "Türkçe kullanıcılar TL, İngilizce kullanıcılar USD odaklı bir deneyim görür.",
      en: "Turkish users see TL-focused pricing while English users see USD-focused pricing.",
    },
  },
  {
    title: { tr: "Kurumsal tarafta tahmini maliyet", en: "Estimated enterprise pricing" },
    text: {
      tr: "Enterprise ekranda ihtiyaçlarınızı slider ile arttırıp tahmini maliyeti anında hesaplayabilirsiniz.",
      en: "In enterprise mode you can adjust capacity with sliders and instantly estimate the cost.",
    },
  },
  {
    title: { tr: "Sonradan panel içinden yükseltmeye uygun", en: "Designed for in-product upgrades later" },
    text: {
      tr: "Free ile başlayıp, kullanım arttıkça panel içinden daha üst paketlere taşınabilecek şekilde kurgulanır.",
      en: "Users can start on Free and later move to higher plans from within the product as usage grows.",
    },
  },
];

export const faqItems: FaqItem[] = [
  {
    question: {
      tr: "Free plan kimler için uygun?",
      en: "Who is the Free plan for?",
    },
    answer: {
      tr: "İlk kez giriş yapan ve ürünü denemek isteyen kullanıcılar için uygundur. Limitler bilinçli olarak düşük tutulur.",
      en: "It is suitable for first-time users who want to try the product. Limits are intentionally kept low.",
    },
  },
  {
    question: {
      tr: "Aylık ve yıllık fiyat farkı nasıl çalışıyor?",
      en: "How does monthly vs yearly pricing work?",
    },
    answer: {
      tr: "Yıllık planda aynı yetkileri daha avantajlı aylık karşılıkla görürsünüz. Paket içerikleri değişmez, ödeme yapısı değişir.",
      en: "Yearly billing gives you the same entitlements at a lower effective monthly rate. Features stay the same; billing changes.",
    },
  },
  {
    question: {
      tr: "Enterprise fiyatı neden sabit değil?",
      en: "Why is enterprise pricing not fixed?",
    },
    answer: {
      tr: "Enterprise müşterilerde dinamik QR, Menu QR, takım ve domain ihtiyacı çok farklı olduğundan tahmini hesaplayıcı kullanılır.",
      en: "Enterprise customers vary widely in dynamic QR, menu QR, team, and domain needs, so pricing is estimated with a calculator.",
    },
  },
  {
    question: {
      tr: "Plan yükseltince mevcut QR'lar etkilenir mi?",
      en: "Will my existing QR codes be affected when I upgrade?",
    },
    answer: {
      tr: "Hayır. Yükseltme mevcut QR yayınlarını bozmaz; yalnızca yeni limitler ve ek yetkiler açılır.",
      en: "No. Upgrading does not disrupt existing QR publications; it only unlocks higher limits and additional capabilities.",
    },
  },
];

export const enterpriseCopy = {
  badge: {
    tr: "Kurumsal paket hesaplayıcı",
    en: "Enterprise plan calculator",
  },
  title: {
    tr: "İhtiyacınızı belirleyin, tahmini paketi anında görün.",
    en: "Define your needs and get an instant estimated package.",
  },
  text: {
    tr: "Dynamic QR, Menu QR, ekip ve white-label ihtiyaçlarını slider ile şekillendirin. Ardından Teklif Al ile satış ekibine hazır özet gönderin.",
    en: "Shape dynamic QR, menu QR, team, and white-label needs with sliders, then send a ready summary to sales using Get Quote.",
  },
  summaryTitle: { tr: "Tahmini fiyat özeti", en: "Estimated pricing summary" },
  monthlyLabel: { tr: "Tahmini aylık", en: "Estimated monthly" },
  yearlyLabel: { tr: "Tahmini yıllık", en: "Estimated yearly" },
  includedTitle: { tr: "Dahil özet", en: "Included summary" },
  formTitle: { tr: "Teklif bilgileri", en: "Quote information" },
  formText: {
    tr: "Bu bilgiler şimdilik e-posta taslağı oluşturur. Sonradan panel içi lead akışına taşınabilir.",
    en: "These fields currently create an email draft. They can later be moved into an in-product lead flow.",
  },
  quoteButton: { tr: "Teklif Al", en: "Get Quote" },
  emailSubject: { tr: "Kurumsal paket talebi", en: "Enterprise package request" },
  backToPricing: { tr: "Fiyatlara dön", en: "Back to pricing" },
  trustTitle: { tr: "Kurumsal teklifte neler hedefleniyor?", en: "What does the enterprise quote optimize for?" },
} as const;

export const enterpriseSliders: EnterpriseSliderConfig[] = [
  {
    key: "dynamicQr",
    label: { tr: "Dinamik QR sayısı", en: "Dynamic QR count" },
    description: { tr: "Aktif şekilde yöneteceğiniz QR hacmi", en: "The number of actively managed QR codes" },
    min: 150,
    max: 3000,
    step: 50,
    defaultValue: 500,
    included: 150,
    unitPrice: { USD: 4, TRY: 120 },
    summaryUnit: { tr: "QR", en: "QR" },
  },
  {
    key: "menuQr",
    label: { tr: "Menu QR sayısı", en: "Menu QR count" },
    description: { tr: "Şube veya menu bazlı kapasite", en: "Capacity across menus or branches" },
    min: 10,
    max: 300,
    step: 10,
    defaultValue: 40,
    included: 20,
    unitPrice: { USD: 6, TRY: 180 },
    summaryUnit: { tr: "menu", en: "menus" },
  },
  {
    key: "vcard",
    label: { tr: "vCard / Multi URL", en: "vCard / Multi URL" },
    description: { tr: "Profil ve mikro landing sayfası adedi", en: "Number of profile and micro landing pages" },
    min: 20,
    max: 500,
    step: 10,
    defaultValue: 80,
    included: 50,
    unitPrice: { USD: 3, TRY: 90 },
    summaryUnit: { tr: "sayfa", en: "pages" },
  },
  {
    key: "scans",
    label: { tr: "Aylık scan limiti", en: "Monthly scan limit" },
    description: { tr: "Tarama yoğunluğunuza göre kota", en: "Quota based on scanning intensity" },
    min: 100000,
    max: 2000000,
    step: 50000,
    defaultValue: 300000,
    included: 100000,
    unitPrice: { USD: 2, TRY: 60 },
    summaryUnit: { tr: "50K scan", en: "50K scans" },
  },
  {
    key: "team",
    label: { tr: "Takım / alt hesap", en: "Team / sub-accounts" },
    description: { tr: "Operasyonu yönetecek kullanıcı sayısı", en: "How many users will manage the operation" },
    min: 5,
    max: 100,
    step: 5,
    defaultValue: 15,
    included: 5,
    unitPrice: { USD: 5, TRY: 150 },
    summaryUnit: { tr: "kullanıcı", en: "users" },
  },
  {
    key: "domains",
    label: { tr: "White-label domain", en: "White-label domains" },
    description: { tr: "Marka veya müşteri başına özel domain", en: "Dedicated domains per brand or client" },
    min: 1,
    max: 20,
    step: 1,
    defaultValue: 3,
    included: 1,
    unitPrice: { USD: 15, TRY: 450 },
    summaryUnit: { tr: "domain", en: "domains" },
  },
];

export const enterpriseSummaries: EnterpriseSummary[] = [
  {
    title: { tr: "Çoklu ekip akışı", en: "Multi-team workflow" },
    text: {
      tr: "Rol bazlı erişim, alt hesap ve şube mantığıyla büyüyen yapılara uyarlanır.",
      en: "Built for scaling teams with role-based access, sub-accounts, and branch logic.",
    },
  },
  {
    title: { tr: "White-label hazır kurgu", en: "White-label ready model" },
    text: {
      tr: "Özel domain, kurumsal görünüm ve müşteri bazlı yapılandırmalar enterprise odağındadır.",
      en: "Custom domains, branded experiences, and client-specific setups are part of the enterprise focus.",
    },
  },
  {
    title: { tr: "Tahmini fiyat + satış özeti", en: "Estimated cost + sales-ready summary" },
    text: {
      tr: "Formu doldurduğunuzda seçtiğiniz kapasiteyle birlikte satış ekibine hazır bir e-posta taslağı oluşur.",
      en: "Once you fill the form, a sales-ready email draft is generated with your selected capacity summary.",
    },
  },
];

const enterpriseBasePrice: LocalizedPrice = {
  USD: 89,
  TRY: 2890,
};

export function formatCurrency(locale: PricingLocale, amount: number) {
  const currency = currencyByLocale[locale];
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPlanPrice(plan: PlanDefinition, locale: PricingLocale, billing: BillingCycle) {
  if (!plan.price) return null;
  return plan.price[billing][currencyByLocale[locale]];
}

/**
 * Real yearly-billing discount for this plan, derived from its own monthly vs
 * yearly per-month price — not a single hardcoded number, since plans don't
 * share the same discount rate (e.g. Starter ~25%, Pro ~21%).
 */
export function computeYearlyDiscountPercent(plan: PlanDefinition, locale: PricingLocale): number | null {
  if (!plan.price) return null;
  const currency = currencyByLocale[locale];
  const monthly = plan.price.monthly[currency];
  const yearly = plan.price.yearly[currency];
  if (!monthly) return null;
  return Math.round((1 - yearly / monthly) * 100);
}

export function calculateEnterpriseEstimate(input: EnterpriseQuoteInput, locale: PricingLocale) {
  const currency = currencyByLocale[locale];
  let monthly = enterpriseBasePrice[currency];

  for (const slider of enterpriseSliders) {
    const selected = input[slider.key];
    const units = Math.max(0, selected - slider.included) / slider.step;
    monthly += units * slider.unitPrice[currency];
  }

  const yearlyMonthly = Math.round(monthly * 0.8);
  const yearlyTotal = yearlyMonthly * 12;

  return {
    monthly,
    yearlyMonthly,
    yearlyTotal,
  };
}

export function getEnterpriseDefaultInput(): EnterpriseQuoteInput {
  return enterpriseSliders.reduce((acc, slider) => {
    acc[slider.key] = slider.defaultValue;
    return acc;
  }, {} as EnterpriseQuoteInput);
}

export function buildEnterpriseSummaryLines(input: EnterpriseQuoteInput, locale: PricingLocale) {
  return enterpriseSliders.map((slider) => ({
    label: slider.label[locale],
    value: `${input[slider.key]} ${slider.summaryUnit[locale]}`,
  }));
}

export function buildEnterpriseMailto(params: {
  locale: PricingLocale;
  input: EnterpriseQuoteInput;
  monthly: number;
  yearlyMonthly: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  note: string;
}) {
  const subject = enterpriseCopy.emailSubject[params.locale];
  const summary = buildEnterpriseSummaryLines(params.input, params.locale)
    .map((item) => `- ${item.label}: ${item.value}`)
    .join("\n");

  const body =
    params.locale === "tr"
      ? [
          "Merhaba,",
          "",
          "Kurumsal paket için teklif talep ediyorum.",
          "",
          `Ad Soyad: ${params.name}`,
          `Şirket: ${params.company}`,
          `E-posta: ${params.email}`,
          `Telefon: ${params.phone}`,
          "",
          "İhtiyaç özeti:",
          summary,
          "",
          `Tahmini aylık: ${formatCurrency("tr", params.monthly)}`,
          `Tahmini yıllık aylık karşılık: ${formatCurrency("tr", params.yearlyMonthly)}`,
          "",
          `Not: ${params.note || "-"}`,
        ].join("\n")
      : [
          "Hello,",
          "",
          "I would like to request an enterprise quote.",
          "",
          `Name: ${params.name}`,
          `Company: ${params.company}`,
          `Email: ${params.email}`,
          `Phone: ${params.phone}`,
          "",
          "Requirement summary:",
          summary,
          "",
          `Estimated monthly: ${formatCurrency("en", params.monthly)}`,
          `Estimated yearly monthly equivalent: ${formatCurrency("en", params.yearlyMonthly)}`,
          "",
          `Note: ${params.note || "-"}`,
        ].join("\n");

  return `mailto:contact@qrpublish.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
