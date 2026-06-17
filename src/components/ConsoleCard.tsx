"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeConsole, setActiveConsole } from "@/lib/actions";

interface Props {
  id: string;
  modelName: string;
  brandName: string;
  socName?: string | null;
  gpuModel?: string | null;
  isActive: boolean;
}

/** A saved-console card with set-active / remove controls. */
export function ConsoleCard(props: Props) {
  const { id, modelName, brandName, socName, gpuModel, isActive } = props;
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div
      className={`card-surface flex flex-col gap-3 p-5 transition ${
        isActive ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            {brandName}
          </p>
          <h3 className="text-lg font-extrabold leading-tight">{modelName}</h3>
        </div>
        {isActive && (
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-strong">
            Active
          </span>
        )}
      </div>

      <dl className="space-y-1 text-sm text-ink-soft">
        {socName && (
          <div className="flex justify-between gap-2">
            <dt>Chipset</dt>
            <dd className="font-semibold text-ink">{socName}</dd>
          </div>
        )}
        {gpuModel && (
          <div className="flex justify-between gap-2">
            <dt>GPU</dt>
            <dd className="font-semibold text-ink">{gpuModel}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex gap-2 pt-2">
        {!isActive && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setActiveConsole(id))}
            className="flex-1 rounded-full bg-primary px-3 py-2 text-sm font-bold text-white transition hover:bg-primary-strong disabled:opacity-60"
          >
            Set active
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => removeConsole(id))}
          className="rounded-full border border-line px-3 py-2 text-sm font-bold text-ink-soft transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
