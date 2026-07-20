"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  Clock3,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { withNextParam } from "@/lib/auth-redirect";

interface InvitePreview {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Yönetici",
  editor: "Editör",
  viewer: "Görüntüleyici",
};

export default function InviteAcceptanceClient({ token }: { token: string }) {
  const router = useRouter();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [acceptedOrgId, setAcceptedOrgId] = useState("");

  const nextPath = `/invite/${encodeURIComponent(token)}`;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/v1/organizations/invites/${encodeURIComponent(token)}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof body?.error === "string" ? body.error : "Davet yüklenemedi.");
        }
        setInvite(body.invite ?? null);
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Davet yüklenemedi.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  async function acceptInvite() {
    setAccepting(true);
    setAuthRequired(false);
    setError("");

    try {
      const response = await fetch(`/api/v1/organizations/invites/${encodeURIComponent(token)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
      const body = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (!response.ok) {
        throw new Error(typeof body?.error === "string" ? body.error : "Davet kabul edilemedi.");
      }

      const orgId = typeof body?.org_id === "string" ? body.org_id : invite?.organization?.id ?? "";
      setAcceptedOrgId(orgId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Davet kabul edilemedi.");
    } finally {
      setAccepting(false);
    }
  }

  const organizationName = invite?.organization?.name ?? "Organizasyon";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12 text-slate-900 dark:bg-[#020617] dark:text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-700/20" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-700/20" />
      </div>

      <section className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl shadow-slate-200/70 backdrop-blur sm:p-9 dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/30" aria-labelledby="invite-title">
        <div className="mb-7 flex justify-center">
          <Link href="/" aria-label="QR Publish ana sayfası">
            <BrandLogo className="h-12 w-40" priority />
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3" role="status">
            <Loader2 className="animate-spin text-violet-600" size={30} />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Davet bilgileri yükleniyor…</p>
          </div>
        ) : error && !invite ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
              <AlertCircle size={25} />
            </div>
            <h1 id="invite-title" className="mt-5 text-2xl font-black">Davet kullanılamıyor</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">{error}</p>
            <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
              Ana sayfaya dön
            </Link>
          </div>
        ) : acceptedOrgId ? (
          <div className="py-6 text-center" aria-live="polite">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Check size={30} />
            </div>
            <h1 id="invite-title" className="mt-5 text-2xl font-black">Ekibe katıldınız</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {organizationName} organizasyonuna erişiminiz hazır.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/organizations/${acceptedOrgId}`)}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-500"
            >
              Organizasyonu aç <ArrowRight size={17} />
            </button>
          </div>
        ) : invite ? (
          <div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
                {invite.organization?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={invite.organization.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 size={28} />
                )}
              </div>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Organizasyon daveti</p>
              <h1 id="invite-title" className="mt-2 text-2xl font-black sm:text-3xl">{organizationName} ekibine katılın</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                Bu davet yalnızca <strong>{invite.email}</strong> adresiyle kullanılabilir.
              </p>
            </div>

            <dl className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><ShieldCheck size={14} /> Rol</dt>
                <dd className="mt-2 text-sm font-black">{ROLE_LABEL[invite.role] ?? invite.role}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><Clock3 size={14} /> Son kullanım</dt>
                <dd className="mt-2 text-sm font-black">{new Date(invite.expires_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</dd>
              </div>
            </dl>

            {error && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" role="alert">
                <AlertCircle className="mt-0.5 shrink-0" size={16} /> {error}
              </div>
            )}

            {authRequired ? (
              <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/30 dark:bg-violet-500/10" aria-live="polite">
                <p className="flex items-center gap-2 text-sm font-black text-violet-900 dark:text-violet-100"><Mail size={16} /> Devam etmek için oturum açın</p>
                <p className="mt-1 text-xs leading-5 text-violet-800 dark:text-violet-200">Davetin gönderildiği {invite.email} hesabıyla giriş yapın veya yeni hesap oluşturun. Girişten sonra bu davet sayfasına geri döneceksiniz.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Link href={withNextParam("/login", nextPath)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition-colors hover:bg-violet-500">
                    <LogIn size={16} /> Giriş yap
                  </Link>
                  <Link href={withNextParam("/signup", nextPath)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white px-4 text-sm font-black text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-400/30 dark:bg-transparent dark:text-violet-100 dark:hover:bg-white/5">
                    <UserPlus size={16} /> Hesap oluştur
                  </Link>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={acceptInvite}
                disabled={accepting}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {accepting ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
                {accepting ? "Davet kabul ediliyor…" : "Daveti kabul et"}
              </button>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
