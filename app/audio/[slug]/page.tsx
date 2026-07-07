"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Music, Play, Pause, ExternalLink } from "lucide-react";

interface QrData {
  title: string;
  target_url: string;
}

function parseM3u(content: string): { title: string; url: string }[] {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const tracks: { title: string; url: string }[] = [];
  let pendingTitle = "";
  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) {
      pendingTitle = line.split(",").slice(1).join(",") || `Track ${tracks.length + 1}`;
    } else if (!line.startsWith("#")) {
      tracks.push({ title: pendingTitle || `Track ${tracks.length + 1}`, url: line });
      pendingTitle = "";
    }
  }
  return tracks;
}

export default function AudioQrPage() {
  const params = useParams<{ slug: string }>();
  const [qr, setQr] = useState<QrData | null>(null);
  const [tracks, setTracks] = useState<{ title: string; url: string }[]>([]);
  const [playing, setPlaying] = useState<number | null>(null);
  const [audio] = useState(() => typeof window !== "undefined" ? new Audio() : null);

  useEffect(() => {
    fetch(`/api/v1/qr/instant?slug=${params.slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.qr) return;
        setQr(data.qr);
        setTracks(parseM3u(data.qr.target_url || ""));
      })
      .catch(() => {});
  }, [params.slug]);

  const toggle = (index: number, url: string) => {
    if (!audio) return;
    if (playing === index) {
      audio.pause();
      setPlaying(null);
    } else {
      audio.src = url;
      audio.play().catch(() => {});
      setPlaying(index);
    }
  };

  useEffect(() => {
    if (!audio) return;
    audio.onended = () => setPlaying(null);
    return () => { audio.pause(); };
  }, [audio]);

  if (!qr) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-slate-400 text-sm">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="relative z-10 max-w-lg w-full">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Music size={24} className="text-violet-400" />
            </div>
            <h1 className="text-xl font-bold text-white">{qr.title}</h1>
          </div>
          <div className="space-y-3">
            {tracks.map((track, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <button
                  onClick={() => toggle(i, track.url)}
                  className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center shrink-0 transition-colors"
                >
                  {playing === i ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
                </button>
                <span className="text-white text-sm font-medium flex-1 truncate">{track.title}</span>
                <a href={track.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200 transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
            {tracks.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">Ses dosyası bulunamadı.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
