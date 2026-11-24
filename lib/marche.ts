import { Bien } from "./mock-data";
import { Dossier, statutVente } from "./dossiers";

export function mediane(valeurs: number[]): number {
  if (valeurs.length === 0) return 0;
  const t = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}

export type PositionPrix = {
  ecart: number;
  medianeM2: number;
  nbComparables: number;
  perimetre: string;
  niveau: "dessous" | "moyenne" | "dessus";
};

const SEUIL_ECART = 15;
const MIN_COMPARABLES = 2;

type Reference = Pick<Bien, "type" | "region" | "prix" | "superficie" | "transaction"> & { id?: string };

// Compare d'abord à la même région, puis à tout le pays si les annonces locales sont trop peu nombreuses.
export function positionPrix(bien: Reference, biens: Bien[]): PositionPrix | null {
  if (bien.prix <= 0 || bien.superficie <= 0) return null;
  // Une vente se compare à des ventes, une location à des locations.
  const memeType = biens.filter((b) => b.id !== bien.id && b.type === bien.type && (b.transaction ?? "vente") === (bien.transaction ?? "vente"));
  const memeRegion = memeType.filter((b) => b.region === bien.region);
  const lot = memeRegion.length >= MIN_COMPARABLES ? memeRegion : memeType;
  if (lot.length < MIN_COMPARABLES) return null;
  const medianeM2 = mediane(lot.map((b) => b.prix / b.superficie));
  const ecart = Math.round(((bien.prix / bien.superficie - medianeM2) / medianeM2) * 100);
  return {
    ecart,
    medianeM2,
    nbComparables: lot.length,
    perimetre: lot === memeRegion ? bien.region : "tout le Sénégal",
    niveau: ecart > SEUIL_ECART ? "dessus" : ecart < -SEUIL_ECART ? "dessous" : "moyenne",
  };
}

export type Estimation = {
  bas: number;
  estime: number;
  haut: number;
  medianeM2: number;
  comparables: Bien[];
  perimetre: string;
  fiabilite: "faible" | "moyenne" | "bonne";
};

type Sujet = Pick<Bien, "type" | "region" | "superficie"> & { quartier?: string; id?: string };

// Estimation par comparaison : on part du périmètre le plus fin qui offre assez d'annonces,
// et la fourchette s'élargit à mesure qu'on s'éloigne du bien.
export function estimer(sujet: Sujet, biens: Bien[]): Estimation | null {
  if (sujet.superficie <= 0) return null;
  const memeType = biens.filter((b) => b.id !== sujet.id && b.type === sujet.type && b.superficie > 0);
  const memeRegion = memeType.filter((b) => b.region === sujet.region);
  const memeQuartier = sujet.quartier ? memeRegion.filter((b) => b.quartier.toLowerCase() === sujet.quartier!.trim().toLowerCase()) : [];
  // Une seule annonce dans la région reste un meilleur repère que la médiane nationale, où les prix n'ont rien à voir.
  const niveaux = [
    { lot: memeQuartier, min: MIN_COMPARABLES, perimetre: sujet.quartier ?? "", marge: 0.1, fiabilite: "bonne" as const },
    { lot: memeRegion, min: MIN_COMPARABLES, perimetre: `région de ${sujet.region}`, marge: 0.15, fiabilite: "moyenne" as const },
    { lot: memeRegion, min: 1, perimetre: `région de ${sujet.region} (1 seule annonce)`, marge: 0.25, fiabilite: "faible" as const },
    { lot: memeType, min: MIN_COMPARABLES, perimetre: "tout le Sénégal", marge: 0.3, fiabilite: "faible" as const },
  ];
  const n = niveaux.find((x) => x.lot.length >= x.min);
  if (!n) return null;
  const medianeM2 = mediane(n.lot.map((b) => b.prix / b.superficie));
  const arrondi = (v: number) => Math.round(v / 100_000) * 100_000;
  const estime = medianeM2 * sujet.superficie;
  // Les plus proches en surface d'abord : ce sont les comparaisons les plus parlantes.
  const comparables = [...n.lot].sort((a, b) => Math.abs(a.superficie - sujet.superficie) - Math.abs(b.superficie - sujet.superficie)).slice(0, 3);
  return {
    bas: arrondi(estime * (1 - n.marge)),
    estime: arrondi(estime),
    haut: arrondi(estime * (1 + n.marge)),
    medianeM2,
    comparables,
    perimetre: n.perimetre,
    fiabilite: n.fiabilite,
  };
}

export type Demande = { niveau: "forte" | "soutenue"; raisons: string[] };

const VUES_FORTE = 400;
const VUES_SOUTENUE = 250;

// Signal d'intérêt : vues, demandes de visite et offres en cours sur le bien.
export function niveauDemande(bien: Bien, nbVisites: number, nbOffres: number): Demande | null {
  const interactions = nbVisites + nbOffres * 2;
  const forte = bien.nb_vues >= VUES_FORTE || interactions >= 3;
  const soutenue = bien.nb_vues >= VUES_SOUTENUE || interactions >= 1;
  if (!forte && !soutenue) return null;
  const raisons = [
    `${bien.nb_vues} vues`,
    nbVisites > 0 ? `${nbVisites} demande${nbVisites > 1 ? "s" : ""} de visite` : "",
    nbOffres > 0 ? `${nbOffres} offre${nbOffres > 1 ? "s" : ""} en cours` : "",
  ].filter(Boolean);
  return { niveau: forte ? "forte" : "soutenue", raisons };
}

// Recommandations à partir de ce que la personne a consulté ou mis en favori.
export function recommander(biens: Bien[], consultes: string[], favoris: string[], dossiers: Dossier[], nb = 3): Bien[] {
  const interet = biens.filter((b) => consultes.includes(b.id) || favoris.includes(b.id));
  if (interet.length === 0) return [];
  const types = new Set(interet.map((b) => b.type));
  const regions = new Set(interet.map((b) => b.region));
  const budget = mediane(interet.map((b) => b.prix));
  return biens
    .filter((b) => !consultes.includes(b.id) && !favoris.includes(b.id) && statutVente(b.id, dossiers) === "disponible")
    .map((b) => ({
      b,
      score: (types.has(b.type) ? 3 : 0) + (regions.has(b.region) ? 2 : 0) + (Math.abs(b.prix - budget) <= budget * 0.5 ? 2 : 0) + (b.is_verified_tf ? 1 : 0),
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, nb)
    .map((x) => x.b);
}
