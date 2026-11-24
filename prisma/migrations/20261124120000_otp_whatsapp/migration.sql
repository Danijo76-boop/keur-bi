-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "whatsapp" TEXT;
-- CreateTable
CREATE TABLE "DefiOTP" (
    "id" TEXT NOT NULL,
    "jetonHash" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "numero" TEXT,
    "codeHash" TEXT,
    "envoyeLe" TIMESTAMP(3),
    "envois" INTEGER NOT NULL DEFAULT 0,
    "essais" INTEGER NOT NULL DEFAULT 0,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DefiOTP_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "DefiOTP_jetonHash_key" ON "DefiOTP"("jetonHash");
-- CreateIndex
CREATE INDEX "DefiOTP_utilisateurId_idx" ON "DefiOTP"("utilisateurId");
-- CreateIndex
CREATE INDEX "DefiOTP_expireLe_idx" ON "DefiOTP"("expireLe");
-- AddForeignKey
ALTER TABLE "DefiOTP" ADD CONSTRAINT "DefiOTP_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
