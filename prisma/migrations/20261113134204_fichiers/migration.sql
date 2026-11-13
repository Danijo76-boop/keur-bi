-- CreateTable
CREATE TABLE "Fichier" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "donnees" BYTEA NOT NULL,
    "auteurId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fichier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fichier_auteurId_idx" ON "Fichier"("auteurId");
