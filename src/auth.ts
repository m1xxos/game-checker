import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Local email/password accounts. Credentials requires JWT sessions (it can't
// persist to the DB), so the whole app uses the JWT strategy below.
const credentials = Credentials({
  credentials: { email: {}, password: {} },
  async authorize(raw) {
    const parsed = credentialsSchema.safeParse(raw);
    if (!parsed.success) return null;
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return null;
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) return null;
    return { id: user.id, email: user.email, name: user.name, image: user.image };
  },
});

const providers: NextAuthConfig["providers"] = [credentials];

// Enable OAuth providers only when their credentials are configured
// (Auth.js auto-reads AUTH_<PROVIDER>_*).
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub);
}
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/signin" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
});

/** OAuth provider ids that are configured (for the sign-in UI; excludes credentials). */
export function enabledOAuthProviders(): string[] {
  return providers
    .map((p) => (typeof p === "function" ? p().id : p.id))
    .filter((id): id is string => Boolean(id) && id !== "credentials");
}
