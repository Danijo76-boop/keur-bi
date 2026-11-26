-- CreateEnum
CREATE TYPE "StatutDemandeProfil" AS ENUM ('en_attente', 'acceptee', 'refusee');

-- CreateTable
CREATE TABLE "DemandeProfil" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "infos" JSONB NOT NULL,
    "statut" "StatutDemandeProfil" NOT NULL DEFAULT 'en_attente',
    "motifRefus" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteLe" TIMESTAMP(3),

    CONSTRAINT "DemandeProfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandeProfil_utilisateurId_key" ON "DemandeProfil"("utilisateurId");

-- CreateIndex
CREATE INDEX "DemandeProfil_statut_idx" ON "DemandeProfil"("statut");

-- AddForeignKey
ALTER TABLE "DemandeProfil" ADD CONSTRAINT "DemandeProfil_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Sécurité par ligne : chacun ne voit que sa propre demande ; le serveur (propriétaire des tables) voit tout.
ALTER TABLE "DemandeProfil" ENABLE ROW LEVEL SECURITY;
CREATE POLICY proprietaire ON "DemandeProfil" FOR ALL USING ("utilisateurId" = app_utilisateur_id()) WITH CHECK ("utilisateurId" = app_utilisateur_id());
