"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ExternalLink, Home, Music, Pause, Play } from "lucide-react";
import PublicQrStatusPage from "@/components/public/PublicQrStatusPage";
import { safePublicHttpUrl } from "@/lib/public-url";

export type AudioTrack = { title: string; url: string };

export default function AudioPlayerClient({ title, tracks }: { title: string; tracks: AudioTrack[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [playbackError, setPlaybackError] = useState("");
  const safeTracks = tracks
    .map((track) => ({ ...track, url: safePublicHttpUrl(track.url) }))
    .filter((track) => track.url);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.onended = () => setPlaying(null);
    audio.onerror = () => {
      setPlaying(null);
      setPlaybackError("Bu ses dosyası oynatılamadı. Dosyayı yeni sekmede açmayı deneyin.");
    };
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  async function toggle(index: number, url: string) {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError("");
    if (playing === index) {
      audio.pause();
      setPlaying(null);
      return;
    }
    try {
      audio.src = url;
      await audio.play();
      setPlaying(index);
    } catch {
      setPlaying(null);
      setPlaybackError("Oynatma başlatılamadı. Tarayıcı iznini kontrol edin veya dosyayı yeni sekmede açın.");
    }
  }

  if (safeTracks.length === 0) {
    return (
      <PublicQrStatusPage
        locale="tr"
        tone="error"
        eyebrow="Liste boş"
        title="Ses dosyası bulunamadı"
        description="Bu QR koduna henüz oynatılabilir bir ses dosyası eklenmemiş."
        ownerHint="İçeriği paylaşan kişiden ses listesini güncellemesini isteyebilir veya destek ekibine ulaşabilirsiniz."
      />
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-white">
      <section className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8" aria-labelledby="audio-title">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/20">
            <Music size={24} className="text-violet-300" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-violet-300">Ses listesi</p>
            <h1 id="audio-title" className="truncate text-xl font-bold">{title}</h1>
          </div>
        </div>

        {playbackError && (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-100">
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> {playbackError}
          </p>
        )}

        <ol className="space-y-3">
          {safeTracks.map((track, index) => (
            <li key={`${track.url}-${index}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <button
                type="button"
                onClick={() => void toggle(index, track.url)}
                aria-label={playing === index ? `${track.title} parçasını duraklat` : `${track.title} parçasını oynat`}
                aria-pressed={playing === index}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 transition-colors hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {playing === index ? <Pause size={17} aria-hidden="true" /> : <Play size={17} className="ml-0.5" aria-hidden="true" />}
              </button>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{track.title}</span>
              <a
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${track.title} ses dosyasını yeni sekmede aç`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-5 text-sm font-bold">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-slate-300 underline decoration-white/20 underline-offset-4 hover:text-white">
            <Home size={15} aria-hidden="true" /> Ana sayfa
          </Link>
          <Link href="/support" className="min-h-11 content-center text-slate-300 underline decoration-white/20 underline-offset-4 hover:text-white">Destek</Link>
        </div>
      </section>
    </main>
  );
}
