import Link from "next/link";
import type { Metadata } from "next";
import { getConsoles, currentUserId } from "@/lib/user-data";
import { ConsoleCard } from "@/components/ConsoleCard";
import { AddConsole } from "@/components/AddConsole";

export const metadata: Metadata = { title: "My Consoles — Game Checker" };

export default async function ConsolesPage() {
  const userId = await currentUserId();

  if (!userId) {
    return (
      <div className="card-surface mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-extrabold">Sign in to add a console</h1>
        <p className="mt-2 text-ink-soft">
          Save your Android handheld so we can tell you exactly which games run
          on it — synced across all your devices.
        </p>
        <Link
          href="/signin"
          className="mt-5 inline-block rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const consoles = await getConsoles();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">My Consoles</h1>
        <p className="text-ink-soft">
          The active console drives the “will it run?” verdicts across the site.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          {consoles.length === 0 ? (
            <div className="card-surface p-8 text-center text-ink-soft">
              No consoles yet — add one on the right to get started.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {consoles.map((c) => (
                <ConsoleCard
                  key={c.id}
                  id={c.id}
                  modelName={c.modelName}
                  brandName={c.brandName}
                  socName={c.socName}
                  gpuModel={c.gpuModel}
                  isActive={c.isActive}
                />
              ))}
            </div>
          )}
        </div>

        <AddConsole savedDeviceIds={consoles.map((c) => c.deviceId)} />
      </div>
    </div>
  );
}
