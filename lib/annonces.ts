"use client";
import { BIENS, Bien, COORDONNEES, CENTRES_REGIONS } from "./mock-data";
import { nouvelId, signalerMaj, useStocke } from "./stockage";
import { popup } from "./popup";

// État de gestion d'une annonce, visible de son auteur et de la modération.
export type MetaAnnonce = {
  depublie?: boolean;
  boostJusquau?: string;
  historiquePrix?: { date: string; prix: number }[];
};

export type NouvelleAnnonce = Pick<
  Bien,
  "titre" | "type" | "superficie" | "prix" | "region" | "ville" | "quartier" | "description" | "agence" | "telephone"
> & {
  // Photos choisies dans le formulaire : images encodées à envoyer, ou adresses déjà hébergées.
  photos: string[];
  proprietaire: string;
  tf: Bien["tf"];
};

/* ── Annonces de la base de données ──
   Le serveur les fournit via /api/annonces : les annonces publiées pour tout le monde, plus les annonces
   retirées pour leur auteur et la modération. En attendant sa réponse (ou s'il ne répond pas),
   les annonces d'exemple embarquées servent d'affichage provisoire. */
let biensBase: Bien[] = BIENS;
let chargement: Promise<void> | undefined;

export function chargerBiensBase(forcer = false): Promise<void> {
  if (chargement && !forcer) return chargement;
  chargement = fetch("/api/annonces", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((d: { annonces: Bien[] }) => {
      biensBase = d.annonces;
      signalerMaj();
    })
    .catch((e) => {
      chargement = undefined;
      console.warn("Annonces : base de données injoignable, affichage des données d'exemple.", e);
    });
  return chargement;
}

// Remplace (ou ajoute en tête) une annonce renvoyée par le serveur, sans recharger toute la liste.
function integrer(bien: Bien) {
  biensBase = biensBase.some((b) => b.id === bien.id) ? biensBase.map((b) => (b.id === bien.id ? bien : b)) : [bien, ...biensBase];
  signalerMaj();
}

export function boostActif(meta?: MetaAnnonce): boolean {
  return !!meta?.boostJusquau && new Date(meta.boostJusquau).getTime() > Date.now();
}

export function tousLesBiens(inclureDepublies = false): Bien[] {
  return biensBase.filter((b) => inclureDepublies || !b.depublie);
}

export function useBiens(inclureDepublies = false): Bien[] {
  return useStocke(() => tousLesBiens(inclureDepublies), tousLesBiens(inclureDepublies), [inclureDepublies]);
}

const metaDe = (b?: Bien): MetaAnnonce => (b ? { depublie: b.depublie, boostJusquau: b.boostJusquau, historiquePrix: b.historiquePrix } : {});

export function useMetaAnnonce(id: string): MetaAnnonce {
  return useStocke(() => metaDe(biensBase.find((b) => b.id === id)), {}, [id]);
}

export function useMetasAnnonces(): Record<string, MetaAnnonce> {
  return useStocke(() => Object.fromEntries(biensBase.map((b) => [b.id, metaDe(b)])), {});
}

/* ── Écritures : tout passe par le serveur, qui vérifie les droits et les quotas ── */

type Reponse = { ok: boolean; donnees: { annonce?: Bien; url?: string; erreur?: string } };

async function appeler(url: string, methode: "POST" | "PATCH", corps: unknown): Promise<Reponse> {
  try {
    const r = await fetch(url, { method: methode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    return { ok: r.ok, donnees: await r.json().catch(() => ({})) };
  } catch {
    return { ok: false, donnees: { erreur: "Connexion au serveur impossible." } };
  }
}

// Envoie les photos une par une, puis l'annonce. Lève une erreur explicite si une étape échoue.
export async function publierAnnonce(a: NouvelleAnnonce): Promise<Bien> {
  const photos: string[] = [];
  for (const [i, photo] of a.photos.entries()) {
    if (!photo.startsWith("data:")) {
      photos.push(photo);
      continue;
    }
    const { ok, donnees } = await appeler("/api/fichiers", "POST", { dataUrl: photo });
    if (!ok || !donnees.url) throw new Error(`Photo ${i + 1} : ${donnees.erreur ?? "envoi impossible."}`);
    photos.push(donnees.url);
  }
  const { ok, donnees } = await appeler("/api/annonces", "POST", { ...a, photos });
  if (!ok || !donnees.annonce) throw new Error(donnees.erreur ?? "La publication n'a pas abouti.");
  integrer(donnees.annonce);
  popup.succes("Annonce publiée", a.titre);
  return donnees.annonce;
}

async function modifier(id: string, patch: Record<string, unknown>, succes: (b: Bien) => [string, string?]) {
  const { ok, donnees } = await appeler(`/api/annonces/${id}`, "PATCH", patch);
  if (!ok || !donnees.annonce) return popup.erreur("Modification non enregistrée", donnees.erreur ?? "Le serveur a refusé la demande.");
  integrer(donnees.annonce);
  popup.succes(...succes(donnees.annonce));
}

export function modifierPrix(bien: Bien, prix: number) {
  modifier(bien.id, { prix }, () => ["Prix mis à jour", `${prix.toLocaleString("fr-FR")} FCFA`]);
}

export function modifierTexte(id: string, titre: string, description: string) {
  modifier(id, { titre, description }, () => ["Annonce mise à jour"]);
}

export function basculerPublication(id: string) {
  const depublie = !biensBase.find((b) => b.id === id)?.depublie;
  modifier(id, { depublie }, (b) => [b.depublie ? "Annonce retirée de la publication" : "Annonce republiée"]);
}

export function booster(id: string, jours = 30) {
  modifier(id, { boost: true }, () => ["Annonce boostée", `Mise en avant pendant ${jours} jours.`]);
}

export function coordonnees(b: Bien): [number, number] {
  if (b.lat !== undefined && b.lng !== undefined) return [b.lat, b.lng];
  return COORDONNEES[b.id] ?? CENTRES_REGIONS[b.region] ?? CENTRES_REGIONS.Dakar;
}

export { nouvelId };
