"use client";
import { estCoteVendeur, estPlateforme, User } from "./auth";
import { useStocke } from "./stockage";
import { tousLesBiens } from "./annonces";
import { joursRestantsDGID, lireDossiers, LABELS_ETAPE, referenceDossier } from "./dossiers";
import { conversationsDe, nonLus } from "./messagerie";
import { correspond, lireAlertes, lireFavoris, lireLues, resumeCriteres, urlRecherche } from "./preferences";
import { lireParametres } from "./parametres";
import { estVerifie, lireDemandesTF, lireOverridesTF } from "./tf";
import { lireUtilisateurs } from "./utilisateurs";
import { lireSignalements } from "./moderation";
import { lireVisites } from "./visites";

export type CategorieNotif = "urgent" | "dossier" | "annonce" | "message";

export type Notification = {
  id: string;
  categorie: CategorieNotif;
  titre: string;
  detail: string;
  date: string;
  lien?: string;
  action?: string;
  lue: boolean;
};

// Les notifications sont dérivées de l'état réel de l'application, pas d'une liste figée.
function calculer(user: User): Notification[] {
  const lues = lireLues();
  const params = lireParametres();
  const biens = tousLesBiens();
  const titreBien = (id: string) => biens.find((b) => b.id === id)?.titre ?? "Bien";
  const out: Omit<Notification, "lue">[] = [];

  const dossiers = lireDossiers().filter((d) => user.role !== "acheteur" || d.acheteurEmail === user.email);

  for (const d of dossiers) {
    const lien = `/dossiers/${d.id}`;
    const jours = joursRestantsDGID(d);
    if (jours !== null && jours <= params.alerteDGID1) {
      out.push({
        id: `dgid-${d.id}-${jours <= params.alerteDGID2 ? "urgent" : "rappel"}`,
        categorie: "urgent",
        titre: jours >= 0 ? `Délai DGID J-${jours} · ${titreBien(d.bienId)}` : `Délai DGID dépassé · ${titreBien(d.bienId)}`,
        detail: `L'enregistrement doit être déposé avant le ${new Date(d.dateLimiteDGID!).toLocaleDateString("fr-FR")}. Passé cette date, une pénalité de +${params.penaliteRetard}% s'applique.`,
        date: d.dateActe ?? d.dateOuverture,
        lien,
        action: "Agir maintenant",
      });
    }
    if (d.statut === "en_signature") {
      const roleSignataire = user.role === "agence" ? "vendeur" : user.role;
      if ((roleSignataire === "acheteur" || roleSignataire === "vendeur" || roleSignataire === "notaire") && !d.signatures?.[roleSignataire]) {
        out.push({
          id: `signature-${d.id}-${roleSignataire}`,
          categorie: "urgent",
          titre: `Signature requise · ${titreBien(d.bienId)}`,
          detail: `L'acte du dossier ${referenceDossier(d)} attend votre signature.`,
          date: d.evenements[d.evenements.length - 1]?.date ?? d.dateOuverture,
          lien: `${lien}/signature`,
          action: "Signer",
        });
      }
    }
    if (estCoteVendeur(user.role)) {
      for (const o of d.offres.filter((x) => x.statut === "en_attente" && x.auteur === "acheteur")) {
        out.push({
          id: `offre-${o.id}`,
          categorie: "dossier",
          titre: `Nouvelle offre · ${titreBien(d.bienId)}`,
          detail: `${d.acheteurNom} propose ${o.montant.toLocaleString("fr-FR")} FCFA.`,
          date: o.date,
          lien,
          action: "Répondre",
        });
      }
    }
    if (user.role === "notaire") {
      for (const p of (d.paiements ?? []).filter((x) => x.statut === "declare")) {
        out.push({
          id: `paiement-${p.id}`,
          categorie: "dossier",
          titre: `Versement à confirmer · ${referenceDossier(d)}`,
          detail: `${p.montant.toLocaleString("fr-FR")} FCFA déclarés, référence ${p.reference}.`,
          date: p.date,
          lien,
          action: "Confirmer",
        });
      }
    }
    const dernier = d.evenements[d.evenements.length - 1];
    if (dernier) {
      out.push({
        id: `evt-${dernier.id}`,
        categorie: "dossier",
        titre: `${titreBien(d.bienId)} · ${LABELS_ETAPE[d.statut]}`,
        detail: dernier.libelle,
        date: dernier.date,
        lien,
      });
    }
  }

  for (const c of conversationsDe(user)) {
    const n = nonLus(c, user.email);
    if (n > 0) {
      const m = c.messages[c.messages.length - 1];
      out.push({
        id: `msg-${m.id}`,
        categorie: "message",
        titre: `${n} nouveau${n > 1 ? "x" : ""} message${n > 1 ? "s" : ""} de ${m.auteurNom}`,
        detail: m.texte,
        date: m.date,
        lien: `/messages?c=${c.id}`,
      });
    }
  }

  for (const v of lireVisites()) {
    const quand = new Date(v.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
    if (estCoteVendeur(user.role) && v.statut === "demandee" && new Date(v.date).getTime() > Date.now()) {
      out.push({ id: `visite-${v.id}`, categorie: "dossier", titre: `Demande de visite · ${v.bienTitre}`, detail: `${v.acheteurNom}, le ${quand}.`, date: v.creeLe, lien: "/tableau-de-bord", action: "Répondre" });
    }
    if (user.role === "acheteur" && v.acheteurEmail === user.email && (v.statut === "confirmee" || v.statut === "refusee")) {
      out.push({ id: `visite-${v.id}-${v.statut}`, categorie: "dossier", titre: `Visite ${v.statut === "confirmee" ? "confirmée" : "refusée"} · ${v.bienTitre}`, detail: `Créneau du ${quand}.`, date: v.creeLe, lien: `/annonces/${v.bienId}` });
    }
  }

  const overrides = lireOverridesTF();
  for (const a of lireAlertes(user.email)) {
    const nouveaux = biens.filter((b) => correspond(b, a.criteres, estVerifie(b, overrides)));
    if (nouveaux.length > 0) {
      out.push({
        id: `alerte-${a.id}-${nouveaux.length}`,
        categorie: "annonce",
        titre: `${nouveaux.length} annonce${nouveaux.length > 1 ? "s" : ""} pour « ${a.nom} »`,
        detail: resumeCriteres(a.criteres),
        date: a.creeLe,
        lien: urlRecherche(a.criteres),
        action: "Voir les annonces",
      });
    }
  }

  const favoris = lireFavoris();
  for (const b of biens.filter((x) => favoris.includes(x.id) && x.prix_baisser && x.ancien_prix)) {
    out.push({
      id: `baisse-${b.id}-${b.prix}`,
      categorie: "annonce",
      titre: `Prix en baisse sur un favori : ${b.titre}`,
      detail: `${b.ancien_prix!.toLocaleString("fr-FR")} → ${b.prix.toLocaleString("fr-FR")} FCFA`,
      date: b.publieLe ?? "2026-10-01T08:00:00.000Z",
      lien: `/annonces/${b.id}`,
    });
  }

  if (params.flags.cadastre && (estCoteVendeur(user.role) || user.role === "acheteur")) {
    const suivis = user.role === "acheteur" ? new Set([...dossiers.map((d) => d.bienId), ...favoris]) : null;
    for (const d of lireDemandesTF().filter((x) => x.statut === "invalide" && x.bienId && (!suivis || suivis.has(x.bienId)))) {
      out.push({
        id: `tf-invalide-${d.id}`,
        categorie: "urgent",
        titre: `TF ${d.numero} invalide · ${titreBien(d.bienId!)}`,
        detail: d.motif ?? "Anomalie détectée lors de la vérification.",
        date: d.traiteLe ?? d.soumisLe,
        lien: `/annonces/${d.bienId}`,
      });
    }
  }

  if (params.flags.cadastre && user.role === "notaire") {
    const enCours = lireDemandesTF().filter((d) => d.statut === "en_verification");
    if (enCours.length > 0) {
      out.push({
        id: `tf-${enCours.length}`,
        categorie: "dossier",
        titre: `${enCours.length} TF en attente de décision`,
        detail: enCours.map((d) => `TF ${d.numero}`).join(", "),
        date: enCours[0].soumisLe,
        lien: "/verification-tf",
        action: "Traiter",
      });
    }
  }

  if (estCoteVendeur(user.role)) {
    for (const s of lireSignalements().filter((x) => x.statut === "retire")) {
      out.push({ id: `retrait-${s.id}`, categorie: "urgent", titre: `Annonce retirée par la modération · ${titreBien(s.bienId)}`, detail: `Motif : ${s.motif}.`, date: s.date, lien: `/mes-annonces/${s.bienId}` });
    }
  }

  // Signalements et KYC concernent aussi le modérateur.
  if (estPlateforme(user.role)) {
    const signales = lireSignalements().filter((s) => s.statut === "ouvert");
    if (signales.length > 0) {
      out.push({ id: `signalements-${signales.length}`, categorie: "urgent", titre: `${signales.length} signalement${signales.length > 1 ? "s" : ""} à traiter`, detail: signales.map((s) => s.motif).join(", "), date: signales[0].date, lien: "/admin/moderation", action: "Traiter" });
    }
    const kyc = lireUtilisateurs().filter((u) => u.statutKYC === "en_attente");
    if (kyc.length > 0) {
      out.push({
        id: `kyc-${kyc.length}`,
        categorie: "dossier",
        titre: `${kyc.length} dossier${kyc.length > 1 ? "s" : ""} KYC à traiter`,
        detail: kyc.map((u) => u.nom).join(", "),
        date: kyc[0].kyc?.soumisLe ?? kyc[0].inscritLe,
        lien: "/admin/utilisateurs",
        action: "Traiter",
      });
    }
  }

  return out
    .map((n) => ({ ...n, lue: lues.includes(n.id) }))
    .sort((a, b) => (a.categorie === "urgent" ? -1 : 0) - (b.categorie === "urgent" ? -1 : 0) || b.date.localeCompare(a.date));
}

export function useNotifications(user: User | null): Notification[] {
  return useStocke(() => (user ? calculer(user) : []), [], [user?.email, user?.role]);
}
