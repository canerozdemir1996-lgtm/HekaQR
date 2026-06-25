"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const STORAGE_KEY = "qrpublish_pwa_banner_v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function AddToHomeBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "dismissed") return;
    } catch {
      // ignore
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setHidden(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") {
      setHidden(true);
      setPromptEvent(null);
      return;
    }
    dismiss();
  }

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // ignore
    }
    setHidden(true);
  }

  if (hidden || !promptEvent) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.2rem)] z-[95] sm:hidden">
      <div className="rounded-[1.4rem] border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-300/30 backdrop-blur-2xl dark:border-white/10 dark:bg-[#020617]/95 dark:shadow-black/30">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            <Download size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900 dark:text-white">Ana ekrana ekleyin</p>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
              Dashboard'a uygulama gibi hızlı erişmek için tek dokunuşla kurabilirsiniz.
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => void handleInstall()} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-500">
                Yükle
              </button>
              <button onClick={dismiss} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                Sonra
              </button>
            </div>
          </div>
          <button onClick={dismiss} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200" aria-label="Kapat">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
