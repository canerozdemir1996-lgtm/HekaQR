import type { NextAuthOptions, DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { createClient } from "@supabase/supabase-js";
import { isRootOwnerEmail, roleFromMetadata } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "owner" | "admin" | "user";
    } & DefaultSession["user"];
    mfaRequired?: boolean;
    mfaVerified?: boolean;
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
  }
}

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

async function findSupabaseUserByEmail(email?: string | null) {
  if (!supabase || !email) return null;
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) return null;
  return data.users.find(item => item.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function syncRootOwnerRole(userId: string, email?: string | null, currentUserMetadata?: Record<string, unknown> | null, currentAppMetadata?: Record<string, unknown> | null) {
  if (!supabase || !isRootOwnerEmail(email)) return;
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...(currentUserMetadata ?? {}), role: "owner" },
    app_metadata: { ...(currentAppMetadata ?? {}), role: "owner" },
  });
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
      },
      async authorize(credentials) {
        if (!supabase) throw new Error("Supabase not configured");
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
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
            }
          } else {
            // 3. Varsa mevcut UUID'sini kullan
            user.id = existingUser.id;
            await syncRootOwnerRole(existingUser.id, existingUser.email, existingUser.user_metadata, existingUser.app_metadata);
            user.role = roleFromMetadata(existingUser);
          }
        } catch (error) {
          console.error("OAuth Sync Error:", error);
        }
        return true;
      }

      return true; // Credentials provider is handled by Supabase
    },

    // ─── JWT Callback ─────────────────────────────────────────
    async jwt({ token, user, account }) {
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
      }

      // Her sayfa yenilemesinde rolü Supabase'den zorla güncelle (Admin API ile)
      if (token.id && supabase) {
        try {
          const { data: roleData, error } = await supabase.auth.admin.getUserById(token.id as string);
          const authUser = !error && roleData?.user
            ? roleData.user
            : await findSupabaseUserByEmail(token.email as string | undefined);
          if (authUser) {
            token.id = authUser.id;
            await syncRootOwnerRole(authUser.id, authUser.email, authUser.user_metadata, authUser.app_metadata);
            token.role = roleFromMetadata(authUser);
            token.email = authUser.email ?? token.email;
            token.name = (authUser.user_metadata?.full_name as string | undefined)
              ?? (authUser.user_metadata?.name as string | undefined)
              ?? token.name;
            token.image = (authUser.user_metadata?.avatar_url as string | undefined) ?? token.image;
          }
        } catch {
          // Hata durumunda yoksay
        }
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

      // MFA status check
      if (supabase && token.id) {
        try {
          const { data: mfaStatus } = await supabase
            .from("user_mfa_settings")
            .select("mfa_enabled, verified")
            .eq("user_id", token.id as string)
            .maybeSingle();

          token.mfaRequired = mfaStatus?.mfa_enabled && !mfaStatus?.verified;
          token.mfaVerified = mfaStatus?.verified;
        } catch {
          token.mfaRequired = false;
        }
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
