"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Plus, Trash2, ChevronDown, ChevronUp, Check, AlertCircle } from "lucide-react";
import { useTheme } from "@/lib/theme";
import type {
  PlanDefinition,
  ComparisonRow,
  EnterpriseSliderConfig,
  FaqItem,
  TrustItem,
  PricingLocale,
  BillingCycle,
} from "@/lib/pricing";

type Tab = "plans" | "enterprise" | "comparison" | "faq" | "trust";

interface PricingConfig {
  plans: PlanDefinition[];
  comparison: ComparisonRow[];
  enterprise: EnterpriseSliderConfig[];
  faq: FaqItem[];
  trust: TrustItem[];
}

type SaveStatus = "idle" | "saving" | "ok" | "err";

const PLAN_COLORS: Record<string, { dot: string; badge: string }> = {
  free:       { dot: "#64748b", badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  starter:    { dot: "#3b82f6", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  pro:        { dot: "#8b5cf6", badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  enterprise: { dot: "#f59e0b", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

// ── Shared input styles ────────────────────────────────────────────────────────
function useInputCls(isDark: boolean) {
  return isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none";
}

function LabelRow({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
      {label}
    </p>
  );
}

function LocPair({
  labelTr, labelEn, isDark, disabled,
  trValue, enValue, onTr, onEn, multiline,
}: {
  labelTr: string; labelEn: string; isDark: boolean; disabled?: boolean;
  trValue: string; enValue: string; onTr: (v: string) => void; onEn: (v: string) => void;
  multiline?: boolean;
}) {
  const inp = useInputCls(isDark);
  const cls = `w-full border rounded-xl px-3 py-2 text-sm transition-all ${inp} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`;
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <LabelRow label={labelTr} isDark={isDark} />
        {multiline
          ? <textarea value={trValue} onChange={e => onTr(e.target.value)} rows={3} disabled={disabled} className={cls} />
          : <input value={trValue} onChange={e => onTr(e.target.value)} disabled={disabled} className={cls} />}
      </div>
      <div>
        <LabelRow label={labelEn} isDark={isDark} />
        {multiline
          ? <textarea value={enValue} onChange={e => onEn(e.target.value)} rows={3} disabled={disabled} className={cls} />
          : <input value={enValue} onChange={e => onEn(e.target.value)} disabled={disabled} className={cls} />}
      </div>
    </div>
  );
}

function NumInput({
  label, value, onChange, isDark, min, step,
}: {
  label: string; value: number; onChange: (v: number) => void; isDark: boolean; min?: number; step?: number;
}) {
  const inp = useInputCls(isDark);
  return (
    <div>
      <LabelRow label={label} isDark={isDark} />
      <input type="number" value={value} min={min} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full border rounded-xl px-3 py-2 text-sm transition-all ${inp}`} />
    </div>
  );
}

function SaveBar({
  onSave, status, isDark,
}: {
  onSave: () => void; status: SaveStatus; isDark: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4">
      {status === "ok" && (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <Check size={13} /> Kaydedildi
        </span>
      )}
      {status === "err" && (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
          <AlertCircle size={13} /> Hata
        </span>
      )}
      <button onClick={onSave} disabled={status === "saving"}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 btn-premium focus-premium">
        {status === "saving" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Kaydet
      </button>
    </div>
  );
}

// ── Plans Tab ──────────────────────────────────────────────────────────────────
function PlansTab({
  plans, onChange, isDark,
}: {
  plans: PlanDefinition[]; onChange: (p: PlanDefinition[]) => void; isDark: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(plans[0]?.key ?? null);

  const update = (idx: number, patch: Partial<PlanDefinition>) => {
    const next = plans.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange(next);
  };

  const updateLoc = (idx: number, field: "name" | "description" | "caption" | "badge" | "ctaLabel", locale: PricingLocale, val: string) => {
    const next = plans.map((p, i) =>
      i === idx ? { ...p, [field]: { ...p[field], [locale]: val } } : p
    );
    onChange(next);
  };

  const updatePrice = (idx: number, cycle: BillingCycle, currency: "TRY" | "USD", val: number) => {
    const p = plans[idx];
    if (!p.price) return;
    const next = plans.map((pl, i) =>
      i === idx
        ? { ...pl, price: { ...pl.price!, [cycle]: { ...pl.price![cycle], [currency]: val } } }
        : pl
    );
    onChange(next);
  };

  const updateBullet = (idx: number, bi: number, locale: PricingLocale, val: string) => {
    const next = plans.map((p, i) =>
      i === idx
        ? { ...p, bullets: p.bullets.map((b, j) => (j === bi ? { ...b, [locale]: val } : b)) }
        : p
    );
    onChange(next);
  };

  const addBullet = (idx: number) => {
    const next = plans.map((p, i) =>
      i === idx ? { ...p, bullets: [...p.bullets, { tr: "", en: "" }] } : p
    );
    onChange(next);
  };

  const removeBullet = (idx: number, bi: number) => {
    const next = plans.map((p, i) =>
      i === idx ? { ...p, bullets: p.bullets.filter((_, j) => j !== bi) } : p
    );
    onChange(next);
  };

  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";

  return (
    <div className="space-y-3">
      {plans.map((plan, idx) => {
        const isOpen = expanded === plan.key;
        const color = PLAN_COLORS[plan.key] ?? PLAN_COLORS.free;
        return (
          <div key={plan.key} className={`rounded-2xl border ${card} overflow-hidden`}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : plan.key)}
              className={`w-full flex items-center justify-between px-5 py-4 text-left`}>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color.dot }} />
                <span className={`font-black text-sm ${tx}`}>{plan.name.tr} / {plan.name.en}</span>
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border ${color.badge}`}>
                  {plan.key}
                </span>
              </div>
              {isOpen ? <ChevronUp size={15} className={sub} /> : <ChevronDown size={15} className={sub} />}
            </button>

            {isOpen && (
              <div className={`border-t ${isDark ? "border-white/10" : "border-slate-100"} px-5 pb-5 pt-4 space-y-4`}>
                <LocPair
                  labelTr="Ad (TR)" labelEn="Ad (EN)" isDark={isDark}
                  trValue={plan.name.tr} enValue={plan.name.en}
                  onTr={v => updateLoc(idx, "name", "tr", v)}
                  onEn={v => updateLoc(idx, "name", "en", v)} />

                <LocPair
                  labelTr="Rozet (TR)" labelEn="Rozet (EN)" isDark={isDark}
                  trValue={plan.badge.tr} enValue={plan.badge.en}
                  onTr={v => updateLoc(idx, "badge", "tr", v)}
                  onEn={v => updateLoc(idx, "badge", "en", v)} />

                <LocPair
                  labelTr="Açıklama (TR)" labelEn="Açıklama (EN)" isDark={isDark}
                  trValue={plan.description.tr} enValue={plan.description.en}
                  onTr={v => updateLoc(idx, "description", "tr", v)}
                  onEn={v => updateLoc(idx, "description", "en", v)} multiline />

                <LocPair
                  labelTr="Alt başlık (TR)" labelEn="Alt başlık (EN)" isDark={isDark}
                  trValue={plan.caption.tr} enValue={plan.caption.en}
                  onTr={v => updateLoc(idx, "caption", "tr", v)}
                  onEn={v => updateLoc(idx, "caption", "en", v)} />

                <LocPair
                  labelTr="CTA label (TR)" labelEn="CTA label (EN)" isDark={isDark}
                  trValue={plan.ctaLabel.tr} enValue={plan.ctaLabel.en}
                  onTr={v => updateLoc(idx, "ctaLabel", "tr", v)}
                  onEn={v => updateLoc(idx, "ctaLabel", "en", v)} />

                {plan.price && (
                  <div>
                    <LabelRow label="Fiyatlar" isDark={isDark} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                      <NumInput label="Aylık TRY" isDark={isDark} value={plan.price.monthly.TRY}
                        onChange={v => updatePrice(idx, "monthly", "TRY", v)} min={0} />
                      <NumInput label="Aylık USD" isDark={isDark} value={plan.price.monthly.USD}
                        onChange={v => updatePrice(idx, "monthly", "USD", v)} min={0} />
                      <NumInput label="Yıllık TRY" isDark={isDark} value={plan.price.yearly.TRY}
                        onChange={v => updatePrice(idx, "yearly", "TRY", v)} min={0} />
                      <NumInput label="Yıllık USD" isDark={isDark} value={plan.price.yearly.USD}
                        onChange={v => updatePrice(idx, "yearly", "USD", v)} min={0} />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <LabelRow label={`Maddeler (${plan.bullets.length})`} isDark={isDark} />
                    <button type="button" onClick={() => addBullet(idx)}
                      className="flex items-center gap-1 text-[10px] font-black text-violet-400 hover:text-violet-300">
                      <Plus size={11} /> Ekle
                    </button>
                  </div>
                  <div className="space-y-2">
                    {plan.bullets.map((b, bi) => (
                      <div key={bi} className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input value={b.tr} onChange={e => updateBullet(idx, bi, "tr", e.target.value)}
                            placeholder="TR"
                            className={`border rounded-xl px-3 py-2 text-xs transition-all ${useInputCls(isDark)}`} />
                          <input value={b.en} onChange={e => updateBullet(idx, bi, "en", e.target.value)}
                            placeholder="EN"
                            className={`border rounded-xl px-3 py-2 text-xs transition-all ${useInputCls(isDark)}`} />
                        </div>
                        <button type="button" onClick={() => removeBullet(idx, bi)}
                          aria-label="Plan maddesini sil"
                          title="Plan maddesini sil"
                          className={`mt-1 p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Enterprise Tab ─────────────────────────────────────────────────────────────
function EnterpriseTab({
  sliders, onChange, isDark,
}: {
  sliders: EnterpriseSliderConfig[]; onChange: (s: EnterpriseSliderConfig[]) => void; isDark: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(sliders[0]?.key ?? null);
  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";

  const update = (idx: number, patch: Partial<EnterpriseSliderConfig>) => {
    onChange(sliders.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const updateLoc = (idx: number, field: "label" | "description" | "summaryUnit", locale: "tr" | "en", val: string) => {
    onChange(sliders.map((s, i) =>
      i === idx ? { ...s, [field]: { ...s[field], [locale]: val } } : s
    ));
  };

  return (
    <div className="space-y-3">
      {sliders.map((slider, idx) => {
        const isOpen = expanded === slider.key;
        return (
          <div key={slider.key} className={`rounded-2xl border ${card} overflow-hidden`}>
            <button type="button"
              onClick={() => setExpanded(isOpen ? null : slider.key)}
              className="w-full flex items-center justify-between px-5 py-4 text-left">
              <span className={`font-black text-sm ${tx}`}>{slider.label.tr} / {slider.label.en}</span>
              {isOpen ? <ChevronUp size={15} className={sub} /> : <ChevronDown size={15} className={sub} />}
            </button>

            {isOpen && (
              <div className={`border-t ${isDark ? "border-white/10" : "border-slate-100"} px-5 pb-5 pt-4 space-y-4`}>
                <LocPair
                  labelTr="Etiket (TR)" labelEn="Etiket (EN)" isDark={isDark}
                  trValue={slider.label.tr} enValue={slider.label.en}
                  onTr={v => updateLoc(idx, "label", "tr", v)}
                  onEn={v => updateLoc(idx, "label", "en", v)} />

                <LocPair
                  labelTr="Açıklama (TR)" labelEn="Açıklama (EN)" isDark={isDark}
                  trValue={slider.description.tr} enValue={slider.description.en}
                  onTr={v => updateLoc(idx, "description", "tr", v)}
                  onEn={v => updateLoc(idx, "description", "en", v)} />

                <LocPair
                  labelTr="Birim (TR)" labelEn="Birim (EN)" isDark={isDark}
                  trValue={slider.summaryUnit.tr} enValue={slider.summaryUnit.en}
                  onTr={v => updateLoc(idx, "summaryUnit", "tr", v)}
                  onEn={v => updateLoc(idx, "summaryUnit", "en", v)} />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <NumInput label="Min" isDark={isDark} value={slider.min}
                    onChange={v => update(idx, { min: v })} min={0} />
                  <NumInput label="Max" isDark={isDark} value={slider.max}
                    onChange={v => update(idx, { max: v })} min={1} />
                  <NumInput label="Adım (step)" isDark={isDark} value={slider.step}
                    onChange={v => update(idx, { step: v })} min={1} />
                  <NumInput label="Varsayılan" isDark={isDark} value={slider.defaultValue}
                    onChange={v => update(idx, { defaultValue: v })} />
                  <NumInput label="Dahil" isDark={isDark} value={slider.included}
                    onChange={v => update(idx, { included: v })} />
                </div>

                <div>
                  <LabelRow label="Birim fiyat" isDark={isDark} />
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <NumInput label="TRY / adım" isDark={isDark} value={slider.unitPrice.TRY}
                      onChange={v => update(idx, { unitPrice: { ...slider.unitPrice, TRY: v } })} min={0} />
                    <NumInput label="USD / adım" isDark={isDark} value={slider.unitPrice.USD}
                      onChange={v => update(idx, { unitPrice: { ...slider.unitPrice, USD: v } })} min={0} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Comparison Tab ─────────────────────────────────────────────────────────────
function ComparisonTab({
  rows, onChange, isDark,
}: {
  rows: ComparisonRow[]; onChange: (r: ComparisonRow[]) => void; isDark: boolean;
}) {
  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const sub = isDark ? "text-slate-500" : "text-slate-500";
  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const PLANS = ["free", "starter", "pro", "enterprise"] as const;

  const updateLabel = (idx: number, locale: "tr" | "en", val: string) => {
    onChange(rows.map((r, i) =>
      i === idx ? { ...r, label: { ...r.label, [locale]: val } } : r
    ));
  };

  const updateValue = (idx: number, plan: string, locale: "tr" | "en", val: string) => {
    onChange(rows.map((r, i) =>
      i === idx
        ? { ...r, values: { ...r.values, [plan]: { ...r.values[plan as keyof typeof r.values], [locale]: val } } }
        : r
    ));
  };

  const addRow = () => {
    onChange([...rows, {
      key: `row_${Date.now()}`,
      label: { tr: "", en: "" },
      values: {
        free: { tr: "", en: "" },
        starter: { tr: "", en: "" },
        pro: { tr: "", en: "" },
        enterprise: { tr: "", en: "" },
      },
    }]);
  };

  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));
  const inp = useInputCls(isDark);

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <div key={row.key} className={`rounded-2xl border ${card} p-4`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <div>
                <LabelRow label="Özellik adı" isDark={isDark} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={row.label.tr} onChange={e => updateLabel(idx, "tr", e.target.value)}
                    placeholder="TR" className={`border rounded-xl px-3 py-2 text-sm ${inp}`} />
                  <input value={row.label.en} onChange={e => updateLabel(idx, "en", e.target.value)}
                    placeholder="EN" className={`border rounded-xl px-3 py-2 text-sm ${inp}`} />
                </div>
              </div>
              <div className={`grid grid-cols-4 gap-2`}>
                {PLANS.map(plan => (
                  <div key={plan}>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${sub}`}>{plan}</p>
                    <div className="space-y-1">
                      <input value={row.values[plan]?.tr ?? ""} onChange={e => updateValue(idx, plan, "tr", e.target.value)}
                        placeholder="TR" className={`w-full border rounded-xl px-2 py-1.5 text-xs ${inp}`} />
                      <input value={row.values[plan]?.en ?? ""} onChange={e => updateValue(idx, plan, "en", e.target.value)}
                        placeholder="EN" className={`w-full border rounded-xl px-2 py-1.5 text-xs ${inp}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => removeRow(idx)}
              aria-label="Karşılaştırma satırını sil"
              title="Karşılaştırma satırını sil"
              className={`mt-1 p-1.5 rounded-lg transition-all shrink-0 ${isDark ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addRow}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
          isDark ? "border-white/10 text-slate-400 hover:text-violet-400 hover:border-violet-500/30" : "border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300"
        }`}>
        <Plus size={13} /> Satır Ekle
      </button>
    </div>
  );
}

// ── FAQ Tab ────────────────────────────────────────────────────────────────────
function FaqTab({
  items, onChange, isDark,
}: {
  items: FaqItem[]; onChange: (f: FaqItem[]) => void; isDark: boolean;
}) {
  const card = isDark ? "surface border-white/10" : "surface border-slate-200";
  const sub = isDark ? "text-slate-500" : "text-slate-500";

  const update = (idx: number, field: "question" | "answer", locale: "tr" | "en", val: string) => {
    onChange(items.map((item, i) =>
      i === idx ? { ...item, [field]: { ...item[field], [locale]: val } } : item
    ));
  };

  const addItem = () => onChange([...items, { question: { tr: "", en: "" }, answer: { tr: "", en: "" } }]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className={`rounded-2xl border ${card} p-4 space-y-3`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-black ${isDark ? "text-slate-300" : "text-slate-700"}`}>Soru {idx + 1}</p>
            <button type="button" onClick={() => removeItem(idx)}
              aria-label="FAQ sorusunu sil"
              title="FAQ sorusunu sil"
              className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}>
              <Trash2 size={13} />
            </button>
          </div>
          <LocPair
            labelTr="Soru (TR)" labelEn="Soru (EN)" isDark={isDark}
            trValue={item.question.tr} enValue={item.question.en}
            onTr={v => update(idx, "question", "tr", v)}
            onEn={v => update(idx, "question", "en", v)} />
          <LocPair
            labelTr="Cevap (TR)" labelEn="Cevap (EN)" isDark={isDark}
            trValue={item.answer.tr} enValue={item.answer.en}
            onTr={v => update(idx, "answer", "tr", v)}
            onEn={v => update(idx, "answer", "en", v)} multiline />
        </div>
      ))}

      <button type="button" onClick={addItem}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
          isDark ? "border-white/10 text-slate-400 hover:text-violet-400 hover:border-violet-500/30" : "border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300"
        }`}>
        <Plus size={13} /> Soru Ekle
      </button>
    </div>
  );
}

// ── Trust Tab ──────────────────────────────────────────────────────────────────
function TrustTab({
  items, onChange, isDark,
}: {
  items: TrustItem[]; onChange: (t: TrustItem[]) => void; isDark: boolean;
}) {
  const card = isDark ? "surface border-white/10" : "surface border-slate-200";

  const update = (idx: number, field: "title" | "text", locale: "tr" | "en", val: string) => {
    onChange(items.map((item, i) =>
      i === idx ? { ...item, [field]: { ...item[field], [locale]: val } } : item
    ));
  };

  const addItem = () => onChange([...items, { title: { tr: "", en: "" }, text: { tr: "", en: "" } }]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className={`rounded-2xl border ${card} p-4 space-y-3`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-black ${isDark ? "text-slate-300" : "text-slate-700"}`}>Güven maddesi {idx + 1}</p>
            <button type="button" onClick={() => removeItem(idx)}
              aria-label="Güven maddesini sil"
              title="Güven maddesini sil"
              className={`p-1.5 rounded-lg transition-all ${isDark ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}>
              <Trash2 size={13} />
            </button>
          </div>
          <LocPair
            labelTr="Başlık (TR)" labelEn="Başlık (EN)" isDark={isDark}
            trValue={item.title.tr} enValue={item.title.en}
            onTr={v => update(idx, "title", "tr", v)}
            onEn={v => update(idx, "title", "en", v)} />
          <LocPair
            labelTr="Açıklama (TR)" labelEn="Açıklama (EN)" isDark={isDark}
            trValue={item.text.tr} enValue={item.text.en}
            onTr={v => update(idx, "text", "tr", v)}
            onEn={v => update(idx, "text", "en", v)} multiline />
        </div>
      ))}

      <button type="button" onClick={addItem}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
          isDark ? "border-white/10 text-slate-400 hover:text-violet-400 hover:border-violet-500/30" : "border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300"
        }`}>
        <Plus size={13} /> Madde Ekle
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
const TAB_LABELS: Record<Tab, string> = {
  plans:      "Planlar",
  enterprise: "Enterprise Hesap",
  comparison: "Karşılaştırma",
  faq:        "FAQ",
  trust:      "Güven",
};

export default function AdminPricingPage() {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [tab, setTab] = useState<Tab>("plans");
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<Tab, SaveStatus>>({
    plans: "idle", enterprise: "idle", comparison: "idle", faq: "idle", trust: "idle",
  });

  const tx = isDark ? "text-slate-100" : "text-slate-900";
  const sub = isDark ? "text-slate-500" : "text-slate-500";
  const card = isDark ? "surface border-white/10" : "surface border-slate-200";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pricing", { credentials: "same-origin" });
      const json = await res.json();
      if (res.ok && json.config) setConfig(json.config as PricingConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (key: Tab) => {
    if (!config) return;
    setSaveStatus(s => ({ ...s, [key]: "saving" }));
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ key, value: config[key] }),
      });
      setSaveStatus(s => ({ ...s, [key]: res.ok ? "ok" : "err" }));
      if (res.ok) setTimeout(() => setSaveStatus(prev => ({ ...prev, [key]: "idle" })), 2500);
    } catch {
      setSaveStatus(s => ({ ...s, [key]: "err" }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="px-6 py-8 text-center">
        <AlertCircle size={28} className="mx-auto mb-3 text-red-400" />
        <p className={`text-sm ${sub}`}>Fiyatlandırma yapılandırması yüklenemedi.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-5">
      {/* Header */}
      <div>
        <h1 className={`text-xl font-black tracking-tight ${tx}`}>Fiyatlandırma Yönetimi</h1>
        <p className={`text-sm ${sub}`}>Planları, enterprise hesaplayıcıyı, karşılaştırma tablosunu ve içerikleri yönetin.</p>
      </div>

      {/* Tab nav */}
      <div className={`flex items-center gap-1 p-1 rounded-2xl border w-fit ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tab === t ? "bg-violet-600 text-white shadow-sm" : `${sub} hover:text-violet-400`
            }`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`rounded-2xl border ${card} p-6`}>
        {tab === "plans" && (
          <>
            <PlansTab plans={config.plans as PlanDefinition[]} isDark={isDark}
              onChange={plans => setConfig(c => c ? { ...c, plans } : c)} />
            <SaveBar onSave={() => save("plans")} status={saveStatus.plans} isDark={isDark} />
          </>
        )}
        {tab === "enterprise" && (
          <>
            <EnterpriseTab sliders={config.enterprise as EnterpriseSliderConfig[]} isDark={isDark}
              onChange={enterprise => setConfig(c => c ? { ...c, enterprise } : c)} />
            <SaveBar onSave={() => save("enterprise")} status={saveStatus.enterprise} isDark={isDark} />
          </>
        )}
        {tab === "comparison" && (
          <>
            <ComparisonTab rows={config.comparison as ComparisonRow[]} isDark={isDark}
              onChange={comparison => setConfig(c => c ? { ...c, comparison } : c)} />
            <SaveBar onSave={() => save("comparison")} status={saveStatus.comparison} isDark={isDark} />
          </>
        )}
        {tab === "faq" && (
          <>
            <FaqTab items={config.faq as FaqItem[]} isDark={isDark}
              onChange={faq => setConfig(c => c ? { ...c, faq } : c)} />
            <SaveBar onSave={() => save("faq")} status={saveStatus.faq} isDark={isDark} />
          </>
        )}
        {tab === "trust" && (
          <>
            <TrustTab items={config.trust as TrustItem[]} isDark={isDark}
              onChange={trust => setConfig(c => c ? { ...c, trust } : c)} />
            <SaveBar onSave={() => save("trust")} status={saveStatus.trust} isDark={isDark} />
          </>
        )}
      </div>
    </div>
  );
}
