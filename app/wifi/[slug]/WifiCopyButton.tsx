"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

export default function WifiCopyButton({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    const ok = await copyToClipboard(password);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={() => void copyPassword()}
      aria-label={copied ? "WiFi şifresi kopyalandı" : "WiFi şifresini kopyala"}
      title={copied ? "Kopyalandı" : "Şifreyi kopyala"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
    >
      {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
    </button>
  );
}
