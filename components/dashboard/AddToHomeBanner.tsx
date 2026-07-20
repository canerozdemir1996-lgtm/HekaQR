"use client";

import { useEffect, useId, useState } from "react";
import { Download, X } from "lucide-react";

const STORAGE_KEY = "qrpublish_pwa_banner_v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function AddToHomeBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);
  const [installing, setInstalling] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

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
    const onInstalled = () => {
      setHidden(true);
      setPromptEvent(null);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!promptEvent || installing) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") {
        setHidden(true);
        setPromptEvent(null);
        return;
      }
      dismiss();
    } finally {
      setInstalling(false);
    }
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
    <aside
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+5rem)] z-40 sm:hidden"
    >
      <div className="rounded-[1.4rem] border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-300/30 backdrop-blur-2xl dark:border-white/10 dark:bg-[#020617]/95 dark:shadow-black/30">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            <Download size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p id={titleId} className="text-sm font-black text-slate-900 dark:text-white">Ana ekrana ekleyin</p>
            <p id={descriptionId} className="mt-1 text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300">
              Dashboard&apos;a uygulama gibi hızlı erişmek için tek dokunuşla kurabilirsiniz.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => void handleInstall()} disabled={installing} className="min-h-11 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">
                {installing ? "Yükleniyor…" : "Yükle"}
              </button>
              <button type="button" onClick={dismiss} disabled={installing} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
                Sonra
              </button>
            </div>
          </div>
          <button type="button" onClick={dismiss} disabled={installing} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Yükleme önerisini kapat">
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
