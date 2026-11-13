-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "jetonHash" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_jetonHash_key" ON "Session"("jetonHash");

-- CreateIndex
CREATE INDEX "Session_utilisateurId_idx" ON "Session"("utilisateurId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
