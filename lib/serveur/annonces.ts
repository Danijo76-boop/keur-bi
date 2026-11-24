import "server-only";
import { Prisma, type Agence, type Bien as LigneBien, type HistoriquePrix, type Plan, type Role, type Utilisateur } from "@prisma/client";
import type { Bien } from "@/lib/mock-data";
import { db } from "./db";
import { photoAcceptee } from "./fichiers";

type LigneComplete = LigneBien & { agence: Agence | null; auteur: { email: string } | null; historiquePrix: HistoriquePrix[] };

const AVEC = { agence: true, auteur: { select: { email: true } }, historiquePrix: { orderBy: { date: "asc" } } } as const;

// Convertit une ligne de la base vers la forme que les pages utilisent déjà.
export function versBien(l: LigneComplete): Bien {
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
    depublie: l.depublie || undefined,
    boostJusquau: l.boostJusquau?.toISOString(),
    transaction: l.transaction,
    charges: l.charges === null ? undefined : Number(l.charges),
    caution: l.caution === null ? undefined : Number(l.caution),
    meuble: l.meuble || undefined,
    nb_pieces: l.nbPieces ?? undefined,
    historiquePrix: l.historiquePrix.length ? l.historiquePrix.map((h) => ({ date: h.date.toISOString(), prix: Number(h.prix) })) : undefined,
  };
}

/* ── Qui a le droit de quoi ── */

const ROLES_VENDEURS: Role[] = ["vendeur", "agence", "agent", "admin"];
const MODERATION: Role[] = ["admin", "moderateur"];

export const peutPublier = (role: Role) => ROLES_VENDEURS.includes(role);
const estProprietaire = (compte: Utilisateur, bien: { auteurId: string | null }) => bien.auteurId === compte.id;

// Nombre d'annonces actives autorisées : particulier 2, agence selon son abonnement, agent et admin sans limite propre.
const QUOTA_PLAN: Partial<Record<Plan, number>> = { gratuit: 1, pro: 5, promoteur: Infinity };
export function quotaAnnonces(compte: Pick<Utilisateur, "role" | "plan">): number {
  if (compte.role === "vendeur") return 2;
  if (compte.role === "agence") return QUOTA_PLAN[compte.plan ?? "gratuit"] ?? 1;
  return Infinity;
}

const annoncesActives = (auteurId: string) => db.bien.count({ where: { auteurId, depublie: false } });

/* ── Lecture ── */

export type FiltresAnnonces = { transaction?: string; q?: string; type?: string; region?: string; quartier?: string; prixMin?: number; prixMax?: number };

const TYPES = ["terrain", "villa", "appartement", "bureau"] as const;
export const REGIONS_ACCEPTEES = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack"];

// Les annonces publiées sont visibles de tous. Les annonces retirées ne le sont que de leur auteur et de la modération.
export async function listerAnnonces(f: FiltresAnnonces = {}, compte?: Utilisateur | null): Promise<Bien[]> {
  const type = TYPES.find((t) => t === f.type);
  const visibilite: Prisma.BienWhereInput = !compte
    ? { depublie: false }
    : MODERATION.includes(compte.role)
      ? {}
      : { OR: [{ depublie: false }, { auteurId: compte.id }] };
  const where: Prisma.BienWhereInput = {
    AND: [
      visibilite,
      {
        ...((f.transaction === "vente" || f.transaction === "location") && { transaction: f.transaction }),
        ...(type && { type }),
        ...(f.region && { region: f.region }),
        ...(f.quartier && { quartier: f.quartier }),
        ...((f.prixMin !== undefined || f.prixMax !== undefined) && {
          prix: {
            ...(f.prixMin !== undefined && { gte: BigInt(Math.round(f.prixMin)) }),
            ...(f.prixMax !== undefined && { lte: BigInt(Math.round(f.prixMax)) }),
          },
        }),
        ...(f.q && {
          OR: ["titre", "quartier", "ville", "description"].map((champ) => ({ [champ]: { contains: f.q, mode: "insensitive" } })),
        }),
      },
    ],
  };
  const lignes = await db.bien.findMany({ where, include: AVEC, orderBy: [{ vedette: "desc" }, { publieLe: "desc" }] });
  return lignes.map(versBien);
}

export async function trouverAnnonce(id: string, compte?: Utilisateur | null): Promise<Bien | null> {
  const ligne = await db.bien.findUnique({ where: { id }, include: AVEC });
  if (!ligne) return null;
  if (ligne.depublie && !(compte && (MODERATION.includes(compte.role) || estProprietaire(compte, ligne)))) return null;
  return versBien(ligne);
}

/* ── Publication ── */

export type ResultatAnnonce = { ok: true; annonce: Bien } | { ok: false; erreur: string; status: number };
const refus = (erreur: string, status = 400): ResultatAnnonce => ({ ok: false, erreur, status });

const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const entier = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : NaN);

const CENTRES: Record<string, [number, number]> = {
  Dakar: [14.7167, -17.4677],
  Thiès: [14.791, -16.9256],
  "Saint-Louis": [16.0179, -16.4896],
  Ziguinchor: [12.5681, -16.2719],
  Kaolack: [14.1652, -16.0726],
};

const PRIX_MAX = 1_000_000_000_000;

export async function creerAnnonce(compte: Utilisateur, corps: Record<string, unknown>): Promise<ResultatAnnonce> {
  if (!peutPublier(compte.role)) return refus("La publication est réservée aux vendeurs : particulier, agence ou agent.", 403);

  const transaction = corps.transaction === "location" ? "location" : "vente";
  const montantFacultatif = (v: unknown) => {
    const n = entier(v);
    return n >= 0 && n <= PRIX_MAX ? BigInt(n) : null;
  };
  const charges = montantFacultatif(corps.charges);
  const caution = montantFacultatif(corps.caution);
  const nbPieces = entier(corps.nb_pieces);
  const titre = texte(corps.titre, 120);
  const type = TYPES.find((t) => t === corps.type);
  const superficie = entier(corps.superficie);
  const prix = entier(corps.prix);
  const region = REGIONS_ACCEPTEES.find((r) => r === corps.region);
  const ville = texte(corps.ville, 80);
  const quartier = texte(corps.quartier, 80);
  const description = texte(corps.description, 5000);
  const photos = Array.isArray(corps.photos) ? corps.photos : [];
  const tf = (corps.tf && typeof corps.tf === "object" ? corps.tf : {}) as Record<string, unknown>;
  const dateTF = typeof tf.date_etablissement === "string" && tf.date_etablissement ? new Date(tf.date_etablissement) : null;
  const superficieTF = entier(tf.superficie_cadastrale);

  if (titre.length < 5) return refus("Le titre doit contenir au moins 5 caractères.");
  if (!type) return refus("Type de bien inconnu.");
  if (!(superficie >= 1 && superficie <= 10_000_000)) return refus("Superficie invalide.");
  if (!(prix >= 1 && prix <= (transaction === "location" ? 100_000_000 : PRIX_MAX)))
    return refus(transaction === "location" ? "Loyer invalide." : "Prix invalide.");
  if (!region) return refus("Région inconnue.");
  if (!ville || !quartier) return refus("Indiquez la ville et le quartier.");
  if (description.length < 10) return refus("La description est trop courte.");
  if (photos.length < 3 || photos.length > 8) return refus("Une annonce comporte entre 3 et 8 photos.");
  if (!photos.every(photoAcceptee)) return refus("Une photo n'a pas été envoyée correctement. Réessayez.");
  if (dateTF && Number.isNaN(dateTF.getTime())) return refus("Date du Titre Foncier invalide.");

  const quota = quotaAnnonces(compte);
  if ((await annoncesActives(compte.id)) >= quota)
    return refus(`Votre compte permet ${quota} annonce(s) active(s). Retirez-en une ou changez d'abonnement.`, 403);

  const [lat0, lng0] = CENTRES[region];
  // Léger décalage pour éviter que les annonces d'une même région se superposent sur la carte.
  const decalage = () => (Math.random() - 0.5) * 0.04;
  const annee = new Date().getFullYear();

  // La référence suit le nombre d'annonces ; si deux publications tombent en même temps, on réessaie avec le numéro suivant.
  for (let essai = 0; essai < 5; essai++) {
    const numero = (await db.bien.count()) + 1 + essai;
    try {
      const ligne = await db.bien.create({
        data: {
          reference: `KB-${annee}-${String(numero).padStart(4, "0")}`,
          titre,
          type,
          superficie,
          prix: BigInt(prix),
          region,
          ville,
          quartier,
          description,
          transaction,
          ...(transaction === "location" && { charges, caution, meuble: corps.meuble === true }),
          nbPieces: nbPieces >= 1 && nbPieces <= 50 ? nbPieces : null,
          photo: photos[0],
          photos,
          telephone: texte(corps.telephone, 30) || compte.telephone || "",
          lat: lat0 + decalage(),
          lng: lng0 + decalage(),
          agenceNom: texte(corps.agence, 120) || compte.nom,
          auteurId: compte.id,
          proprietaire: texte(corps.proprietaire, 120) || null,
          tfNumero: texte(tf.numero, 40) || null,
          tfConservation: texte(tf.conservation, 80) || null,
          tfDateEtablissement: dateTF,
          tfSuperficieCadastrale: superficieTF >= 1 && superficieTF <= 10_000_000 ? superficieTF : null,
        },
        include: AVEC,
      });
      return { ok: true, annonce: versBien(ligne) };
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  return refus("La publication n'a pas abouti. Réessayez.", 503);
}

/* ── Modification ──
   Titre, description, prix : l'auteur ou un administrateur.
   Retrait / remise en ligne : l'auteur, un administrateur ou un modérateur.
   Mise en avant : l'auteur (particulier ou agence) ou un administrateur. */
export async function modifierAnnonce(compte: Utilisateur, id: string, patch: Record<string, unknown>): Promise<ResultatAnnonce> {
  const bien = await db.bien.findUnique({ where: { id } });
  if (!bien) return refus("Annonce introuvable.", 404);
  const proprietaire = estProprietaire(compte, bien);
  const admin = compte.role === "admin";
  const donnees: Prisma.BienUpdateInput = {};

  if ("titre" in patch || "description" in patch || "prix" in patch) {
    if (!proprietaire && !admin) return refus("Seul l'auteur de l'annonce peut la modifier.", 403);
    if ("titre" in patch) {
      const titre = texte(patch.titre, 120);
      if (titre.length < 5) return refus("Le titre doit contenir au moins 5 caractères.");
      donnees.titre = titre;
    }
    if ("description" in patch) {
      const description = texte(patch.description, 5000);
      if (description.length < 10) return refus("La description est trop courte.");
      donnees.description = description;
    }
    if ("prix" in patch) {
      const prix = entier(patch.prix);
      if (!(prix >= 1 && prix <= PRIX_MAX)) return refus("Prix invalide.");
      if (BigInt(prix) !== bien.prix) {
        const baisse = BigInt(prix) < bien.prix;
        donnees.prix = BigInt(prix);
        donnees.historiquePrix = { create: { prix: BigInt(prix) } };
        // Une baisse garde l'ancien prix pour l'afficher barré ; une hausse efface la mention « prix en baisse ».
        donnees.prixEnBaisse = baisse;
        donnees.ancienPrix = baisse ? bien.prix : null;
      }
    }
  }

  if ("depublie" in patch) {
    if (!proprietaire && !MODERATION.includes(compte.role)) return refus("Vous ne pouvez pas retirer cette annonce.", 403);
    const depublie = patch.depublie === true;
    // Remettre en ligne compte dans le quota, sinon il suffirait de retirer puis republier pour le dépasser.
    if (!depublie && bien.depublie && bien.auteurId) {
      const auteur = proprietaire ? compte : await db.utilisateur.findUnique({ where: { id: bien.auteurId } });
      if (auteur && (await annoncesActives(auteur.id)) >= quotaAnnonces(auteur)) return refus("Le quota d'annonces actives de ce compte est atteint.", 403);
    }
    donnees.depublie = depublie;
  }

  if (patch.boost === true) {
    const autorise = admin || (proprietaire && (compte.role === "vendeur" || compte.role === "agence"));
    if (!autorise) return refus("Vous ne pouvez pas mettre cette annonce en avant.", 403);
    // Le paiement de la mise en avant n'est pas encore branché : elle est accordée sans encaissement.
    donnees.boostJusquau = new Date(Date.now() + 30 * 86_400_000);
  }

  if (!Object.keys(donnees).length) return { ok: true, annonce: versBien(await db.bien.findUniqueOrThrow({ where: { id }, include: AVEC })) };
  const ligne = await db.bien.update({ where: { id }, data: donnees, include: AVEC });
  return { ok: true, annonce: versBien(ligne) };
}
