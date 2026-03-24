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
    } & DefaultSession["user"];
    mfaRequired?: boolean;
    mfaVerified?: boolean;
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    provider?: string;
    accessToken?: string;
    mfaRequired?: boolean;
    mfaVerified?: boolean;
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const authOptions: NextAuthOptions = {
  providers: [
    // ─── Google OAuth ─────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // ─── GitHub OAuth ─────────────────────────────────────────
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // ─── Email/Password (Supabase İle) ───────────────────────
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
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

      try {
        // Supabase'de kullanıcı var mı kontrol et
        const { data: existing } = await supabase
          .from("auth.users")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        if (!existing && account?.provider !== "credentials") {
          // OAuth ile yeni kullanıcı oluştur
          const { error } = await supabase.auth.admin.createUser({
            email: user.email,
            user_metadata: {
              name: user.name,
              avatar_url: user.image,
              provider: account?.provider,
            },
            email_confirm: true, // Auto-confirm OAuth users
          });

          if (error) {
            console.error("User creation error:", error);
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return false;
      }
    },

    // ─── JWT Callback ─────────────────────────────────────────
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }

      if (account) {
        token.provider = account.provider;
        token.accessToken = account.access_token;
      }

      // MFA status check
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

      return token;
    },

    // ─── Session Callback ──────────────────────────────────────
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
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
      // Log sign in
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
    },

    async signOut() {
      // Log sign out
      // Session'dan user_id alalım
    },
  },
};
