// Charge les données d'exemple dans la base : agences, notaires, comptes de démonstration, annonces.
// Peut être relancé sans risque : chaque ligne est créée ou mise à jour, jamais dupliquée.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AGENCES } from "../lib/agences";
import { NOTAIRES } from "../lib/notaires";
import { BIENS, COORDONNEES } from "../lib/mock-data";
import { COMPTES_DEMO } from "../lib/utilisateurs";
import { PARAMETRES_DEFAUT } from "../lib/parametres";
import { LOCATIONS, PROGRAMMES } from "./exemples-location-neuf";

const prisma = new PrismaClient();
const date = (s?: string | null) => (s ? new Date(s) : null);

async function main() {
  for (const a of AGENCES) {
    const { agents, avis, slug, ...champs } = a;
    const donnees = { ...champs, avisInitiaux: avis };
    const agence = await prisma.agence.upsert({ where: { slug }, update: donnees, create: { slug, ...donnees } });
    await prisma.agentAgence.deleteMany({ where: { agenceId: agence.id } });
    await prisma.agentAgence.createMany({ data: agents.map((x) => ({ ...x, agenceId: agence.id })) });
  }

  for (const n of NOTAIRES) {
    const { avis, slug, ...champs } = n;
    const donnees = { ...champs, avisInitiaux: avis };
    await prisma.notaire.upsert({ where: { slug }, update: donnees, create: { slug, ...donnees } });
  }

  // Sans MOT_DE_PASSE_DEMO, les comptes d'exemple existent mais personne ne peut s'y connecter.
  const motDePasseDemo = process.env.MOT_DE_PASSE_DEMO;
  const hashDemo = motDePasseDemo ? await bcrypt.hash(motDePasseDemo, 12) : undefined;

  for (const u of COMPTES_DEMO) {
    const { kyc, email, inscritLe, derniereConnexion, ...champs } = u;
    const donnees = { ...champs, inscritLe: new Date(inscritLe), derniereConnexion: date(derniereConnexion), ...(hashDemo && { motDePasseHash: hashDemo }) };
    const compte = await prisma.utilisateur.upsert({ where: { email }, update: donnees, create: { email, ...donnees } });
    if (kyc) {
      const dossier = { ...kyc, dateNaissance: date(kyc.dateNaissance), soumisLe: date(kyc.soumisLe) };
      await prisma.dossierKYC.upsert({ where: { utilisateurId: compte.id }, update: dossier, create: { utilisateurId: compte.id, ...dossier } });
    }
  }

  // Premier administrateur : créé uniquement si ses identifiants sont fournis dans .env.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminMotDePasse = process.env.ADMIN_MOT_DE_PASSE;
  if (adminEmail && adminMotDePasse) {
    const motDePasseHash = await bcrypt.hash(adminMotDePasse, 12);
    await prisma.utilisateur.upsert({
      where: { email: adminEmail },
      update: { role: "admin", motDePasseHash, suspendu: false },
      create: { email: adminEmail, nom: "Administrateur", role: "admin", statutKYC: "verifie", motDePasseHash },
    });
  }

  const agences = new Map((await prisma.agence.findMany()).map((a) => [a.slug, a.id]));
  // Comptes d'exemple qui gèrent les annonces de chaque agence. SénéImmo n'a pas de compte : ses annonces relèvent de l'administration.
  const GESTIONNAIRES: Record<string, string> = { "foncier-plus": "c.gueye@exemple.sn", "immo-senegal": "m.sarr@exemple.sn" };
  const comptes = new Map((await prisma.utilisateur.findMany({ select: { id: true, email: true } })).map((u) => [u.email, u.id]));
  for (const b of BIENS) {
    const [lat, lng] = COORDONNEES[b.id] ?? [b.lat ?? null, b.lng ?? null];
    const donnees = {
      titre: b.titre,
      type: b.type,
      superficie: b.superficie,
      prix: BigInt(b.prix),
      region: b.region,
      ville: b.ville,
      quartier: b.quartier,
      description: b.description,
      photo: b.photo,
      photos: b.photos ?? [],
      telephone: b.telephone,
      lat,
      lng,
      agenceNom: b.agence,
      agenceId: agences.get(b.agence_slug) ?? null,
      auteurId: comptes.get(GESTIONNAIRES[b.agence_slug] ?? "") ?? null,
      proprietaire: b.proprietaire ?? null,
      tfVerifie: b.is_verified_tf,
      tfNumero: b.tf.numero,
      tfConservation: b.tf.conservation,
      tfDateEtablissement: date(b.tf.date_etablissement),
      tfSuperficieCadastrale: b.tf.superficie_cadastrale,
      vedette: b.is_featured,
      prixEnBaisse: b.prix_baisser,
      ancienPrix: b.ancien_prix ? BigInt(b.ancien_prix) : null,
      nbVues: b.nb_vues,
    };
    // L'identifiant d'origine est conservé pour que les adresses /annonces/1, /annonces/2… restent valables.
    await prisma.bien.upsert({ where: { reference: b.reference }, update: donnees, create: { id: b.id, reference: b.reference, ...donnees } });
  }

  // Annonces à louer et programmes neufs d'exemple.
  for (const l of LOCATIONS) {
    const agenceId = agences.get(l.agence) ?? null;
    const donnees = {
      titre: l.titre, type: l.type, superficie: l.superficie, prix: BigInt(l.prix), transaction: "location" as const,
      charges: l.charges === null ? null : BigInt(l.charges), caution: BigInt(l.caution), meuble: l.meuble, nbPieces: l.nbPieces,
      region: l.region, ville: l.ville, quartier: l.quartier, description: l.description, photo: l.photo, photos: [l.photo],
      telephone: l.telephone, lat: l.lat, lng: l.lng, agenceId, agenceNom: AGENCES.find((x) => x.slug === l.agence)?.nom ?? "",
      auteurId: comptes.get(GESTIONNAIRES[l.agence] ?? "") ?? null,
    };
    await prisma.bien.upsert({ where: { reference: l.reference }, update: donnees, create: { id: l.id, reference: l.reference, ...donnees } });
  }
  for (const p of PROGRAMMES) {
    const { lots, agence, slug, ...champs } = p;
    const donnees = { ...champs, agenceId: agences.get(agence) ?? null, auteurId: comptes.get(GESTIONNAIRES[agence] ?? "") ?? null };
    const programme = await prisma.programme.upsert({ where: { slug }, update: donnees, create: { slug, ...donnees } });
    await prisma.lotProgramme.deleteMany({ where: { programmeId: programme.id } });
    await prisma.lotProgramme.createMany({ data: lots.map((l) => ({ ...l, prix: BigInt(l.prix), programmeId: programme.id })) });
  }

  await prisma.reglage.upsert({ where: { cle: "parametres" }, update: {}, create: { cle: "parametres", valeur: PARAMETRES_DEFAUT } });

  const [nbAgences, nbNotaires, nbComptes, nbBiens] = await Promise.all([prisma.agence.count(), prisma.notaire.count(), prisma.utilisateur.count(), prisma.bien.count()]);
  console.log(`Base chargée : ${nbAgences} agences, ${nbNotaires} notaires, ${nbComptes} comptes, ${nbBiens} annonces, ${await prisma.programme.count()} programmes neufs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
