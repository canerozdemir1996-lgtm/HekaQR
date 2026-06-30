import type { NextAuthOptions, DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { isRootOwnerEmail, roleFromMetadata } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "owner" | "admin" | "user";
    } & DefaultSession["user"];
    mfaRequired?: boolean;
    mfaVerified?: boolean;
    mfaEnabled?: boolean;
    mfaChallengeCompleted?: boolean;
  }

  interface User {
    id: string;
    role?: "owner" | "admin" | "user";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "owner" | "admin" | "user";
    provider?: string;
    accessToken?: string;
    mfaRequired?: boolean;
    mfaVerified?: boolean;
    mfaEnabled?: boolean;
    mfaChallengeCompleted?: boolean;
    verifiedAt?: number;
  }
}

// jwt callback, getServerSession()/getToken() her çağrıldığında (yani her API
// route'ta authRequest() üzerinden, pratikte sayfa başına birkaç kez) çalışır.
// Önceden rol + MFA durumu HER ÇALIŞMADA Supabase Admin API'ye 2-3 ayrı network
// isteğiyle yeniden doğrulanıyordu — sil/güncelle gibi her mutasyon isteğine
// gözle görülür gecikme ekliyordu. Rol/MFA değişiklikleri saniyeler içinde
// yansımak zorunda değil; bu pencere içinde token'daki önbelleklenmiş değerler
// kullanılır, süre dolunca tek seferde yeniden doğrulanır.
const ROLE_REVALIDATE_INTERVAL_MS = 20 * 60 * 1000;

// Process-level revalidation guard: JWT callback her request'te çalışır.
// Cookie henüz set edilmemiş olabileceğinden aynı kullanıcı için eş zamanlı
// N request gelirse hepsi needsRevalidation=true görür ve Supabase'i N kez
// çarpıyor (özellikle 522/timeout dönerken SSE yeniden bağlanması bunu tetikler).
// Bu cache ile: hangi request olursa olsun, bir user için sadece
// ROLE_REVALIDATE_INTERVAL_MS içinde tek seferlik Supabase çağrısı yapılır.
const _jwtRevalCache = new Map<string, number>(); // userId → lastAttemptedAt ms

// Safe Supabase init for build-time (avoid requiring env vars during build)
const supabase = (() => {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  } catch {
    return null;
  }
})();

// listUsers({perPage:1000}) tüm kullanıcı tablosunu çekiyor — pahalı fallback.
// 30 saniyelik TTL cache ile çoğu tekrar çağrıda listUsers atlanır.
const AUTH_EMAIL_CACHE_TTL_MS = 30_000;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authEmailCache = new Map<string, { user: any; expiresAt: number }>();

async function findSupabaseUserByEmail(email?: string | null) {
  if (!supabase || !email) return null;
  const key = email.toLowerCase();
  const cached = authEmailCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.user;
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) return null;
  const user = data.users.find(item => item.email?.toLowerCase() === key) ?? null;
  if (user) authEmailCache.set(key, { user, expiresAt: Date.now() + AUTH_EMAIL_CACHE_TTL_MS });
  return user;
}

async function syncRootOwnerRole(userId: string, email?: string | null, currentUserMetadata?: Record<string, unknown> | null, currentAppMetadata?: Record<string, unknown> | null) {
  if (!supabase || !isRootOwnerEmail(email)) return;
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...(currentUserMetadata ?? {}), role: "owner" },
    app_metadata: { ...(currentAppMetadata ?? {}), role: "owner" },
  });
}

async function touchProfileLogin(userId: string, user?: { name?: string | null; image?: string | null }) {
  if (!supabase || !userId) return;
  const now = new Date().toISOString();
  try {
    const { error } = await Promise.race([
      supabase.from("profiles").upsert({
        user_id: userId,
        full_name: user?.name ?? null,
        avatar_url: user?.image ?? null,
        last_login_at: now,
        updated_at: now,
      }, { onConflict: "user_id" }),
      new Promise<{ error: { code: string; message: string } }>((_, rej) =>
        setTimeout(() => rej(new Error("sb_touch_timeout")), 3000)),
    ]);
    if (error) console.error("[touchProfileLogin] profiles upsert failed", { userId, code: error.code, message: error.message });
  } catch (e) {
    if (e instanceof Error && e.message !== "sb_touch_timeout") {
      console.error("[touchProfileLogin] unexpected error", { userId, err: String(e) });
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // ─── Google OAuth ─────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub, // Google's unique ID
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),

    // ─── GitHub OAuth ─────────────────────────────────────────
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.id.toString(), // GitHub's numeric ID
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),

    // ─── Email/Password (Supabase İle) ───────────────────────
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!supabase) {
          Sentry.captureMessage("Supabase Auth client not configured at login time", { level: "error", tags: { area: "auth-credentials" } });
          throw new Error("Supabase not configured");
        }
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const ip = String(req?.headers?.["x-forwarded-for"] ?? "").split(",")[0]?.trim() || "unknown";
        if (!checkRateLimit(`login_ip:${ip}`, RATE_LIMITS.AUTH_IP.max, RATE_LIMITS.AUTH_IP.windowMs)) {
          throw new Error("Çok fazla giriş denemesi. Lütfen biraz sonra tekrar deneyin.");
        }
        if (!checkRateLimit(`login:${credentials.email.toLowerCase()}`, RATE_LIMITS.AUTH.max, RATE_LIMITS.AUTH.windowMs)) {
          throw new Error("Çok fazla giriş denemesi. Lütfen biraz sonra tekrar deneyin.");
        }

        try {
          // Supabase ile auth yap
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error || !data.user) {
            throw new Error(error?.message || "Invalid credentials");
          }

          // 2FA: kullanıcı etkinleştirmişse şifre doğrulamasından sonra TOTP kodu da iste.
          // Bu blok hata verirse (tablo yok/sorgu başarısız) sessizce 2FA'yı atlar —
          // bir altyapı arızası asla mevcut kullanıcıları giriş yapamaz hale getirmemeli.
          try {
            const { data: mfaSettings, error: mfaDbError } = await supabase
              .from("user_mfa_settings")
              .select("mfa_enabled, verified, totp_secret")
              .eq("user_id", data.user.id)
              .maybeSingle();

            if (mfaDbError) {
              console.error("[MFA] user_mfa_settings query failed:", { userId: data.user.id, code: mfaDbError.code, message: mfaDbError.message });
            } else {
              console.log("[MFA] settings:", { userId: data.user.id, enabled: mfaSettings?.mfa_enabled, verified: mfaSettings?.verified, hasSecret: !!mfaSettings?.totp_secret });
            }

            if (mfaSettings?.mfa_enabled && mfaSettings?.verified && mfaSettings?.totp_secret) {
              // "undefined" kontrolü: next-auth'un signIn() body'si URLSearchParams ile
              // kodlanıyor, value undefined olunca literal "undefined" string'i gönderilir.
              const totpCodeRaw = String(credentials.totpCode ?? "").trim();
              const totpCode = totpCodeRaw === "undefined" ? "" : totpCodeRaw;
              console.log("[MFA] totpCode provided:", !!totpCode, "raw:", JSON.stringify(totpCodeRaw));
              if (!totpCode) {
                throw new Error("MFA_REQUIRED");
              }
              const { validateMFACode } = await import("@/lib/services/mfaService");
              const valid = await validateMFACode(data.user.id, totpCode);
              if (!valid) {
                throw new Error("MFA_INVALID");
              }
            }
          } catch (mfaError) {
            if (mfaError instanceof Error && (mfaError.message === "MFA_REQUIRED" || mfaError.message === "MFA_INVALID")) {
              throw mfaError;
            }
            console.error("[MFA] Unexpected error in MFA check (bypassing):", mfaError);
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name,
            image: data.user.user_metadata?.avatar_url,
            role: roleFromMetadata(data.user),
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Auth failed");
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login?error=true",
    verifyRequest: "/auth/verify",
  },

  callbacks: {
    // ─── Sign In Callback ─────────────────────────────────────
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      // Credentials: Supabase handles auth
      if (account?.provider !== "credentials") {
        if (!supabase) return true;
        try {
          // 1. E-posta ile kullanıcıyı Supabase Admin API ile ara
          const existingUser = await findSupabaseUserByEmail(user.email);

          if (!existingUser) {
            // 2. Kullanıcı DB'de yoksa, Supabase Admin API ile hemen oluştur
            const { data: newUser, error } = await supabase.auth.admin.createUser({
              email: user.email,
              email_confirm: true,
              user_metadata: { name: user.name, avatar_url: user.image },
              app_metadata: { role: isRootOwnerEmail(user.email) ? "owner" : "user" },
            });
            if (!error && newUser.user) {
              user.id = newUser.user.id; // Gerçek UUID'yi NextAuth'a aktar
              await syncRootOwnerRole(newUser.user.id, newUser.user.email, newUser.user.user_metadata, newUser.user.app_metadata);
              user.role = roleFromMetadata(newUser.user);
              await touchProfileLogin(newUser.user.id, user);
            }
          } else {
            // 3. Varsa mevcut UUID'sini kullan
            user.id = existingUser.id;
            await syncRootOwnerRole(existingUser.id, existingUser.email, existingUser.user_metadata, existingUser.app_metadata);
            user.role = roleFromMetadata(existingUser);
            await touchProfileLogin(existingUser.id, user);
          }
        } catch (error) {
          console.error("OAuth Sync Error:", error);
          Sentry.captureException(error, { tags: { area: "auth-oauth-sync" }, extra: { provider: account?.provider } });
        }
        return true;
      }

      await touchProfileLogin(user.id, user);
      return true; // Credentials provider is handled by Supabase
    },

    // ─── JWT Callback ─────────────────────────────────────────
    async jwt({ token, user, account, trigger, session }) {
      // session.update({ mfaChallengeCompleted: true }) — OAuth 2FA challenge tamamlandı
      if (trigger === "update" && (session as { mfaChallengeCompleted?: boolean })?.mfaChallengeCompleted === true) {
        token.mfaChallengeCompleted = true;
        return token;
      }

      // İlk login'de user object'i gelir
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;

        // session.user.role yoksa ve Supabase varsa, metadata'dan rol almaya çalış
        if (user.role) {
          token.role = user.role;
        } else if (supabase && user.id) {
          try {
            const { data: roleData, error: roleError } = await supabase.auth.admin.getUserById(user.id);
            if (!roleError && roleData?.user) {
              token.role = roleFromMetadata(roleData.user);
            }
          } catch {
            // Role alınamazsa user olarak bırak
          }
        }

        // Credentials kullanıcıları: 2FA authorize() içinde doğrulandı, challenge tamamlandı.
        // OAuth kullanıcıları: 2FA henüz kontrol edilmedi; MFA durumuna göre set edilecek.
        const isCredentials = account?.provider === "credentials";
        if (isCredentials) {
          token.mfaChallengeCompleted = true;
          token.mfaEnabled = false;
        } else if (supabase && user.id) {
          try {
            const { data: mfaStatus } = await supabase
              .from("user_mfa_settings")
              .select("mfa_enabled, verified")
              .eq("user_id", user.id)
              .maybeSingle();
            const hasMfa = Boolean(mfaStatus?.mfa_enabled && mfaStatus?.verified);
            token.mfaEnabled = hasMfa;
            token.mfaChallengeCompleted = !hasMfa;
          } catch {
            token.mfaEnabled = false;
            token.mfaChallengeCompleted = true;
          }
        } else {
          token.mfaEnabled = false;
          token.mfaChallengeCompleted = true;
        }

        token.verifiedAt = Date.now();
      }

      const needsRevalidation = !token.verifiedAt || Date.now() - token.verifiedAt > ROLE_REVALIDATE_INTERVAL_MS;

      // Rolü ve MFA durumunu periyodik olarak Supabase'den doğrula (Admin API).
      // Her iki sorgu paralel çalışır; syncRootOwnerRole her 5 dk'da yazma
      // yapmak yerine sadece login sırasında signIn callback'inde tetiklenir.
      // findSupabaseUserByEmail fallback'i kaldırıldı: token.id zaten UUID,
      // getUserById başarısız olursa mevcut token değerleri korunur.
      // Process cache kontrolü: aynı user için ROLE_REVALIDATE_INTERVAL_MS içinde
      // sadece bir kez Supabase'e gidilir. Cookie güncellemesi SSE yeniden bağlanması
      // gibi durumlar nedeniyle client'a ulaşmadan önce request tamamlanabilir;
      // process cache bunu önler.
      const cachedAttempt = token.id ? _jwtRevalCache.get(token.id as string) : null;
      if (cachedAttempt && Date.now() - cachedAttempt < ROLE_REVALIDATE_INTERVAL_MS) {
        // Zaten yakın zamanda denedik (başarılı ya da başarısız) — atla
        token.verifiedAt = cachedAttempt;
      }
      const skipRevalidation = Boolean(cachedAttempt && Date.now() - cachedAttempt < ROLE_REVALIDATE_INTERVAL_MS);

      if (needsRevalidation && !skipRevalidation && token.id && supabase) {
        // Supabase timeout (522/HeadersTimeoutError) durumunda bu blok
        // session endpoint'ini sonsuza kadar bloklamamalı. 4 sn timeout
        // aşılırsa mevcut token değerleri olduğu gibi korunur.
        _jwtRevalCache.set(token.id as string, Date.now()); // deneme başlamadan işaretle
        const sbTimeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("sb_revalidate_timeout")), 4000));

        const [roleResult, mfaResult] = await Promise.allSettled([
          Promise.race([supabase.auth.admin.getUserById(token.id as string), sbTimeout]),
          Promise.race([
            supabase
              .from("user_mfa_settings")
              .select("mfa_enabled, verified")
              .eq("user_id", token.id as string)
              .maybeSingle() as unknown as Promise<{ data: { mfa_enabled: boolean; verified: boolean } | null; error: unknown }>,
            sbTimeout,
          ]),
        ]);

        if (roleResult.status === "fulfilled" && !roleResult.value.error && roleResult.value.data?.user) {
          const authUser = roleResult.value.data.user;
          token.id = authUser.id;
          token.role = roleFromMetadata(authUser);
          token.email = authUser.email ?? token.email;
          token.name = (authUser.user_metadata?.full_name as string | undefined)
            ?? (authUser.user_metadata?.name as string | undefined)
            ?? token.name;
          token.image = (authUser.user_metadata?.avatar_url as string | undefined) ?? token.image;
        }

        if (mfaResult.status === "fulfilled") {
          const mfaStatus = mfaResult.value.data;
          token.mfaRequired = mfaStatus?.mfa_enabled && !mfaStatus?.verified;
          token.mfaVerified = mfaStatus?.verified;
          const hasMfa = Boolean(mfaStatus?.mfa_enabled && mfaStatus?.verified);
          token.mfaEnabled = hasMfa;
          if (!hasMfa) token.mfaChallengeCompleted = true;
        }

        token.verifiedAt = Date.now();
      }

      // Güvenlik: Eğer hala bir rol atanamadıysa varsayılan user yap
      if (!token.role) {
        token.role = "user";
      }
      if (isRootOwnerEmail(token.email as string | undefined)) {
        token.role = "owner";
      }

      if (account) {
        token.provider = account.provider;
        token.accessToken = account.access_token;
      }

      return token;
    },

    // ─── Session Callback ──────────────────────────────────────
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "owner" | "admin" | "user") ?? "user";
        session.mfaRequired = token.mfaRequired as boolean;
        session.mfaVerified = token.mfaVerified as boolean;
        session.mfaEnabled = token.mfaEnabled as boolean;
        session.mfaChallengeCompleted = token.mfaChallengeCompleted as boolean;
      }
      return session;
    },

    // ─── Redirect Callback ──────────────────────────────────────
    async redirect({ url, baseUrl }) {
      // Relative URLs (örn: /dashboard)
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      // Same origin URLs
      if (new URL(url).origin === baseUrl) return url;

      return baseUrl;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 gün
    updateAge: 24 * 60 * 60, // 1 gün
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET!,

  events: {
    async signIn({ user }) {
      if (!supabase || !user.id) return;
      
      // Log sign in
      try {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action: "signin",
          resource: "auth",
          status: "success",
        });
      } catch {
        // Silently fail
      }
    },

    async signOut() {
      // Log sign out
    },
  },
};
