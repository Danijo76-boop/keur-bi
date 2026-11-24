import "server-only";
import type { Agence, LotProgramme as LigneLot, Programme as LigneProgramme, Utilisateur } from "@prisma/client";
import type { Programme } from "@/lib/programmes";
import { AVANCEMENTS } from "@/lib/programmes";
import { db } from "./db";
import { photoAcceptee } from "./fichiers";
import { REGIONS_ACCEPTEES } from "./annonces";

type Ligne = LigneProgramme & { lots: LigneLot[]; agence: Agence | null; auteur: { email: string } | null };
const AVEC = { lots: { orderBy: { prix: "asc" } }, agence: true, auteur: { select: { email: true } } } as const;

export function versProgramme(l: Ligne): Programme {
  return {
    id: l.id,
    slug: l.slug,
    nom: l.nom,
    promoteur: l.promoteur,
    agenceSlug: l.agence?.slug,
    auteurEmail: l.auteur?.email,
    region: l.region,
    ville: l.ville,
    quartier: l.quartier,
    description: l.description,
    photo: l.photo,
    photos: l.photos,
    livraison: l.livraison,
    avancement: l.avancement,
    lat: l.lat ?? undefined,
    lng: l.lng ?? undefined,
    publie: l.publie,
    lots: l.lots.map((x) => ({
      id: x.id,
      type: x.type,
      libelle: x.libelle,
      superficie: x.superficie,
      nbPieces: x.nbPieces ?? undefined,
      prix: Number(x.prix),
      disponible: x.disponible,
    })),
  };
}

export async function listerProgrammes(region?: string): Promise<Programme[]> {
  const lignes = await db.programme.findMany({
    where: { publie: true, ...(region && REGIONS_ACCEPTEES.includes(region) && { region }) },
    include: AVEC,
    orderBy: { creeLe: "desc" },
  });
  return lignes.map(versProgramme);
}

export async function trouverProgramme(slug: string): Promise<Programme | null> {
  const ligne = await db.programme.findUnique({ where: { slug }, include: AVEC });
  return ligne && ligne.publie ? versProgramme(ligne) : null;
}

/* ── Publication ── réservée aux agences (promoteurs) et à l'administration. */
export const peutPublierProgramme = (compte: Pick<Utilisateur, "role">) => compte.role === "agence" || compte.role === "admin";

const TYPES = ["terrain", "villa", "appartement", "bureau"] as const;
const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const entier = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : NaN);

function slugDe(nom: string): string {
  const base =
    nom
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "programme";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

const CENTRES: Record<string, [number, number]> = {
  Dakar: [14.7167, -17.4677],
  Thiès: [14.791, -16.9256],
  "Saint-Louis": [16.0179, -16.4896],
  Ziguinchor: [12.5681, -16.2719],
  Kaolack: [14.1652, -16.0726],
};

export type ResultatProgramme = { ok: true; programme: Programme } | { ok: false; erreur: string; status: number };

export async function creerProgramme(compte: Utilisateur, corps: Record<string, unknown>): Promise<ResultatProgramme> {
  const refus = (erreur: string, status = 400): ResultatProgramme => ({ ok: false, erreur, status });
  if (!peutPublierProgramme(compte)) return refus("La publication de programmes neufs est réservée aux agences et promoteurs.", 403);

  const nom = texte(corps.nom, 120);
  const promoteur = texte(corps.promoteur, 120) || compte.nom;
  const region = REGIONS_ACCEPTEES.find((r) => r === corps.region);
  const ville = texte(corps.ville, 80);
  const quartier = texte(corps.quartier, 80);
  const description = texte(corps.description, 5000);
  const livraison = texte(corps.livraison, 60);
  const avancement = AVANCEMENTS.find((a) => a === corps.avancement) ?? AVANCEMENTS[0];
  const photos = Array.isArray(corps.photos) ? corps.photos : [];
  const lots = Array.isArray(corps.lots) ? corps.lots : [];

  if (nom.length < 5) return refus("Le nom du programme doit contenir au moins 5 caractères.");
  if (!region) return refus("Région inconnue.");
  if (!ville || !quartier) return refus("Indiquez la ville et le quartier.");
  if (description.length < 20) return refus("La description est trop courte.");
  if (!livraison) return refus("Indiquez la date de livraison prévue.");
  if (photos.length < 1 || photos.length > 8 || !photos.every(photoAcceptee)) return refus("Ajoutez entre 1 et 8 photos.");
  if (lots.length < 1 || lots.length > 50) return refus("Un programme comporte entre 1 et 50 lots.");

  const lotsPropres = [];
  for (const [i, l] of lots.entries()) {
    const lot = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
    const type = TYPES.find((t) => t === lot.type);
    const libelle = texte(lot.libelle, 120);
    const superficie = entier(lot.superficie);
    const prix = entier(lot.prix);
    const nbPieces = entier(lot.nbPieces);
    if (!type || !libelle || !(superficie >= 1 && superficie <= 1_000_000) || !(prix >= 1 && prix <= 1_000_000_000_000))
      return refus(`Lot ${i + 1} : type, libellé, superficie et prix sont obligatoires.`);
    lotsPropres.push({
      type,
      libelle,
      superficie,
      prix: BigInt(prix),
      nbPieces: nbPieces >= 1 && nbPieces <= 50 ? nbPieces : null,
      disponible: lot.disponible !== false,
    });
  }

  const [lat, lng] = CENTRES[region];
  const ligne = await db.programme.create({
    data: {
      slug: slugDe(nom),
      nom,
      promoteur,
      region,
      ville,
      quartier,
      description,
      livraison,
      avancement,
      photo: photos[0],
      photos,
      lat: lat + (Math.random() - 0.5) * 0.04,
      lng: lng + (Math.random() - 0.5) * 0.04,
      auteurId: compte.id,
      lots: { create: lotsPropres },
    },
    include: AVEC,
  });
  return { ok: true, programme: versProgramme(ligne) };
}
