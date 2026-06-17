import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

// Enable only the OAuth providers that have credentials configured, so the app
// boots with whichever the operator set up (Auth.js auto-reads AUTH_<PROVIDER>_*).
const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub);
}
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers,
  pages: { signIn: "/signin" },
  callbacks: {
    // Expose the DB user id on the session (database strategy passes `user`).
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});

/** Names of the providers that are actually configured (for the sign-in UI). */
export function enabledProviders(): string[] {
  return providers
    .map((p) => (typeof p === "function" ? p().id : p.id))
    .filter(Boolean) as string[];
}
