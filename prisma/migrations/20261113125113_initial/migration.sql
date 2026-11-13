-- CreateEnum
CREATE TYPE "Role" AS ENUM ('acheteur', 'vendeur', 'agence', 'agent', 'notaire', 'clerc', 'moderateur', 'admin');

-- CreateEnum
CREATE TYPE "StatutKYC" AS ENUM ('non_soumis', 'en_attente', 'verifie', 'rejete');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('gratuit', 'pro', 'promoteur', 'essentiel', 'pro_notaire');

-- CreateEnum
CREATE TYPE "TypeBien" AS ENUM ('terrain', 'villa', 'appartement', 'bureau');

-- CreateEnum
CREATE TYPE "StatutVisite" AS ENUM ('demandee', 'confirmee', 'refusee', 'annulee');

-- CreateEnum
CREATE TYPE "StatutDossier" AS ENUM ('brouillon', 'due_diligence', 'tf_verifie', 'compromis_signe', 'en_signature', 'actif', 'enregistrement_dgid', 'enregistre', 'mute');

-- CreateEnum
CREATE TYPE "IncidentDossier" AS ENUM ('litigieux', 'resilie');

-- CreateEnum
CREATE TYPE "AuteurOffre" AS ENUM ('acheteur', 'agence');

-- CreateEnum
CREATE TYPE "StatutOffre" AS ENUM ('en_attente', 'acceptee', 'refusee', 'retiree');

-- CreateEnum
CREATE TYPE "Signataire" AS ENUM ('notaire', 'acheteur', 'vendeur');

-- CreateEnum
CREATE TYPE "TypePaiement" AS ENUM ('acompte', 'solde');

-- CreateEnum
CREATE TYPE "MoyenPaiement" AS ENUM ('virement', 'mobile_money', 'cheque');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('declare', 'confirme');

-- CreateEnum
CREATE TYPE "StatutDemandeTF" AS ENUM ('en_verification', 'verifie', 'invalide');

-- CreateEnum
CREATE TYPE "Interlocuteur" AS ENUM ('agence', 'notaire');

-- CreateEnum
CREATE TYPE "StatutSignalement" AS ENUM ('ouvert', 'classe', 'retire');

-- CreateEnum
CREATE TYPE "CibleAvis" AS ENUM ('notaire', 'agence');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('nouvelle', 'traitee');

-- CreateEnum
CREATE TYPE "StatutFinancement" AS ENUM ('nouvelle', 'transmise');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "motDePasseHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'acheteur',
    "telephone" TEXT,
    "ville" TEXT,
    "suspendu" BOOLEAN NOT NULL DEFAULT false,
    "statutKYC" "StatutKYC" NOT NULL DEFAULT 'non_soumis',
    "plan" "Plan",
    "rattachement" TEXT,
    "releveBancaire" TEXT,
    "inscritLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniereConnexion" TIMESTAMP(3),

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierKYC" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "lieuNaissance" TEXT,
    "nationalite" TEXT,
    "typeDocument" TEXT,
    "numeroDocument" TEXT,
    "recto" TEXT,
    "verso" TEXT,
    "selfie" TEXT,
    "justificatif" TEXT,
    "soumisLe" TIMESTAMP(3),
    "motifRejet" TEXT,

    CONSTRAINT "DossierKYC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agence" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "initiales" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fondee" INTEGER NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "horaires" TEXT NOT NULL,
    "badges" TEXT[],
    "ventes" INTEGER NOT NULL DEFAULT 0,
    "note" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nbAvis" INTEGER NOT NULL DEFAULT 0,
    "avisInitiaux" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Agence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAgence" (
    "id" TEXT NOT NULL,
    "agenceId" TEXT NOT NULL,
    "initiales" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ventes" INTEGER NOT NULL DEFAULT 0,
    "note" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AgentAgence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notaire" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "initiales" TEXT NOT NULL,
    "etude" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "agreeDepuis" INTEGER NOT NULL,
    "note" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nbAvis" INTEGER NOT NULL DEFAULT 0,
    "dossiers" INTEGER NOT NULL DEFAULT 0,
    "satisfaction" INTEGER NOT NULL DEFAULT 0,
    "delaiTF" TEXT NOT NULL,
    "specialites" TEXT[],
    "presentation" TEXT NOT NULL,
    "tarifs" JSONB NOT NULL,
    "creneaux" JSONB NOT NULL,
    "avisInitiaux" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Notaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bien" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "type" "TypeBien" NOT NULL,
    "superficie" INTEGER NOT NULL,
    "prix" BIGINT NOT NULL,
    "region" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "quartier" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "photos" TEXT[],
    "telephone" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "agenceNom" TEXT NOT NULL,
    "agenceId" TEXT,
    "auteurId" TEXT,
    "proprietaire" TEXT,
    "tfVerifie" BOOLEAN NOT NULL DEFAULT false,
    "tfNumero" TEXT,
    "tfConservation" TEXT,
    "tfDateEtablissement" TIMESTAMP(3),
    "tfSuperficieCadastrale" INTEGER,
    "vedette" BOOLEAN NOT NULL DEFAULT false,
    "boostJusquau" TIMESTAMP(3),
    "depublie" BOOLEAN NOT NULL DEFAULT false,
    "prixEnBaisse" BOOLEAN NOT NULL DEFAULT false,
    "ancienPrix" BIGINT,
    "nbVues" INTEGER NOT NULL DEFAULT 0,
    "publieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriquePrix" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prix" BIGINT NOT NULL,

    CONSTRAINT "HistoriquePrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favori" (
    "utilisateurId" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "ajouteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "Favori_pkey" PRIMARY KEY ("utilisateurId","bienId")
);

-- CreateTable
CREATE TABLE "Alerte" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "criteres" JSONB NOT NULL,
    "frequence" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visite" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "acheteurId" TEXT NOT NULL,
    "telephone" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "statut" "StatutVisite" NOT NULL DEFAULT 'demandee',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "acheteurId" TEXT NOT NULL,
    "notaireId" TEXT,
    "statut" "StatutDossier" NOT NULL DEFAULT 'brouillon',
    "dateOuverture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCompromis" TIMESTAMP(3),
    "dateActe" TIMESTAMP(3),
    "dateLimiteDGID" TIMESTAMP(3),
    "notes" TEXT,
    "incident" "IncidentDossier",

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offre" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "auteur" "AuteurOffre" NOT NULL,
    "montant" BIGINT NOT NULL,
    "acompte" TEXT,
    "delai" TEXT,
    "conditions" TEXT,
    "message" TEXT,
    "financement" TEXT,
    "validiteJours" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutOffre" NOT NULL DEFAULT 'en_attente',

    CONSTRAINT "Offre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvenementDossier" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "EvenementDossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureDossier" (
    "dossierId" TEXT NOT NULL,
    "signataire" "Signataire" NOT NULL,
    "nom" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "image" TEXT NOT NULL,

    CONSTRAINT "SignatureDossier_pkey" PRIMARY KEY ("dossierId","signataire")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "type" "TypePaiement" NOT NULL,
    "montant" BIGINT NOT NULL,
    "moyen" "MoyenPaiement" NOT NULL,
    "reference" TEXT NOT NULL,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'declare',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceJointe" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "fichier" TEXT,
    "auteur" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PieceJointe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeTF" (
    "id" TEXT NOT NULL,
    "bienId" TEXT,
    "dossierId" TEXT,
    "numero" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "proprietaire" TEXT NOT NULL,
    "fichier" TEXT,
    "prioritaire" BOOLEAN NOT NULL DEFAULT false,
    "statut" "StatutDemandeTF" NOT NULL DEFAULT 'en_verification',
    "motif" TEXT,
    "demandeur" TEXT NOT NULL,
    "soumisLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteLe" TIMESTAMP(3),
    "relances" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DemandeTF_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "bienId" TEXT,
    "dossierId" TEXT,
    "acheteurId" TEXT NOT NULL,
    "avec" "Interlocuteur" NOT NULL,
    "interlocuteurNom" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "fichier" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureConversation" (
    "conversationId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "luLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LectureConversation_pkey" PRIMARY KEY ("conversationId","utilisateurId")
);

-- CreateTable
CREATE TABLE "RendezVous" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "notaireId" TEXT NOT NULL,
    "dossierId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "motif" TEXT NOT NULL,
    "clientNom" TEXT,

    CONSTRAINT "RendezVous_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLue" (
    "utilisateurId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "lueLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLue_pkey" PRIMARY KEY ("utilisateurId","notificationId")
);

-- CreateTable
CREATE TABLE "MessageContact" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bienId" TEXT,
    "bienTitre" TEXT,
    "agence" TEXT,
    "montant" TEXT,
    "nom" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "envoyeur" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signalement" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "detail" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutSignalement" NOT NULL DEFAULT 'ouvert',

    CONSTRAINT "Signalement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avis" (
    "id" TEXT NOT NULL,
    "cible" "CibleAvis" NOT NULL,
    "slug" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandeService" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "montant" BIGINT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "bienId" TEXT,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutCommande" NOT NULL DEFAULT 'nouvelle',

    CONSTRAINT "CommandeService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeFinancement" (
    "id" TEXT NOT NULL,
    "offreId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "montant" BIGINT NOT NULL,
    "duree" INTEGER NOT NULL,
    "revenu" BIGINT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutFinancement" NOT NULL DEFAULT 'nouvelle',

    CONSTRAINT "DemandeFinancement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonneNewsletter" (
    "email" TEXT NOT NULL,
    "inscritLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbonneNewsletter_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "StatPublicite" (
    "campagneId" TEXT NOT NULL,
    "vues" INTEGER NOT NULL DEFAULT 0,
    "clics" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StatPublicite_pkey" PRIMARY KEY ("campagneId")
);

-- CreateTable
CREATE TABLE "Reglage" (
    "cle" TEXT NOT NULL,
    "valeur" JSONB NOT NULL,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reglage_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "JournalReglages" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteur" TEXT NOT NULL,
    "detail" TEXT NOT NULL,

    CONSTRAINT "JournalReglages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_role_idx" ON "Utilisateur"("role");

-- CreateIndex
CREATE UNIQUE INDEX "DossierKYC_utilisateurId_key" ON "DossierKYC"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Agence_slug_key" ON "Agence"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Notaire_slug_key" ON "Notaire"("slug");

-- CreateIndex
CREATE INDEX "Notaire_region_idx" ON "Notaire"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Bien_reference_key" ON "Bien"("reference");

-- CreateIndex
CREATE INDEX "Bien_region_type_idx" ON "Bien"("region", "type");

-- CreateIndex
CREATE INDEX "Bien_prix_idx" ON "Bien"("prix");

-- CreateIndex
CREATE INDEX "Bien_depublie_publieLe_idx" ON "Bien"("depublie", "publieLe");

-- CreateIndex
CREATE INDEX "HistoriquePrix_bienId_idx" ON "HistoriquePrix"("bienId");

-- CreateIndex
CREATE INDEX "Visite_bienId_idx" ON "Visite"("bienId");

-- CreateIndex
CREATE INDEX "Visite_acheteurId_idx" ON "Visite"("acheteurId");

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_reference_key" ON "Dossier"("reference");

-- CreateIndex
CREATE INDEX "Dossier_acheteurId_idx" ON "Dossier"("acheteurId");

-- CreateIndex
CREATE INDEX "Dossier_bienId_idx" ON "Dossier"("bienId");

-- CreateIndex
CREATE INDEX "Dossier_statut_idx" ON "Dossier"("statut");

-- CreateIndex
CREATE INDEX "Offre_dossierId_idx" ON "Offre"("dossierId");

-- CreateIndex
CREATE INDEX "EvenementDossier_dossierId_idx" ON "EvenementDossier"("dossierId");

-- CreateIndex
CREATE INDEX "Paiement_dossierId_idx" ON "Paiement"("dossierId");

-- CreateIndex
CREATE INDEX "PieceJointe_dossierId_idx" ON "PieceJointe"("dossierId");

-- CreateIndex
CREATE INDEX "DemandeTF_statut_idx" ON "DemandeTF"("statut");

-- CreateIndex
CREATE INDEX "Conversation_acheteurId_idx" ON "Conversation"("acheteurId");

-- CreateIndex
CREATE INDEX "Message_conversationId_date_idx" ON "Message"("conversationId", "date");

-- CreateIndex
CREATE INDEX "RendezVous_notaireId_date_idx" ON "RendezVous"("notaireId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Signalement_bienId_auteurId_key" ON "Signalement"("bienId", "auteurId");

-- CreateIndex
CREATE INDEX "Avis_cible_slug_idx" ON "Avis"("cible", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Avis_dossierId_cible_slug_key" ON "Avis"("dossierId", "cible", "slug");

-- AddForeignKey
ALTER TABLE "DossierKYC" ADD CONSTRAINT "DossierKYC_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAgence" ADD CONSTRAINT "AgentAgence_agenceId_fkey" FOREIGN KEY ("agenceId") REFERENCES "Agence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_agenceId_fkey" FOREIGN KEY ("agenceId") REFERENCES "Agence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriquePrix" ADD CONSTRAINT "HistoriquePrix_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favori" ADD CONSTRAINT "Favori_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favori" ADD CONSTRAINT "Favori_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visite" ADD CONSTRAINT "Visite_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visite" ADD CONSTRAINT "Visite_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_notaireId_fkey" FOREIGN KEY ("notaireId") REFERENCES "Notaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offre" ADD CONSTRAINT "Offre_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvenementDossier" ADD CONSTRAINT "EvenementDossier_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureDossier" ADD CONSTRAINT "SignatureDossier_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointe" ADD CONSTRAINT "PieceJointe_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeTF" ADD CONSTRAINT "DemandeTF_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeTF" ADD CONSTRAINT "DemandeTF_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureConversation" ADD CONSTRAINT "LectureConversation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureConversation" ADD CONSTRAINT "LectureConversation_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_notaireId_fkey" FOREIGN KEY ("notaireId") REFERENCES "Notaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLue" ADD CONSTRAINT "NotificationLue_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
