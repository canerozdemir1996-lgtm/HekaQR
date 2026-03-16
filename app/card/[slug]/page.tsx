import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { Metadata } from "next";
import VCardPageClient from "./VCardPageClient";
import type { VCardData } from "./VCardPageClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sb = getSupabase();
  const { data } = await sb.from("qr_codes").select("title").ilike("short_slug", slug).maybeSingle();
  return { title: data?.title ? `${data.title} — Dijital Kartvizit` : "Dijital Kartvizit" };
}

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = getSupabase();
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
