import { Radio, ShieldCheck } from "lucide-react";
import { resolveQrMode, type QrModeRecord } from "@/lib/qr-capabilities";

export function QrModeBadge({ qr, compact = false }: { qr: QrModeRecord; compact?: boolean }) {
  const resolved = resolveQrMode(qr);
  const dynamic = resolved.mode === "dynamic";
  const label = dynamic ? "Dinamik" : "Statik";
  const description = dynamic
    ? "Dinamik QR: hedefi yönetilebilir ve tarama analitiği destekler."
    : "Statik QR: içerik doğrudan QR desenindedir; hedef sonradan değişmez.";
  const Icon = dynamic ? Radio : ShieldCheck;

  return (
    <span
      title={description}
      aria-label={description}
      data-qr-mode={resolved.mode}
      data-mode-source={resolved.source}
      className={`inline-flex items-center gap-1 rounded-full border font-black ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"} ${
        dynamic
          ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-200"
          : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-200"
      }`}
    >
      <Icon size={compact ? 11 : 12} aria-hidden="true" />
      {label}
    </span>
  );
}
