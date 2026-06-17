"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDevice, getDevices, type DeviceSummary } from "@/lib/emuready";

/** Search the EmuReady device catalog (used by the console picker). */
export async function searchDevicesAction(
  query: string,
): Promise<DeviceSummary[]> {
  const q = query.trim();
  return getDevices(q ? { search: q, limit: 20 } : { limit: 20 });
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/** Add a console by EmuReady device id. The first console becomes active. */
export async function addConsole(deviceId: string): Promise<void> {
  const userId = await requireUserId();

  const device = await getDevice(deviceId);
  if (!device) throw new Error("Device not found on EmuReady");

  const existingCount = await prisma.consoleProfile.count({ where: { userId } });

  await prisma.consoleProfile.upsert({
    where: { userId_deviceId: { userId, deviceId } },
    create: {
      userId,
      deviceId,
      modelName: device.modelName,
      brandName: device.brand?.name ?? "Unknown",
      socName: device.soc?.name ?? null,
      gpuModel: device.soc?.gpuModel ?? null,
      isActive: existingCount === 0,
    },
    update: {
      modelName: device.modelName,
      brandName: device.brand?.name ?? "Unknown",
      socName: device.soc?.name ?? null,
      gpuModel: device.soc?.gpuModel ?? null,
    },
  });

  revalidatePath("/consoles");
  revalidatePath("/dashboard");
}

export async function removeConsole(id: string): Promise<void> {
  const userId = await requireUserId();
  const removed = await prisma.consoleProfile.delete({
    where: { id, userId },
  });

  // If we removed the active console, promote the oldest remaining one.
  if (removed.isActive) {
    const next = await prisma.consoleProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.consoleProfile.update({
        where: { id: next.id },
        data: { isActive: true },
      });
    }
  }

  revalidatePath("/consoles");
  revalidatePath("/dashboard");
}

export async function setActiveConsole(id: string): Promise<void> {
  const userId = await requireUserId();
  // Single active console per user.
  await prisma.$transaction([
    prisma.consoleProfile.updateMany({
      where: { userId },
      data: { isActive: false },
    }),
    prisma.consoleProfile.update({
      where: { id, userId },
      data: { isActive: true },
    }),
  ]);

  revalidatePath("/", "layout");
}

interface SaveGameInput {
  gameId: string;
  title: string;
  boxartUrl?: string | null;
  systemName?: string | null;
}

/** Toggle a game in the user's library. Returns the new saved state. */
export async function toggleSavedGame(game: SaveGameInput): Promise<boolean> {
  const userId = await requireUserId();

  const existing = await prisma.savedGame.findUnique({
    where: { userId_gameId: { userId, gameId: game.gameId } },
  });

  if (existing) {
    await prisma.savedGame.delete({ where: { id: existing.id } });
    revalidatePath("/dashboard");
    return false;
  }

  await prisma.savedGame.create({
    data: {
      userId,
      gameId: game.gameId,
      title: game.title,
      boxartUrl: game.boxartUrl ?? null,
      systemName: game.systemName ?? null,
    },
  });
  revalidatePath("/dashboard");
  return true;
}
