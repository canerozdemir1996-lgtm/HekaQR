import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import MultiLinkPageView from "@/components/MultiLinkPageView";
import { normalizeMultiLinkData, type MultiLinkData } from "@/lib/multi-link";

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
    .select("title,short_slug,is_active,qr_type,dynamic_content")
    .ilike("short_slug", slug)
    .maybeSingle();

  return data as {
    title: string;
    short_slug: string;
    is_active: boolean;
    qr_type: string | null;
    dynamic_content: MultiLinkData | null;
  } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const qr = await fetchLinkQr(slug);
  const page = normalizeMultiLinkData(qr?.dynamic_content);
  const profileName = page.profileName.trim() || qr?.title || "Multi URL";

  return {
    title: `${profileName} | QR Publish`,
    description: page.headline || page.subheadline || "Multi URL landing page",
  };
}

export default async function LinksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const qr = await fetchLinkQr(slug);

  if (!qr || !qr.is_active || (qr.qr_type !== "multi" && qr.dynamic_content?.kind !== "multi")) {
    notFound();
  }

  return <MultiLinkPageView data={normalizeMultiLinkData(qr.dynamic_content)} title={qr.title} />;
}
