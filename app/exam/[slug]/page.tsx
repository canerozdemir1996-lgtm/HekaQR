import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { resolveVerifiedDomainOwnerId } from "@/lib/domains/resolveDomainOwner";
import { isExamOpen, normalizeExamConfig, sanitizeExamForPublic } from "@/lib/exam";
import { sbAdmin } from "@/lib/server/api-helpers";
import ExamPageClient from "./ExamPageClient";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ExamPage(
  props: {
    params: Promise<{ slug: string }>;
    searchParams?: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug } = await Promise.resolve(params);
  const query = searchParams ? await Promise.resolve(searchParams) : {};
  const submissionId = Array.isArray(query.submission) ? query.submission[0] : query.submission;

  const sb = sbAdmin();
  const { data } = await sb
    .from("qr_codes")
    .select("id,title,short_slug,is_active,qr_type,dynamic_content,user_id")
    .eq("short_slug", slug.toLowerCase())
    .is("deleted_at", null)
    .maybeSingle();

  if (data) {
    const host = (await headers()).get("host");
    const domainOwnerId = await resolveVerifiedDomainOwnerId(host, sb);
    if (domainOwnerId && domainOwnerId !== data.user_id) notFound();
  }

  if (data?.is_active === false) redirect("/inactive");

  if (!data || (data.qr_type !== "quiz" && data.dynamic_content?.kind !== "exam")) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black">Sınav bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-300">Bu QR için aktif bir sınav yayında değil.</p>
        </div>
      </main>
    );
  }

  const config = normalizeExamConfig(data.dynamic_content, data.title);
  const open = isExamOpen(config);

  return (
    <ExamPageClient
      slug={slug}
      title={data.title}
      config={sanitizeExamForPublic(config)}
      availability={open}
      submissionId={submissionId}
    />
  );
}
