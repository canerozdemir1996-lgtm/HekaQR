import { NextRequest, NextResponse } from "next/server";
import { authRequest, safeDbErrorMessage, sbAdmin } from "@/lib/server/api-helpers";
import { getUserPlan } from "@/lib/check-plan";
import { PLAN_LABEL, SUB_STATUS_LABEL } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const sb = sbAdmin();
  const [userResult, profileResult, settingsResult, subscriptionResult, paymentsResult, planResult] = await Promise.all([
    sb.auth.admin.getUserById(auth.userId),
    sb.from("profiles").select("*").eq("user_id", auth.userId).maybeSingle(),
    sb.from("user_settings").select("*").eq("user_id", auth.userId).maybeSingle(),
    sb.from("subscriptions").select("*").eq("user_id", auth.userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("billing_payment_history").select("*").eq("user_id", auth.userId).order("billed_at", { ascending: false }).limit(50),
    getUserPlan(auth.userId),
  ]);

  const dbError = profileResult.error ?? settingsResult.error ?? subscriptionResult.error ?? paymentsResult.error;
  if (dbError) {
    return NextResponse.json({ error: safeDbErrorMessage(dbError, "profile.GET") }, { status: 500 });
  }
  if (userResult.error || !userResult.data.user) {
    return NextResponse.json({ error: "Hesap bilgileri bulunamadı." }, { status: 404 });
  }

  const user = userResult.data.user;
  const plan = await planResult;

  // authOptions.ts'teki touchProfileLogin() her NextAuth girişinde profiles
  // satırını oluşturur/günceller — ama "profiles" tablosu prod'a sonradan
  // eklendiği için tablo oluşmadan ÖNCE giriş yapıp o zamandan beri tekrar
  // giriş yapmamış kullanıcıların hâlâ hiç satırı yok, "Son Giriş" hep "-"
  // görünüyor. Profil sayfası ilk açıldığında satır yoksa burada bootstrap
  // ediliyor — bir sonraki gerçek girişte touchProfileLogin zaten üzerine yazar.
  const lastLoginAt = profileResult.data?.last_login_at ?? user.last_sign_in_at ?? user.created_at;
  if (!profileResult.data) {
    void sb.from("profiles").upsert({
      user_id: auth.userId,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      last_login_at: lastLoginAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).then(({ error }) => {
      if (error) console.error("[profile.GET] profiles bootstrap upsert failed", { userId: auth.userId, message: error.message });
    });
  }

  return NextResponse.json({
    account: {
      id: user.id,
      email: user.email,
      username: profileResult.data?.username ?? null,
      phone: profileResult.data?.phone ?? null,
      full_name: profileResult.data?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatar_url: profileResult.data?.avatar_url ?? settingsResult.data?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      role: auth.role ?? "user",
      email_verified: Boolean(user.email_confirmed_at),
      created_at: user.created_at,
      last_sign_in_at: lastLoginAt,
    },
    settings: settingsResult.data,
    plan: {
      key: plan.plan,
      label: PLAN_LABEL[plan.plan],
      status: plan.status,
      status_label: SUB_STATUS_LABEL[plan.status],
      expires_at: plan.expires_at,
      limits: plan.limits,
      usage: { qr_count: plan.qr_count },
      can_create_qr: plan.can_create_qr,
      at_qr_limit: plan.at_qr_limit,
    },
    subscription: subscriptionResult.data,
    payments: paymentsResult.data ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = { user_id: auth.userId, updated_at: new Date().toISOString() };

  if (typeof payload.username !== "undefined") {
    const username = String(payload.username ?? "").trim();
    if (!/^[A-Za-z0-9_-]{3,12}$/.test(username)) {
      return NextResponse.json({ error: "Kullanıcı adı 3-12 karakter olmalı; yalnızca harf, rakam, alt çizgi ve tire kullanılabilir." }, { status: 400 });
    }
    update.username = username;
  }

  if (typeof payload.phone !== "undefined") {
    const rawPhone = String(payload.phone ?? "").trim();
    if (rawPhone) {
      const digitsOnly = rawPhone.replace(/[^\d]/g, "");
      if (!/^\+?[\d\s()-]{7,20}$/.test(rawPhone) || digitsOnly.length < 10 || digitsOnly.length > 15) {
        return NextResponse.json({ error: "Telefon numarası geçersiz. Ülke koduyla birlikte girin (örn. +905551112233)." }, { status: 400 });
      }
      update.phone = rawPhone;
    } else {
      update.phone = null;
    }
  }

  if (Object.keys(update).length <= 2) {
    return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
  }

  const { data, error } = await sbAdmin()
    .from("profiles")
    .upsert(update, { onConflict: "user_id" })
    .select("user_id,username,phone,full_name,avatar_url,last_login_at,created_at,updated_at")
    .single();

  if (error?.code === "23505") return NextResponse.json({ error: "Bu kullanıcı adı başka bir hesap tarafından kullanılıyor." }, { status: 409 });
  if (error) return NextResponse.json({ error: safeDbErrorMessage(error, "profile.PATCH") }, { status: 400 });
  return NextResponse.json({ profile: data });
}
