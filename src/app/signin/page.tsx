import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth, signIn, enabledOAuthProviders } from "@/auth";
import { CredentialsForm } from "@/components/CredentialsForm";

export const metadata: Metadata = { title: "Sign in — Game Checker" };

const PROVIDER_LABELS: Record<string, string> = {
  github: "Continue with GitHub",
  google: "Continue with Google",
};

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/welcome");

  const oauth = enabledOAuthProviders();

  return (
    <div className="card-surface mx-auto max-w-md p-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-primary text-2xl shadow-soft">
        🕹️
      </span>
      <h1 className="mt-4 text-2xl font-extrabold">Welcome to Game Checker</h1>
      <p className="mt-2 text-ink-soft">
        Sign in to save your consoles and game library.
      </p>

      <div className="mt-6">
        <CredentialsForm />
      </div>

      {oauth.length > 0 && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase text-ink-soft">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="space-y-3">
            {oauth.map((provider) => (
              <form
                key={provider}
                action={async () => {
                  "use server";
                  await signIn(provider, { redirectTo: "/welcome" });
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-full border border-line bg-surface px-6 py-3 font-bold transition hover:border-primary"
                >
                  {PROVIDER_LABELS[provider] ?? `Continue with ${provider}`}
                </button>
              </form>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
