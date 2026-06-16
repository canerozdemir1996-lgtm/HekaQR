import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import VCardPageClient from "./VCardPageClient";
import type { VCardData } from "./VCardPageClient";

export const dynamic = "force-dynamic";

function getPublicCardClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sb = getPublicCardClient();
  const { data } = await sb.from("qr_codes").select("title").ilike("short_slug", slug).maybeSingle();
  return { title: data?.title ? `${data.title} — Dijital Kartvizit` : "Dijital Kartvizit" };
}

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = getPublicCardClient();
  const { data: qr } = await sb
    .from("qr_codes")
    .select("id,title,short_slug,vcard_data,is_active,qr_type")
    .ilike("short_slug", slug)
    .maybeSingle();

  if (!qr || !qr.is_active || qr.qr_type !== "vcard" || !qr.vcard_data) {
    notFound();
  }

  return <VCardPageClient qr={{ ...qr, vcard_data: qr.vcard_data as VCardData }} />;
}
