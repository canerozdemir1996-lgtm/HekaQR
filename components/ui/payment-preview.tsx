"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import {
  ArrowRight,
  Check,
  CreditCard,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCardNumber, formatCvc, formatExpiry, getCardBrand, type CardBrand } from "@/components/ui/payment-card-utils";

type PreviewLocale = "tr" | "en";
type BillingCycle = "monthly" | "yearly";

type PricingPaymentPreviewProps = {
  locale: PreviewLocale;
  billing: BillingCycle;
  planName: string;
  planDescription: string;
  unitPrice: number;
  formatPrice: (amount: number) => string;
};

type FormDataState = {
  number: string;
  name: string;
  expiry: string;
  cvc: string;
};

function getCopy(locale: PreviewLocale, billing: BillingCycle) {
  const isTr = locale === "tr";
  return {
    badge: isTr ? "Odeme akisi onizlemesi" : "Checkout flow preview",
    title: isTr ? "Plan seciminden sonra deneyim boyle ilerler." : "This is how the flow continues after plan selection.",
    text: isTr
      ? "Kart onizlemesi, guvenli odeme formu ve plan ozetiyle pricing deneyimini daha somut gostermek icin hazirlandi."
      : "Built to make pricing more tangible with a card preview, secure payment form, and a clear plan summary.",
    secure: isTr ? "Guvenli odeme" : "Secure checkout",
    complete: isTr ? "Siparisi Tamamla" : "Complete Order",
    helper: isTr ? "Aboneligi baslatmak icin odeme bilgilerinizi girin." : "Enter your payment details to activate your subscription.",
    cardNumber: isTr ? "Kart Numarasi" : "Card Number",
    cardholder: isTr ? "Kart Sahibi" : "Cardholder Name",
    expiry: isTr ? "Son Kullanma" : "Expiry Date",
    cvc: "CVC",
    incompleteCard: isTr ? "Kart numarasi eksik" : "Incomplete card number",
    incompleteName: isTr ? "Ad ve soyad gerekli" : "Please enter full name",
    incompleteExpiry: isTr ? "Tarih eksik" : "Incomplete date",
    incompleteCvc: isTr ? "CVC eksik" : "Incomplete CVC",
    summary: isTr ? "Plan Ozeti" : "Order Summary",
    included: isTr ? "Dahil olanlar" : "Included items",
    subtotal: isTr ? "Ara toplam" : "Subtotal",
    tax: isTr ? "Vergi" : "Tax",
    total: isTr ? "Toplam" : "Total",
    pay: isTr ? "Guvenli odemeye gec" : "Continue to secure checkout",
    processing: isTr ? "Isleniyor" : "Processing",
    done: isTr ? "Odeme tamamlandi" : "Payment complete",
    encrypted: isTr ? "Odeme bilgileri sifreli olarak islenir" : "Payments are processed through an encrypted flow",
    monthly: isTr ? "Aylik plan" : "Monthly plan",
    yearly: isTr ? "Yillik plan" : "Yearly plan",
    annualSavings: isTr ? "Yillik avantaj uygulandi" : "Annual discount applied",
    review: isTr ? "Plani ve dahil olan yetkileri kontrol edin." : "Review your plan and included entitlements.",
    swipeFree: isTr ? "Panel ici odemeye hazir" : "Ready for in-app billing",
    billingLabel: billing === "monthly" ? (isTr ? "Aylik faturalama" : "Monthly billing") : (isTr ? "Yillik faturalama" : "Yearly billing"),
  };
}

function CreditCard3D({
  number,
  name,
  expiry,
  cvc,
  isFlipped,
  locale,
}: FormDataState & { isFlipped: boolean; locale: PreviewLocale }) {
  const brand = getCardBrand(number);
  const rotateX = useSpring(0, { stiffness: 300, damping: 30 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 30 });

  useEffect(() => {
    if (isFlipped) {
      rotateY.set(180);
      rotateX.set(0);
      return;
    }
    rotateY.set(0);
    rotateX.set(0);
  }, [isFlipped, rotateX, rotateY]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isFlipped) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = event.clientX - centerX;
    const mouseY = event.clientY - centerY;
    rotateX.set(-(mouseY / (rect.height / 2)) * 15);
    rotateY.set((mouseX / (rect.width / 2)) * 15);
  };

  const handleMouseLeave = () => {
    if (!isFlipped) {
      rotateX.set(0);
      rotateY.set(0);
    }
  };

  const displayNumber = number || ".... .... .... ....";
  const displayName = name || (locale === "tr" ? "AD SOYAD" : "YOUR NAME");
  const displayExpiry = expiry || "MM/YY";
  const displayCvc = cvc || (brand === "amex" ? "...." : "...");

  return (
    <div
      className="relative mx-auto w-full max-w-[420px] aspect-[1.586/1] [perspective:1000px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div className="relative h-full w-full [transform-style:preserve-3d]" style={{ rotateX, rotateY }}>
        <div className="absolute inset-0 flex h-full w-full flex-col justify-between overflow-hidden rounded-[1.75rem] border border-slate-700/50 bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 shadow-[0_24px_60px_rgba(15,23,42,0.35)] [backface-visibility:hidden] md:p-8">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-12 overflow-hidden rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner">
                <div className="grid h-full w-full grid-cols-2">
                  <div className="border-r border-amber-900/20" />
                  <div />
                </div>
              </div>
              <Wifi className="h-6 w-6 rotate-90 text-slate-300 opacity-80" />
            </div>
            <div className="flex h-8 w-20 items-center justify-end">
              {brand === "visa" ? (
                <span className="text-sm font-black tracking-[0.28em] text-white/90">VISA</span>
              ) : null}
              {brand === "mastercard" ? (
                <div className="flex items-center gap-[-8px]">
                  <span className="h-6 w-6 rounded-full bg-red-500/90" />
                  <span className="-ml-2 h-6 w-6 rounded-full bg-amber-400/90" />
                </div>
              ) : null}
              {brand === "amex" ? (
                <span className="rounded-sm bg-sky-500 px-2 py-1 text-[10px] font-black tracking-[0.2em] text-white">AMEX</span>
              ) : null}
              {brand === "unknown" ? <div className="h-6 w-12 rounded-md bg-white/10" /> : null}
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <div className="font-mono text-2xl tracking-[0.22em] text-white md:text-3xl">{displayNumber}</div>
            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <span className="mb-1 block text-[10px] uppercase tracking-[0.24em] text-slate-400">
                  {locale === "tr" ? "Kart sahibi" : "Cardholder"}
                </span>
                <span className="block max-w-[180px] truncate font-mono text-sm uppercase tracking-[0.18em] text-white md:text-base">
                  {displayName}
                </span>
              </div>
              <div className="text-right">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.24em] text-slate-400">
                  {locale === "tr" ? "Son kullanma" : "Expires"}
                </span>
                <span className="font-mono text-sm tracking-[0.18em] text-white md:text-base">{displayExpiry}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute inset-0 flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-700/50 bg-gradient-to-br from-slate-800 via-slate-900 to-black shadow-[0_24px_60px_rgba(15,23,42,0.35)] [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="mt-6 h-12 w-full bg-black" />
          <div className="mt-6 px-6">
            <div className="flex items-center">
              <div className="flex h-10 flex-1 items-center overflow-hidden rounded-l-md bg-slate-200 px-4">
                <div className="h-full w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.05)_2px,rgba(0,0,0,0.05)_4px)]" />
              </div>
              <div className="flex h-10 items-center rounded-r-md bg-white px-4 font-mono font-bold text-slate-900">{displayCvc}</div>
            </div>
            <div className="mt-2 pr-2 text-right text-[10px] text-slate-400">
              {locale === "tr" ? "Guvenlik kodu" : "Security code"}
            </div>
          </div>
          <div className="mt-auto p-6 text-[8px] leading-tight text-slate-500">
            QR Publish secure billing preview. This section demonstrates how in-app subscription payments can feel inside the product.
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PaymentForm({
  locale,
  formData,
  setFormData,
  onCvcFocus,
}: {
  locale: PreviewLocale;
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
  onCvcFocus: (focused: boolean) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const copy = getCopy(locale, "monthly");

  const clearError = (key: string) => {
    if (!errors[key]) return;
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, number: formatCardNumber(event.target.value) }));
    clearError("number");
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, name: event.target.value }));
    clearError("name");
  };

  const handleExpiryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, expiry: formatExpiry(event.target.value) }));
    clearError("expiry");
  };

  const handleCvcChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const brand = getCardBrand(formData.number);
    setFormData((current) => ({ ...current, cvc: formatCvc(event.target.value, brand) }));
    clearError("cvc");
  };

  const validateField = (field: keyof FormDataState) => {
    const nextErrors = { ...errors };
    if (field === "number") {
      const clean = formData.number.replace(/\s/g, "");
      const brand = getCardBrand(formData.number);
      const expectedLength = brand === "amex" ? 15 : 16;
      nextErrors.number = clean.length > 0 && clean.length < expectedLength ? copy.incompleteCard : "";
    }
    if (field === "name") {
      nextErrors.name = formData.name.length > 0 && formData.name.trim().split(" ").length < 2 ? copy.incompleteName : "";
    }
    if (field === "expiry") {
      nextErrors.expiry = formData.expiry.length > 0 && formData.expiry.length < 5 ? copy.incompleteExpiry : "";
    }
    if (field === "cvc") {
      const expectedLength = getCardBrand(formData.number) === "amex" ? 4 : 3;
      nextErrors.cvc = formData.cvc.length > 0 && formData.cvc.length < expectedLength ? copy.incompleteCvc : "";
    }
    setErrors(nextErrors);
  };

  const inputClassName = (hasError: boolean) =>
    cn(
      "w-full rounded-2xl border bg-white px-4 py-3.5 text-slate-900 outline-none transition-all shadow-sm placeholder:text-slate-400 focus:ring-4 dark:bg-slate-950 dark:text-white",
      hasError
        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-200 focus:border-violet-500 focus:ring-violet-500/20 dark:border-white/10",
    );

  return (
    <div className="mt-8 space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="payment-number" className="text-sm font-black text-slate-700 dark:text-slate-200">
          {copy.cardNumber}
        </label>
        <input
          id="payment-number"
          type="text"
          inputMode="numeric"
          placeholder="0000 0000 0000 0000"
          value={formData.number}
          onChange={handleNumberChange}
          onBlur={() => validateField("number")}
          className={cn(inputClassName(Boolean(errors.number)), "font-mono")}
        />
        {errors.number ? <p className="mt-1 text-xs font-medium text-red-500">{errors.number}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="payment-name" className="text-sm font-black text-slate-700 dark:text-slate-200">
          {copy.cardholder}
        </label>
        <input
          id="payment-name"
          type="text"
          placeholder={locale === "tr" ? "Caner Ozdemir" : "John Doe"}
          value={formData.name}
          onChange={handleNameChange}
          onBlur={() => validateField("name")}
          className={inputClassName(Boolean(errors.name))}
        />
        {errors.name ? <p className="mt-1 text-xs font-medium text-red-500">{errors.name}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label htmlFor="payment-expiry" className="text-sm font-black text-slate-700 dark:text-slate-200">
            {copy.expiry}
          </label>
          <input
            id="payment-expiry"
            type="text"
            inputMode="numeric"
            placeholder="MM/YY"
            value={formData.expiry}
            onChange={handleExpiryChange}
            onBlur={() => validateField("expiry")}
            className={cn(inputClassName(Boolean(errors.expiry)), "font-mono")}
          />
          {errors.expiry ? <p className="mt-1 text-xs font-medium text-red-500">{errors.expiry}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="payment-cvc" className="text-sm font-black text-slate-700 dark:text-slate-200">
            {copy.cvc}
          </label>
          <input
            id="payment-cvc"
            type="text"
            inputMode="numeric"
            placeholder={getCardBrand(formData.number) === "amex" ? "1234" : "123"}
            value={formData.cvc}
            onChange={handleCvcChange}
            onFocus={() => onCvcFocus(true)}
            onBlur={() => {
              onCvcFocus(false);
              validateField("cvc");
            }}
            className={cn(inputClassName(Boolean(errors.cvc)), "font-mono")}
          />
          {errors.cvc ? <p className="mt-1 text-xs font-medium text-red-500">{errors.cvc}</p> : null}
        </div>
      </div>
    </div>
  );
}

function OrderSummary({
  locale,
  billing,
  planName,
  planDescription,
  unitPrice,
  total,
  formatPrice,
  isValid,
}: {
  locale: PreviewLocale;
  billing: BillingCycle;
  planName: string;
  planDescription: string;
  unitPrice: number;
  total: number;
  formatPrice: (amount: number) => string;
  isValid: boolean;
}) {
  const [paymentState, setPaymentState] = useState<"idle" | "loading" | "success">("idle");
  const copy = getCopy(locale, billing);
  const items = useMemo(
    () => [
      {
        id: "plan",
        title: planName,
        description: billing === "monthly" ? copy.monthly : copy.yearly,
        price: total,
        icon: CreditCard,
      },
      {
        id: "analytics",
        title: locale === "tr" ? "Gelismis analitik" : "Advanced analytics",
        description: locale === "tr" ? "Plan dahilinde acilir" : "Included with the selected plan",
        price: 0,
        icon: Sparkles,
      },
      {
        id: "security",
        title: locale === "tr" ? "Guvenli faturalama" : "Secure billing",
        description: locale === "tr" ? "Sifreli odeme akisi" : "Encrypted payment handling",
        price: 0,
        icon: ShieldCheck,
      },
    ],
    [billing, copy.monthly, copy.yearly, locale, planName, total],
  );

  const subtotal = total;
  const tax = 0;

  const handlePay = () => {
    if (!isValid || paymentState !== "idle") return;
    setPaymentState("loading");
    window.setTimeout(() => {
      setPaymentState("success");
    }, 1800);
  };

  return (
    <div className="flex h-full w-full flex-col rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/40 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20 lg:p-10">
      <h2 className="text-xl font-black text-slate-900 dark:text-white">{copy.summary}</h2>
      <p className="mt-2 text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">{copy.review}</p>

      <div className="mt-8 flex-1 space-y-5">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex items-center gap-4"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-violet-600 dark:border-white/10 dark:bg-white/5 dark:text-violet-300">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
              <div className="text-right text-sm font-black text-slate-900 dark:text-white">
                {item.price === 0 ? (locale === "tr" ? "Dahil" : "Included") : formatPrice(item.price)}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-10 space-y-4 border-t border-slate-100 pt-8 dark:border-white/10">
        <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
          <span>{copy.subtotal}</span>
          <span className="text-slate-900 dark:text-white">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
          <span>{copy.tax}</span>
          <span className="text-slate-900 dark:text-white">{tax === 0 ? (locale === "tr" ? "Hesapta" : "At checkout") : formatPrice(tax)}</span>
        </div>
        <div className="flex justify-between pt-2 text-lg font-black text-slate-900 dark:text-white">
          <span>{copy.total}</span>
          <span>{formatPrice(total)}</span>
        </div>
        <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
          {planDescription}
        </div>
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={handlePay}
          disabled={!isValid || paymentState !== "idle"}
          className={cn(
            "relative h-14 w-full overflow-hidden rounded-full text-base font-black transition-all",
            !isValid
              ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500"
              : paymentState === "success"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : "bg-violet-600 text-white shadow-lg shadow-violet-600/30 hover:bg-violet-700 hover:shadow-xl hover:shadow-violet-600/40",
          )}
        >
          <AnimatePresence mode="wait">
            {paymentState === "idle" ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute inset-0 flex items-center justify-center gap-2"
              >
                {copy.pay}
                <ArrowRight className="h-5 w-5" />
              </motion.div>
            ) : null}
            {paymentState === "loading" ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center gap-2"
              >
                <Loader2 className="h-5 w-5 animate-spin" />
                {copy.processing}
              </motion.div>
            ) : null}
            {paymentState === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center gap-2"
              >
                <Check className="h-5 w-5" />
                {copy.done}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 text-violet-500" />
          <span>{copy.encrypted}</span>
        </div>
      </div>
    </div>
  );
}

export function PricingPaymentPreview({
  locale,
  billing,
  planName,
  planDescription,
  unitPrice,
  formatPrice,
}: PricingPaymentPreviewProps) {
  const [formData, setFormData] = useState<FormDataState>({
    number: "",
    name: "",
    expiry: "",
    cvc: "",
  });
  const [isCvcFocused, setIsCvcFocused] = useState(false);
  const cleanNumber = formData.number.replace(/\s/g, "");
  const brand: CardBrand = getCardBrand(formData.number);
  const expectedLength = brand === "amex" ? 15 : 16;
  const expectedCvcLength = brand === "amex" ? 4 : 3;
  const copy = getCopy(locale, billing);
  const total = billing === "yearly" ? unitPrice * 12 : unitPrice;

  const isValid =
    cleanNumber.length === expectedLength &&
    formData.name.trim().split(" ").length >= 2 &&
    formData.expiry.length === 5 &&
    formData.cvc.length === expectedCvcLength;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-sm font-black text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200">
          <QrCode size={16} />
          {copy.badge}
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{copy.title}</h2>
        <p className="mt-5 text-base font-semibold leading-8 text-slate-600 dark:text-slate-300">{copy.text}</p>
      </div>

      <div className="grid gap-8 rounded-[2.5rem] border border-slate-200 bg-white/70 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
        <div className="flex flex-col justify-center">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                {copy.secure}
              </div>
              <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{copy.complete}</h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">{copy.helper}</p>
            </div>

            <CreditCard3D {...formData} isFlipped={isCvcFocused} locale={locale} />
            <PaymentForm locale={locale} formData={formData} setFormData={setFormData} onCvcFocus={setIsCvcFocused} />
          </div>
        </div>

        <div className="flex items-center">
          <OrderSummary
            locale={locale}
            billing={billing}
            planName={planName}
            planDescription={planDescription}
            unitPrice={unitPrice}
            total={total}
            formatPrice={formatPrice}
            isValid={isValid}
          />
        </div>
      </div>
    </section>
  );
}
