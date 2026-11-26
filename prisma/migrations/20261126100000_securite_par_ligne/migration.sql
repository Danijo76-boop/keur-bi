-- ── Sécurité par ligne (Row Level Security) ──
-- Chaque table refuse par défaut toute lecture ou écriture à un rôle de base de données autre que son propriétaire.
-- Les règles ci-dessous ouvrent à chaque utilisateur ses propres lignes, désigné par le réglage de session
-- « app.utilisateur_id » (SELECT set_config('app.utilisateur_id', '<id>', true) au début de la transaction).
--
-- Le serveur du site se connecte avec le rôle propriétaire des tables : il n'est pas soumis à ces règles
-- (pas de FORCE ROW LEVEL SECURITY) et continue de filtrer lui-même par compte, comme aujourd'hui.
-- Ces règles protègent contre tout autre accès direct à la base (API de données Neon, rôle en lecture,
-- outil tiers, fuite d'un identifiant secondaire) : sans réglage d'utilisateur, un tel accès ne voit rien.

-- Garde-fou : le rôle qui applique la migration (le même que celui du site) doit être propriétaire des tables,
-- sinon le site lui-même serait soumis aux règles et ne verrait plus rien. Dans ce cas, on s'arrête avant tout changement.
DO $$
BEGIN
  IF (SELECT tableowner FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'Utilisateur') <> current_user THEN
    RAISE EXCEPTION 'Sécurité par ligne non activée : le rôle % n''est pas propriétaire des tables.', current_user;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION app_utilisateur_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.utilisateur_id', true), '') $$;

-- 1. Activer la sécurité par ligne sur toutes les tables.
ALTER TABLE "Utilisateur" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DefiOTP" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DossierKYC" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fichier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentAgence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notaire" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bien" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HistoriquePrix" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Favori" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alerte" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Visite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dossier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Offre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvenementDossier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SignatureDossier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Paiement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PieceJointe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DemandeTF" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LectureConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RendezVous" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationLue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Signalement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Avis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommandeService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DemandeFinancement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AbonneNewsletter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StatPublicite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reglage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalReglages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Programme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LotProgramme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tentative" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalTechnique" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- 2. Tables réservées au serveur, sans aucune règle (donc fermées à tout autre rôle) :
--    Session et DefiOTP (jetons et codes de connexion), Tentative, JournalTechnique, Reglage, JournalReglages,
--    StatPublicite, AbonneNewsletter, MessageContact, CommandeService, _prisma_migrations.

-- 3. Catalogue public : lecture pour tous, écriture par l'auteur seulement.
CREATE POLICY lecture_publique ON "Agence" FOR SELECT USING (true);
CREATE POLICY lecture_publique ON "AgentAgence" FOR SELECT USING (true);
CREATE POLICY lecture_publique ON "Notaire" FOR SELECT USING (true);
CREATE POLICY lecture_publique ON "HistoriquePrix" FOR SELECT USING (true);
CREATE POLICY lecture_publique ON "LotProgramme" FOR SELECT USING (true);
CREATE POLICY lecture_publique ON "Fichier" FOR SELECT USING (true); -- photos d'annonces, publiques sur le site
CREATE POLICY fichier_auteur ON "Fichier" FOR ALL USING ("auteurId" = app_utilisateur_id()) WITH CHECK ("auteurId" = app_utilisateur_id());

CREATE POLICY annonce_publiee ON "Bien" FOR SELECT USING (depublie = false OR "auteurId" = app_utilisateur_id());
CREATE POLICY annonce_auteur ON "Bien" FOR ALL USING ("auteurId" = app_utilisateur_id()) WITH CHECK ("auteurId" = app_utilisateur_id());

CREATE POLICY lecture_publique ON "Programme" FOR SELECT USING (true);
CREATE POLICY programme_auteur ON "Programme" FOR ALL USING ("auteurId" = app_utilisateur_id()) WITH CHECK ("auteurId" = app_utilisateur_id());

-- 4. Données personnelles : chacun ne voit et ne modifie que les siennes.
CREATE POLICY soi_meme ON "Utilisateur" FOR ALL USING (id = app_utilisateur_id()) WITH CHECK (id = app_utilisateur_id());
CREATE POLICY proprietaire ON "DossierKYC" FOR ALL USING ("utilisateurId" = app_utilisateur_id()) WITH CHECK ("utilisateurId" = app_utilisateur_id());
CREATE POLICY proprietaire ON "Favori" FOR ALL USING ("utilisateurId" = app_utilisateur_id()) WITH CHECK ("utilisateurId" = app_utilisateur_id());
CREATE POLICY proprietaire ON "Alerte" FOR ALL USING ("utilisateurId" = app_utilisateur_id()) WITH CHECK ("utilisateurId" = app_utilisateur_id());
CREATE POLICY proprietaire ON "LectureConversation" FOR ALL USING ("utilisateurId" = app_utilisateur_id()) WITH CHECK ("utilisateurId" = app_utilisateur_id());
CREATE POLICY proprietaire ON "RendezVous" FOR ALL USING ("utilisateurId" = app_utilisateur_id()) WITH CHECK ("utilisateurId" = app_utilisateur_id());
CREATE POLICY proprietaire ON "NotificationLue" FOR ALL USING ("utilisateurId" = app_utilisateur_id()) WITH CHECK ("utilisateurId" = app_utilisateur_id());
CREATE POLICY auteur ON "Signalement" FOR ALL USING ("auteurId" = app_utilisateur_id()) WITH CHECK ("auteurId" = app_utilisateur_id());
CREATE POLICY auteur ON "Avis" FOR ALL USING ("auteurId" = app_utilisateur_id()) WITH CHECK ("auteurId" = app_utilisateur_id());

-- 5. Échanges entre un acheteur et l'auteur d'une annonce : visibles des deux parties, et d'elles seules.
CREATE OR REPLACE FUNCTION app_auteur_du_bien(bien text) RETURNS boolean
  LANGUAGE sql STABLE
  AS $$ SELECT EXISTS (SELECT 1 FROM "Bien" b WHERE b.id = bien AND b."auteurId" = app_utilisateur_id()) $$;

CREATE POLICY parties ON "Visite" FOR ALL
  USING ("acheteurId" = app_utilisateur_id() OR app_auteur_du_bien("bienId"))
  WITH CHECK ("acheteurId" = app_utilisateur_id() OR app_auteur_du_bien("bienId"));

CREATE POLICY parties ON "Dossier" FOR ALL
  USING ("acheteurId" = app_utilisateur_id() OR app_auteur_du_bien("bienId"))
  WITH CHECK ("acheteurId" = app_utilisateur_id() OR app_auteur_du_bien("bienId"));

CREATE OR REPLACE FUNCTION app_partie_du_dossier(dossier text) RETURNS boolean
  LANGUAGE sql STABLE
  AS $$ SELECT EXISTS (SELECT 1 FROM "Dossier" d WHERE d.id = dossier) $$; -- la règle du Dossier filtre déjà les parties

CREATE POLICY parties ON "Offre" FOR ALL USING (app_partie_du_dossier("dossierId")) WITH CHECK (app_partie_du_dossier("dossierId"));
CREATE POLICY parties ON "EvenementDossier" FOR ALL USING (app_partie_du_dossier("dossierId")) WITH CHECK (app_partie_du_dossier("dossierId"));
CREATE POLICY parties ON "SignatureDossier" FOR ALL USING (app_partie_du_dossier("dossierId")) WITH CHECK (app_partie_du_dossier("dossierId"));
CREATE POLICY parties ON "Paiement" FOR ALL USING (app_partie_du_dossier("dossierId")) WITH CHECK (app_partie_du_dossier("dossierId"));
CREATE POLICY parties ON "PieceJointe" FOR ALL USING (app_partie_du_dossier("dossierId")) WITH CHECK (app_partie_du_dossier("dossierId"));
CREATE POLICY parties ON "DemandeTF" FOR ALL
  USING ("dossierId" IS NOT NULL AND app_partie_du_dossier("dossierId"))
  WITH CHECK ("dossierId" IS NOT NULL AND app_partie_du_dossier("dossierId"));
CREATE POLICY parties ON "DemandeFinancement" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Offre" o WHERE o.id = "offreId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Offre" o WHERE o.id = "offreId"));

CREATE POLICY parties ON "Conversation" FOR ALL
  USING ("acheteurId" = app_utilisateur_id() OR ("bienId" IS NOT NULL AND app_auteur_du_bien("bienId")))
  WITH CHECK ("acheteurId" = app_utilisateur_id() OR ("bienId" IS NOT NULL AND app_auteur_du_bien("bienId")));
CREATE POLICY parties ON "Message" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Conversation" c WHERE c.id = "conversationId"))
  WITH CHECK ("auteurId" = app_utilisateur_id() AND EXISTS (SELECT 1 FROM "Conversation" c WHERE c.id = "conversationId"));
