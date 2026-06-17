import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth, signIn, enabledProviders } from "@/auth";

export const metadata: Metadata = { title: "Sign in — Game Checker" };

const PROVIDER_LABELS: Record<string, string> = {
  github: "Continue with GitHub",
  google: "Continue with Google",
};

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/consoles");

  const providers = enabledProviders();

  return (
    <div className="card-surface mx-auto max-w-md p-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-primary text-2xl shadow-soft">
        🕹️
      </span>
      <h1 className="mt-4 text-2xl font-extrabold">Welcome to Game Checker</h1>
      <p className="mt-2 text-ink-soft">
        Sign in to save your consoles and game library.
      </p>

      {providers.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
          No OAuth providers are configured. Set <code>AUTH_GITHUB_ID</code> /
          <code>AUTH_GOOGLE_ID</code> (and their secrets) in your environment.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {providers.map((provider) => (
            <form
              key={provider}
              action={async () => {
                "use server";
                await signIn(provider, { redirectTo: "/welcome" });
              }}
            >
              <button
                type="submit"
                className="w-full rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong"
              >
                {PROVIDER_LABELS[provider] ?? `Continue with ${provider}`}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
