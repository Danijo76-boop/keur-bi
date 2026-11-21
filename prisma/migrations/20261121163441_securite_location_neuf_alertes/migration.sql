-- CreateEnum
CREATE TYPE "Transaction" AS ENUM ('vente', 'location');

-- AlterTable
ALTER TABLE "Alerte" ADD COLUMN     "actif" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dernierEnvoi" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Bien" ADD COLUMN     "caution" BIGINT,
ADD COLUMN     "charges" BIGINT,
ADD COLUMN     "meuble" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nbPieces" INTEGER,
ADD COLUMN     "transaction" "Transaction" NOT NULL DEFAULT 'vente';

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "promoteur" TEXT NOT NULL,
    "agenceId" TEXT,
    "auteurId" TEXT,
    "region" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "quartier" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "photos" TEXT[],
    "livraison" TEXT NOT NULL,
    "avancement" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "publie" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotProgramme" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "type" "TypeBien" NOT NULL,
    "libelle" TEXT NOT NULL,
    "superficie" INTEGER NOT NULL,
    "nbPieces" INTEGER,
    "prix" BIGINT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LotProgramme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tentative" (
    "cle" TEXT NOT NULL,
    "nb" INTEGER NOT NULL DEFAULT 1,
    "debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tentative_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "JournalTechnique" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "niveau" TEXT NOT NULL,
    "categorie" TEXT,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "requeteId" TEXT,
    "route" TEXT,
    "utilisateurId" TEXT,

    CONSTRAINT "JournalTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Programme_slug_key" ON "Programme"("slug");

-- CreateIndex
CREATE INDEX "Programme_publie_region_idx" ON "Programme"("publie", "region");

-- CreateIndex
CREATE INDEX "LotProgramme_programmeId_idx" ON "LotProgramme"("programmeId");

-- CreateIndex
CREATE INDEX "Tentative_debut_idx" ON "Tentative"("debut");

-- CreateIndex
CREATE INDEX "JournalTechnique_date_idx" ON "JournalTechnique"("date");

-- CreateIndex
CREATE INDEX "JournalTechnique_niveau_date_idx" ON "JournalTechnique"("niveau", "date");

-- CreateIndex
CREATE INDEX "Alerte_actif_dernierEnvoi_idx" ON "Alerte"("actif", "dernierEnvoi");

-- CreateIndex
CREATE INDEX "Bien_transaction_region_type_idx" ON "Bien"("transaction", "region", "type");

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_agenceId_fkey" FOREIGN KEY ("agenceId") REFERENCES "Agence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotProgramme" ADD CONSTRAINT "LotProgramme_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
