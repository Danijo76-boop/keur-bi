-- Retire les notes et avis de démonstration (inventés) des agences, de leurs agents et des notaires.
-- Les vrais avis, laissés par des clients après une transaction, sont dans la table "Avis" et ne sont pas touchés.
UPDATE "Agence" SET "note" = 0, "nbAvis" = 0, "avisInitiaux" = '[]';
UPDATE "AgentAgence" SET "note" = 0;
UPDATE "Notaire" SET "note" = 0, "nbAvis" = 0, "avisInitiaux" = '[]';
