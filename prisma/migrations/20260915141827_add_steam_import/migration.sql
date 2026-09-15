-- AlterTable
ALTER TABLE "SavedGame" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "SteamProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "steamId64" TEXT NOT NULL,
    "vanityUrl" TEXT,
    "personaName" TEXT,
    "avatarUrl" TEXT,
    "syncedAt" TIMESTAMP(3),
    "gameCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SteamProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamGame" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "playtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" TIMESTAMP(3),
    "iconHash" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SteamGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamApp" (
    "appId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "genres" TEXT[],
    "categories" TEXT[],
    "detailsFetchedAt" TIMESTAMP(3),
    "emuGameId" TEXT,
    "emuTitle" TEXT,
    "matchedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SteamApp_pkey" PRIMARY KEY ("appId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SteamProfile_userId_key" ON "SteamProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SteamProfile_steamId64_key" ON "SteamProfile"("steamId64");

-- CreateIndex
CREATE INDEX "SteamProfile_userId_idx" ON "SteamProfile"("userId");

-- CreateIndex
CREATE INDEX "SteamGame_userId_playtimeMinutes_idx" ON "SteamGame"("userId", "playtimeMinutes" DESC);

-- CreateIndex
CREATE INDEX "SteamGame_appId_idx" ON "SteamGame"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "SteamGame_userId_appId_key" ON "SteamGame"("userId", "appId");

-- CreateIndex
CREATE INDEX "SteamApp_detailsFetchedAt_idx" ON "SteamApp"("detailsFetchedAt");

-- CreateIndex
CREATE INDEX "SteamApp_matchedAt_idx" ON "SteamApp"("matchedAt");

-- AddForeignKey
ALTER TABLE "SteamProfile" ADD CONSTRAINT "SteamProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGame" ADD CONSTRAINT "SteamGame_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SteamProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGame" ADD CONSTRAINT "SteamGame_appId_fkey" FOREIGN KEY ("appId") REFERENCES "SteamApp"("appId") ON DELETE RESTRICT ON UPDATE CASCADE;
