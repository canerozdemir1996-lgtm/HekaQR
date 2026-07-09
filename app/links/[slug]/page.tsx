import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import MultiLinkPageView from "@/components/MultiLinkPageView";
import { normalizeMultiLinkData, type MultiLinkData } from "@/lib/multi-link";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";

export const dynamic = "force-dynamic";

function getPublicLinksClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchLinkQr(slug: string) {
  const sb = getPublicLinksClient();
  const { data } = await sb
    .from("qr_codes")
    .select("title,short_slug,is_active,qr_type,dynamic_content,user_id")
    .ilike("short_slug", slug)
    .maybeSingle();

  return data as {
    title: string;
    short_slug: string;
    is_active: boolean;
    qr_type: string | null;
    dynamic_content: MultiLinkData | null;
    user_id: string;
  } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const qr = await fetchLinkQr(slug);
  const page = normalizeMultiLinkData(qr?.dynamic_content);
  const profileName = page.profileName.trim() || qr?.title || "Multi URL";

  return {
    title: profileName,
    description: page.headline || page.subheadline || "Multi URL landing page",
  };
}

export default async function LinksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const qr = await fetchLinkQr(slug);

  if (qr?.is_active === false) redirect("/inactive");

  if (!qr || (qr.qr_type !== "multi" && qr.dynamic_content?.kind !== "multi")) {
    notFound();
  }

  // Bu sunucu birden fazla müşterinin custom domain'ini tek bir app
  // instance'ına proxy'liyor (nginx). İstek bir müşterinin kendi doğrulanmış
  // domain'i üzerinden geldiyse, sadece o domain'in sahibine ait QR gösterilebilir.
  const host = (await headers()).get("host");
  const domainOwnerId = await resolveVerifiedDomainOwnerId(host, getPublicLinksClient());
  if (domainOwnerId && domainOwnerId !== qr.user_id) notFound();

  return <MultiLinkPageView data={normalizeMultiLinkData(qr.dynamic_content)} title={qr.title} />;
}
