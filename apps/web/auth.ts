import { findActiveUserById, findUserByEmail, provisionUser } from "@repo/db";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Provider ids, also used by the sign-in page. */
export const DEV_PROVIDER = "dev";
export const OIDC_PROVIDER = "oidc";

function providers(): NextAuthConfig["providers"] {
  const e = env();
  const list: NextAuthConfig["providers"] = [];
  if (e.devLoginEnabled) {
    // Demo only: sign in as any seeded user, no password. Never enabled for a real deployment.
    list.push(
      Credentials({
        id: DEV_PROVIDER,
        name: "Demo user",
        credentials: { userId: {} },
        authorize: async (credentials) => {
          const user = await findActiveUserById(db(), String(credentials.userId ?? ""));
          return user ? { id: user.id, name: user.name, email: user.email } : null;
        },
      }),
    );
  }
  if (e.oidcEnabled) {
    list.push({
      id: OIDC_PROVIDER,
      name: e.AUTH_OIDC_NAME,
      type: "oidc",
      issuer: e.AUTH_OIDC_ISSUER,
      clientId: e.AUTH_OIDC_CLIENT_ID,
      clientSecret: e.AUTH_OIDC_CLIENT_SECRET,
    });
  }
  return list;
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  secret: env().AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: providers(),
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== OIDC_PROVIDER) return true;
      // Just-in-time provisioning: the first SSO sign-in creates the profile (SPEC §1.14).
      if (!profile?.email) return false;
      const existing = await findUserByEmail(db(), profile.email);
      if (existing) return existing.deactivatedAt === null;
      await provisionUser(db(), { email: profile.email, name: profile.name ?? profile.email });
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === DEV_PROVIDER && user?.id) token.userId = user.id;
      if (account?.provider === OIDC_PROVIDER && profile?.email) {
        token.userId = (await findUserByEmail(db(), profile.email))?.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.userId === "string") session.user.id = token.userId;
      return session;
    },
  },
}));
