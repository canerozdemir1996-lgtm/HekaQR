import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { Wifi, Copy } from "lucide-react";

export const dynamic = "force-dynamic";

function getSbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

function parseWifi(raw: string): { ssid: string; password: string; security: string } {
  const unescape = (v: string) => v.replace(/\\([\\;,:])/g, "$1");
  const match = (key: string) => {
    const m = raw.match(new RegExp(`${key}:((?:[^;\\\\]|\\\\.)*)`, "i"));
    return m ? unescape(m[1]) : "";
  };
  return {
    ssid: match("S"),
    password: match("P"),
    security: match("T"),
  };
}

async function fetchWifiQr(slug: string) {
  const { data } = await getSbAdmin()
    .from("qr_codes")
    .select("title,short_slug,is_active,qr_type,target_url")
    .ilike("short_slug", slug)
    .maybeSingle();
  return data as { title: string; short_slug: string; is_active: boolean; qr_type: string | null; target_url: string | null } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const qr = await fetchWifiQr(slug);
  return { title: qr?.title || "WiFi QR" };
}

export default async function WifiQrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const qr = await fetchWifiQr(slug);

  if (!qr || !qr.is_active || qr.qr_type !== "wifi") notFound();

  const { ssid, password, security } = parseWifi(qr.target_url || "");

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-900">
      <div className="relative z-10 max-w-sm w-full">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Wifi size={32} className="text-cyan-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{qr.title}</h1>
          <p className="text-slate-400 text-sm mb-6">WiFi ağına bağlanmak için bilgileri kullanın</p>

          <div className="space-y-3 text-left">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Ağ Adı (SSID)</p>
              <p className="text-white font-semibold text-lg">{ssid || "—"}</p>
            </div>

            {security !== "nopass" && password && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Şifre</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-mono text-sm break-all">{password}</p>
                  <a
                    href={`wifi:copy:${encodeURIComponent(password)}`}
                    className="text-slate-400 hover:text-cyan-400 transition-colors shrink-0"
                    title="Kopyala"
                  >
                    <Copy size={16} />
                  </a>
                </div>
              </div>
            )}

            {security === "nopass" && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Güvenlik</p>
                <p className="text-white font-semibold">Şifresiz Ağ</p>
              </div>
            )}

            {security !== "nopass" && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Güvenlik</p>
                <p className="text-white font-semibold">{security || "WPA"}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-6">
            Telefon ayarlarından WiFi bölümüne gidin ve yukarıdaki ağı seçin.
          </p>
        </div>
      </div>
    </div>
  );
}
