import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { sbAdmin } from "@/lib/server/api-helpers";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";
import { buildNoIndexMetadata } from "@/lib/seo";
import { normalizeSlug } from "@/lib/slug";
import PublicQrStatusPage from "@/components/public/PublicQrStatusPage";
import AudioPlayerClient, { type AudioTrack } from "./AudioPlayerClient";

export const dynamic = "force-dynamic";

function parseM3u(content: string): AudioTrack[] {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const tracks: AudioTrack[] = [];
  let pendingTitle = "";
  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) {
      pendingTitle = line.split(",").slice(1).join(",").trim() || `Parça ${tracks.length + 1}`;
    } else if (!line.startsWith("#") && /^(https?:)?\/\//i.test(line)) {
      tracks.push({ title: pendingTitle || `Parça ${tracks.length + 1}`, url: line });
      pendingTitle = "";
    }
  }
  return tracks;
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Ses içeriği zaman aşımına uğradı.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const loadAudioQr = cache(async (slug: string) => {
  const normalizedSlug = normalizeSlug(slug, { maxLength: 40 });
  const result = await withTimeout(
    sbAdmin()
      .from("qr_codes")
      .select("title,short_slug,is_active,qr_type,target_url,user_id")
      .eq("short_slug", normalizedSlug)
      .maybeSingle(),
    10_000,
  );
  if (result.error) throw new Error("Ses içeriği şu anda alınamıyor.");
  return result.data;
});

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  try {
    const { slug } = await Promise.resolve(params);
    const qr = await loadAudioQr(slug);
    return {
      ...buildNoIndexMetadata(qr?.title ? `${qr.title} · Ses Listesi` : "Ses Listesi"),
      description: qr?.title ? `${qr.title} ses listesini dinleyin.` : "QR koduyla paylaşılan ses listesini dinleyin.",
    };
  } catch {
    return buildNoIndexMetadata("Ses Listesi");
  }
}

export default async function AudioQrPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = await Promise.resolve(params);
  const qr = await loadAudioQr(slug);

  if (qr) {
    const host = (await headers()).get("host");
    const domainOwnerId = await resolveVerifiedDomainOwnerId(host, sbAdmin());
    if (domainOwnerId && domainOwnerId !== qr.user_id) notFound();
  }

  if (qr?.is_active === false) redirect("/inactive");

  if (!qr || qr.qr_type !== "audio") {
    return (
      <PublicQrStatusPage
        locale="tr"
        tone="error"
        eyebrow="Ses bağlantısı geçersiz"
        title="Ses içeriği bulunamadı"
        description="Bu ses QR kodu kaldırılmış, hatalı yazılmış veya artık kullanılmıyor olabilir."
        ownerHint="QR kodunu yeniden tarayın. Sorun devam ederse içeriği paylaşan kişiden güncel bağlantıyı isteyin."
      />
    );
  }

  return <AudioPlayerClient title={qr.title} tracks={parseM3u(qr.target_url || "")} />;
}
