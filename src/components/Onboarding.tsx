"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addConsole, searchDevicesAction } from "@/lib/actions";
import type { DeviceSummary } from "@/lib/emuready";

type Step = "intro" | "console" | "done";

/** Guided first-run setup: explain the app, then add the first console. */
export function Onboarding({ userName }: { userName?: string | null }) {
  const [step, setStep] = useState<Step>("intro");
  const [addedName, setAddedName] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="card-surface mx-auto max-w-xl overflow-hidden">
      <StepDots step={step} />
      <div className="p-6 sm:p-8">
        {step === "intro" && (
          <IntroStep userName={userName} onNext={() => setStep("console")} />
        )}
        {step === "console" && (
          <ConsoleStep
            onAdded={(name) => {
              setAddedName(name);
              setStep("done");
            }}
          />
        )}
        {step === "done" && (
          <DoneStep
            consoleName={addedName}
            onFinish={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ["intro", "console", "done"];
  const idx = order.indexOf(step);
  return (
    <div className="flex gap-1.5 px-6 pt-6 sm:px-8">
      {order.map((s, i) => (
        <span
          key={s}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i <= idx ? "bg-primary" : "bg-line"
          }`}
        />
      ))}
    </div>
  );
}

function IntroStep({
  userName,
  onNext,
}: {
  userName?: string | null;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary text-3xl shadow-soft">
        🕹️
      </span>
      <div>
        <h1 className="text-2xl font-extrabold">
          Welcome{userName ? `, ${userName}` : ""}!
        </h1>
        <p className="mt-1 text-ink-soft">
          Game Checker tells you whether a game will run on your Android
          handheld, using real community reports. Let&apos;s set you up in one
          quick step.
        </p>
      </div>
      <ul className="space-y-2 text-left text-sm">
        {[
          ["🎮", "Add your console", "We tune every verdict to your exact device."],
          ["🔍", "Search any game", "See how it performs on your hardware."],
          ["★", "Build a library", "Save games and get tailored recommendations."],
        ].map(([icon, title, desc]) => (
          <li key={title} className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
            <span className="text-xl" aria-hidden>
              {icon}
            </span>
            <span>
              <span className="block font-bold">{title}</span>
              <span className="text-ink-soft">{desc}</span>
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong"
      >
        Get started →
      </button>
    </div>
  );
}

function ConsoleStep({ onAdded }: { onAdded: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const devices = await searchDevicesAction(query);
      if (!cancelled) {
        setResults(devices);
        setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function add(device: DeviceSummary) {
    setAdding(device.id);
    startTransition(async () => {
      await addConsole(device.id);
      onAdded(device.modelName);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">Which console do you have?</h2>
        <p className="text-sm text-ink-soft">
          Search for your Android handheld — Retroid, Odin, AYANEO and more.
        </p>
      </div>
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Retroid Pocket 5, Odin 2…"
        aria-label="Search devices"
        className="w-full rounded-full border border-line bg-surface px-4 py-3 font-semibold outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
      />
      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {loading && <li className="px-2 py-3 text-sm text-ink-soft">Searching…</li>}
        {!loading && results.length === 0 && (
          <li className="px-2 py-3 text-sm text-ink-soft">No devices found.</li>
        )}
        {results.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2 hover:bg-canvas"
          >
            <div className="min-w-0">
              <p className="truncate font-bold">{d.modelName}</p>
              <p className="truncate text-xs text-ink-soft">
                {d.brandName}
                {d.socName ? ` · ${d.socName}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={adding === d.id}
              onClick={() => add(d)}
              className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-strong disabled:opacity-60"
            >
              {adding === d.id ? "Adding…" : "This one"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DoneStep({
  consoleName,
  onFinish,
}: {
  consoleName: string | null;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-emerald-100 text-3xl">
        🎉
      </span>
      <div>
        <h2 className="text-2xl font-extrabold">You&apos;re all set!</h2>
        <p className="mt-1 text-ink-soft">
          {consoleName ? (
            <>
              Verdicts are now tuned to your{" "}
              <span className="font-bold text-primary-strong">{consoleName}</span>
              . You can add more consoles anytime.
            </>
          ) : (
            "Your console is saved. You can add more anytime."
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onFinish}
        className="w-full rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong"
      >
        See games for my console →
      </button>
    </div>
  );
}
