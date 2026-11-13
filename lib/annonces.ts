"use client";
import { BIENS, Bien, COORDONNEES, CENTRES_REGIONS } from "./mock-data";
import { lire, ecrire, nouvelId, signalerMaj, useStocke } from "./stockage";
import { popup } from "./popup";

const CLE_ANNONCES = "keurbi_annonces";
const CLE_META = "keurbi_annonces_meta";

export type MetaAnnonce = {
  depublie?: boolean;
  prix?: number;
  titre?: string;
  description?: string;
  boostJusquau?: string;
  historiquePrix?: { date: string; prix: number }[];
};

export type NouvelleAnnonce = Pick<
  Bien,
  "titre" | "type" | "superficie" | "prix" | "region" | "ville" | "quartier" | "description" | "agence" | "telephone"
> & {
  photos: string[];
  auteurEmail: string;
  proprietaire: string;
  tf: Bien["tf"];
};

/* ── Annonces de la base de données ──
   Le serveur les fournit via /api/annonces. En attendant sa réponse (ou s'il ne répond pas),
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

function lireAnnoncesLocales(): Bien[] {
  return lire<Bien[]>(CLE_ANNONCES, []);
}

function lireMeta(): Record<string, MetaAnnonce> {
  return lire<Record<string, MetaAnnonce>>(CLE_META, {});
}

export function boostActif(meta?: MetaAnnonce): boolean {
  return !!meta?.boostJusquau && new Date(meta.boostJusquau).getTime() > Date.now();
}

function appliquerMeta(bien: Bien, meta?: MetaAnnonce): Bien {
  if (!meta) return bien;
  const baisse = meta.prix !== undefined && meta.prix < bien.prix;
  return {
    ...bien,
    titre: meta.titre ?? bien.titre,
    description: meta.description ?? bien.description,
    prix: meta.prix ?? bien.prix,
    prix_baisser: baisse || bien.prix_baisser,
    ancien_prix: baisse ? bien.prix : bien.ancien_prix,
    is_featured: bien.is_featured || boostActif(meta),
  };
}

export function tousLesBiens(inclureDepublies = false): Bien[] {
  const meta = lireMeta();
  return [...lireAnnoncesLocales(), ...biensBase]
    .filter((b) => inclureDepublies || !meta[b.id]?.depublie)
    .map((b) => appliquerMeta(b, meta[b.id]));
}

export function useBiens(inclureDepublies = false): Bien[] {
  return useStocke(() => tousLesBiens(inclureDepublies), biensBase, [inclureDepublies]);
}

export function useMetaAnnonce(id: string): MetaAnnonce {
  return useStocke(() => lireMeta()[id] ?? {}, {}, [id]);
}

function majMeta(id: string, maj: (m: MetaAnnonce) => MetaAnnonce) {
  const meta = lireMeta();
  ecrire(CLE_META, { ...meta, [id]: maj(meta[id] ?? {}) });
}

export function publierAnnonce(a: NouvelleAnnonce): Bien {
  popup.succes("Annonce publiée", a.titre);
  const existantes = lireAnnoncesLocales();
  const id = `local-${nouvelId()}`;
  const centre = CENTRES_REGIONS[a.region] ?? CENTRES_REGIONS.Dakar;
  // Léger décalage pour éviter que les annonces d'une même région se superposent sur la carte.
  const decalage = () => (Math.random() - 0.5) * 0.04;
  const nouvelle: Bien = {
    ...a,
    id,
    reference: `KB-2026-${String(biensBase.length + existantes.length + 1).padStart(4, "0")}`,
    photo: a.photos[0],
    is_verified_tf: false,
    is_featured: false,
    prix_baisser: false,
    nb_vues: 0,
    agence_slug: "",
    lat: centre[0] + decalage(),
    lng: centre[1] + decalage(),
    publieLe: new Date().toISOString(),
  };
  ecrire(CLE_ANNONCES, [nouvelle, ...existantes]);
  return nouvelle;
}

export function modifierPrix(bien: Bien, prix: number) {
  popup.succes("Prix mis à jour", `${prix.toLocaleString("fr-FR")} FCFA`);
  majMeta(bien.id, (m) => ({
    ...m,
    prix,
    historiquePrix: [...(m.historiquePrix ?? []), { date: new Date().toISOString(), prix }],
  }));
}

export function modifierTexte(id: string, titre: string, description: string) {
  popup.succes("Annonce mise à jour");
  majMeta(id, (m) => ({ ...m, titre, description }));
}

export function useMetasAnnonces(): Record<string, MetaAnnonce> {
  return useStocke(lireMeta, {});
}

export function basculerPublication(id: string) {
  popup.succes(lireMeta()[id]?.depublie ? "Annonce republiée" : "Annonce retirée de la publication");
  majMeta(id, (m) => ({ ...m, depublie: !m.depublie }));
}

export function booster(id: string, jours = 30) {
  popup.succes("Annonce boostée", `Mise en avant pendant ${jours} jours.`);
  const fin = new Date();
  fin.setDate(fin.getDate() + jours);
  majMeta(id, (m) => ({ ...m, boostJusquau: fin.toISOString() }));
}

export function coordonnees(b: Bien): [number, number] {
  if (b.lat !== undefined && b.lng !== undefined) return [b.lat, b.lng];
  return COORDONNEES[b.id] ?? CENTRES_REGIONS[b.region] ?? CENTRES_REGIONS.Dakar;
}

export { nouvelId };
