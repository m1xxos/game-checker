import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getActiveConsole, currentUserId } from "@/lib/user-data";
import { resolveConsoleRef } from "@/lib/console-soc";
import { RecommendationsBody } from "@/components/RecommendationsBody";
import { RecommendationsSkeleton } from "@/components/RecommendationsSkeleton";
import type { RecSettings } from "@/components/RecommendationSettings";

export const metadata: Metadata = { title: "For You — Game Checker" };

function Prompt({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-surface mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 text-ink-soft">{children}</p>
    </div>
  );
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ quality?: string; system?: string; taste?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) {
    return (
      <Prompt title="Sign in for recommendations">
        <Link href="/signin" className="font-bold text-primary-strong underline">
          Sign in
        </Link>{" "}
        to get games picked for your console and taste.
      </Prompt>
    );
  }

  const params = await searchParams;
  const settings: RecSettings = {
    quality:
      params.quality === "great" || params.quality === "perfect"
        ? params.quality
        : "playable",
    system: params.system ?? "all",
    taste: params.taste !== "0",
  };

  const active = await getActiveConsole();
  if (!active) {
    return (
      <Prompt title="Pick your console first">
        <Link href="/consoles" className="font-bold text-primary-strong underline">
          Add a console
        </Link>{" "}
        so we can tune recommendations to your hardware.
      </Prompt>
    );
  }

  // Cheap (cached device lookup at worst); needed before the pool can widen to
  // the whole chipset, so it stays in the shell rather than the streamed body.
  const consoleRef = await resolveConsoleRef(active);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">For You</h1>
          <p className="text-ink-soft">
            {settings.taste
              ? `Tuned to your library and your ${active.modelName}.`
              : `Games that run well on your ${active.modelName}.`}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-bold text-primary-strong hover:underline"
        >
          Your library →
        </Link>
      </div>

      <Suspense fallback={<RecommendationsSkeleton />}>
        <RecommendationsBody
          settings={settings}
          consoleRef={consoleRef}
          modelName={active.modelName}
        />
      </Suspense>
    </div>
  );
}
