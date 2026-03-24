import type { NextAuthOptions, DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { createClient } from "@supabase/supabase-js";

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
            name: data.user.user_metadata?.name,
            image: data.user.user_metadata?.avatar_url,
            role: data.user.user_metadata?.role || "user",
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

      // OAuth providers: accept as-is (Google/GitHub handle user creation)
      // Credentials: Supabase handles auth
      if (account?.provider !== "credentials") {
        return true; // Accept OAuth users directly
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
            if (!roleError && roleData?.user?.user_metadata?.role) {
              token.role = roleData.user.user_metadata.role as "owner" | "admin" | "user";
            }
          } catch {
            // Role alınamazsa user olarak bırak
          }
        }
      }

      // Token refresh'lendiğinde (subsequent calls), email ile user'ı tekrar ara
      if (!token.id && token.email && supabase) {
        try {
          const { data } = await supabase
            .from("auth.users")
            .select("id")
            .eq("email", token.email as string)
            .maybeSingle();

          if (data?.id) {
            token.id = data.id;
          }
        } catch {
          // User not found, that's okay
        }
      }

      // Her sayfa yenilemesinde rolü Supabase'den zorla güncelle 
      // (Tarayıcı çerezlerini temizlemeye gerek kalmadan anında Owner yapar)
      if (token.email && supabase) {
        try {
          const { data: authUser } = await supabase
            .from("auth.users")
            .select("raw_user_meta_data")
            .eq("email", token.email as string)
            .maybeSingle();

          if (authUser?.raw_user_meta_data?.role) {
            token.role = authUser.raw_user_meta_data.role as "owner" | "admin" | "user";
          }
        } catch {
          // Hata durumunda yoksay
        }
      }

      // Güvenlik: Eğer hala bir rol atanamadıysa varsayılan user yap
      if (!token.role) {
        token.role = "user";
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
      if (!supabase || !user.email) return;
      
      // Log sign in
      try {
        const { data: userData } = await supabase
          .from("auth.users")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        if (userData) {
          await supabase.from("audit_logs").insert({
            user_id: userData.id,
            action: "signin",
            resource: "auth",
            status: "success",
          });
        }
      } catch {
        // Silently fail
      }
    },

    async signOut() {
      // Log sign out
    },
  },
};
