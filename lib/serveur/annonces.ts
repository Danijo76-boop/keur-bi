import "server-only";
import type { Bien as LigneBien, Agence, Prisma } from "@prisma/client";
import type { Bien } from "@/lib/mock-data";
import { db } from "./db";

type LigneAvecAgence = LigneBien & { agence: Agence | null; auteur: { email: string } | null };

// Convertit une ligne de la base vers la forme que les pages utilisent déjà,
// pour pouvoir basculer l'affichage sur la base sans réécrire les composants.
export function versBien(l: LigneAvecAgence): Bien {
  const boost = !!l.boostJusquau && l.boostJusquau.getTime() > Date.now();
  return {
    id: l.id,
    reference: l.reference,
    titre: l.titre,
    type: l.type,
    superficie: l.superficie,
    prix: Number(l.prix),
    region: l.region,
    ville: l.ville,
    quartier: l.quartier,
    is_verified_tf: l.tfVerifie,
    is_featured: l.vedette || boost,
    prix_baisser: l.prixEnBaisse,
    ancien_prix: l.ancienPrix === null ? undefined : Number(l.ancienPrix),
    nb_vues: l.nbVues,
    photo: l.photo,
    photos: l.photos.length ? l.photos : undefined,
    agence: l.agenceNom,
    agence_slug: l.agence?.slug ?? "",
    telephone: l.telephone,
    description: l.description,
    tf: {
      numero: l.tfNumero,
      conservation: l.tfConservation,
      date_etablissement: l.tfDateEtablissement?.toISOString().slice(0, 10) ?? null,
      superficie_cadastrale: l.tfSuperficieCadastrale,
    },
    lat: l.lat ?? undefined,
    lng: l.lng ?? undefined,
    auteurEmail: l.auteur?.email,
    proprietaire: l.proprietaire ?? undefined,
    publieLe: l.publieLe.toISOString(),
  };
}

const AVEC = { agence: true, auteur: { select: { email: true } } } as const;

export type FiltresAnnonces = { q?: string; type?: string; region?: string; quartier?: string; prixMin?: number; prixMax?: number };

const TYPES = ["terrain", "villa", "appartement", "bureau"] as const;

export async function listerAnnonces(f: FiltresAnnonces = {}): Promise<Bien[]> {
  const type = TYPES.find((t) => t === f.type);
  const where: Prisma.BienWhereInput = {
    depublie: false,
    ...(type && { type }),
    ...(f.region && { region: f.region }),
    ...(f.quartier && { quartier: f.quartier }),
    ...((f.prixMin !== undefined || f.prixMax !== undefined) && {
      prix: { ...(f.prixMin !== undefined && { gte: BigInt(Math.round(f.prixMin)) }), ...(f.prixMax !== undefined && { lte: BigInt(Math.round(f.prixMax)) }) },
    }),
    ...(f.q && {
      OR: ["titre", "quartier", "ville", "description"].map((champ) => ({ [champ]: { contains: f.q, mode: "insensitive" } })),
    }),
  };
  const lignes = await db.bien.findMany({ where, include: AVEC, orderBy: [{ vedette: "desc" }, { publieLe: "desc" }] });
  return lignes.map(versBien);
}

export async function trouverAnnonce(id: string): Promise<Bien | null> {
  const ligne = await db.bien.findFirst({ where: { id, depublie: false }, include: AVEC });
  return ligne ? versBien(ligne) : null;
}
