import "server-only";
import { prisma } from "@/lib/prisma";
import { getDevice } from "@/lib/emuready";
import type { ConsoleProfile } from "@/generated/prisma/client";
import type { ConsoleRef } from "@/lib/compat";

/**
 * Resolve a console's chipset id, backfilling the cached column on first use.
 *
 * `ConsoleProfile.socId` only exists for rows written after the column was added;
 * older rows carry the SoC *name* alone. The id can't be backfilled in SQL (it
 * lives on EmuReady), so we fill it lazily the first time a console is used for
 * matching. `devices.byId` is cached for 24h, so the amortized cost is ~0 and the
 * write happens at most once per console.
 *
 * Deliberately isolated from `user-data.ts`, which is read-only by contract. The
 * write is best-effort: a failure here must never take down a page render, and
 * everything downstream still works with a null socId (matching falls back to the
 * normalized SoC name, exactly as it did before).
 */
export async function resolveConsoleRef(
  profile: ConsoleProfile,
): Promise<ConsoleRef> {
  if (profile.socId) return profile;

  const device = await getDevice(profile.deviceId).catch(() => null);
  const socId = device?.soc?.id ?? null;
  if (!socId) return profile;

  await prisma.consoleProfile
    .update({
      where: { id: profile.id },
      data: {
        socId,
        socName: device?.soc?.name ?? profile.socName,
        gpuModel: device?.soc?.gpuModel ?? profile.gpuModel,
      },
    })
    .catch(() => {});

  return { ...profile, socId };
}
