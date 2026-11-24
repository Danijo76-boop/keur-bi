import { NextResponse } from "next/server";
import { Prisma, type Plan, type Role, type StatutKYC } from "@prisma/client";
import { db } from "@/lib/serveur/db";
import { compteCourant, emailValide, hacherMotDePasse, memeOrigine, normaliserEmail } from "@/lib/serveur/auth";
import { versUtilisateur, versUtilisateurReduit } from "@/lib/serveur/utilisateurs";
import { avecJournal, log } from "@/lib/serveur/journal";
import { lireJson, motDePasseProvisoire as genererMotDePasseProvisoire } from "@/lib/serveur/securite";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc", "moderateur", "admin"];
const PLANS: Plan[] = ["gratuit", "pro", "promoteur", "essentiel", "pro_notaire"];
// Qui peut voir tous les comptes et décider des dossiers d'identité.
const EQUIPE: Role[] = ["admin", "moderateur"];

const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });
const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const ouVide = (v: string | undefined) => (v === undefined ? undefined : v || null);
const date = (v: unknown) => {
  const d = typeof v === "string" && v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

// GET /api/utilisateurs : les comptes que la personne connectée a le droit de voir.
async function get() {
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);

    if (EQUIPE.includes(moi.role)) {
      const tous = await db.utilisateur.findMany({ include: { kyc: true }, orderBy: { inscritLe: "desc" } });
      return NextResponse.json({ utilisateurs: tous.map(versUtilisateur) });
    }

    const fiche = await db.utilisateur.findUniqueOrThrow({ where: { id: moi.id }, include: { kyc: true } });
    const utilisateurs = [versUtilisateur(fiche)];
    // Le notariat ouvre des dossiers au nom des acheteurs : il voit leur nom et leur email, rien de plus.
    if (moi.role === "notaire" || moi.role === "clerc") {
      const acheteurs = await db.utilisateur.findMany({ where: { role: "acheteur", suspendu: false, NOT: { id: moi.id } }, orderBy: { nom: "asc" } });
      utilisateurs.push(...acheteurs.map(versUtilisateurReduit));
    }
    return NextResponse.json({ utilisateurs });
  } catch (e) {
    log.erreur("GET /api/utilisateurs", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

// PATCH /api/utilisateurs  { email, patch } : chaque champ a ses propres règles.
//  - soi-même : coordonnées, rattachement, relevé bancaire, abonnement, envoi du dossier d'identité ;
//  - admin : rôle, suspension et remise à zéro du numéro WhatsApp d'un autre compte ;
//  - admin ou modérateur : décision sur un dossier d'identité.
async function patch(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);

    const corps = await lireJson(requete);
    const email = typeof corps?.email === "string" ? normaliserEmail(corps.email) : "";
    const patch = corps?.patch && typeof corps.patch === "object" ? (corps.patch as Record<string, unknown>) : null;
    if (!email || !patch) return refus("Demande incomplète.", 400);

    const cible = await db.utilisateur.findUnique({ where: { email } });
    if (!cible) return refus("Compte introuvable.", 404);
    const soi = cible.id === moi.id;
    const donnees: Prisma.UtilisateurUpdateInput = {};
    let fermerSessions = false;

    // ── Champs personnels ──
    const perso = ["nom", "telephone", "ville", "rattachement", "releveBancaire", "plan"].filter((c) => c in patch);
    if (perso.length) {
      if (!soi) return refus("Vous ne pouvez modifier que votre propre profil.", 403);
      const nom = texte(patch.nom, 100);
      if (nom !== undefined) {
        if (nom.length < 2) return refus("Indiquez votre nom complet.", 400);
        donnees.nom = nom;
      }
      if ("telephone" in patch) donnees.telephone = ouVide(texte(patch.telephone, 30));
      if ("ville" in patch) donnees.ville = ouVide(texte(patch.ville, 80));
      if ("rattachement" in patch) donnees.rattachement = ouVide(texte(patch.rattachement ?? "", 120));
      if ("releveBancaire" in patch) donnees.releveBancaire = ouVide(texte(patch.releveBancaire ?? "", 200));
      if ("plan" in patch) {
        // Le paiement des abonnements n'est pas encore branché : le choix du plan est déclaratif.
        const plan = PLANS.find((p) => p === patch.plan);
        if (!plan) return refus("Abonnement inconnu.", 400);
        donnees.plan = plan;
      }
    }

    // ── Rôle et suspension ──
    if ("role" in patch || "suspendu" in patch) {
      if (moi.role !== "admin") return refus("Réservé aux administrateurs.", 403);
      // Un administrateur ne peut ni se suspendre ni se retirer ses droits : la plateforme resterait sans pilote.
      if (soi) return refus("Vous ne pouvez pas modifier votre propre rôle ni vous suspendre.", 400);
      if ("role" in patch) {
        const role = ROLES.find((r) => r === patch.role);
        if (!role) return refus("Rôle inconnu.", 400);
        donnees.role = role;
      }
      if ("suspendu" in patch) donnees.suspendu = patch.suspendu === true;
      fermerSessions = true;
    }

    // ── Numéro WhatsApp (codes de connexion) ──
    // Seule action possible : l'effacer, quand la personne a perdu son téléphone. Elle en indiquera un nouveau,
    // vérifié par un code, à sa prochaine connexion. Les sessions ouvertes sont fermées par prudence.
    if ("whatsapp" in patch) {
      if (moi.role !== "admin") return refus("Réservé aux administrateurs.", 403);
      if (soi) return refus("Vous ne pouvez pas modifier votre propre numéro WhatsApp ici.", 400);
      if (patch.whatsapp !== null) return refus("Le numéro WhatsApp ne peut qu'être remis à zéro.", 400);
      donnees.whatsapp = null;
      fermerSessions = true;
    }

    // ── Dossier d'identité ──
    let kyc: Prisma.DossierKYCUncheckedCreateWithoutUtilisateurInput | undefined;
    if ("statutKYC" in patch) {
      const statut = patch.statutKYC as StatutKYC;
      const k = (patch.kyc && typeof patch.kyc === "object" ? patch.kyc : {}) as Record<string, unknown>;
      if (statut === "en_attente") {
        if (!soi) return refus("Chacun envoie son propre dossier d'identité.", 403);
        if (cible.statutKYC === "verifie") return refus("Votre identité est déjà vérifiée.", 400);
        kyc = {
          dateNaissance: date(k.dateNaissance),
          lieuNaissance: texte(k.lieuNaissance, 120) || null,
          nationalite: texte(k.nationalite, 80) || null,
          typeDocument: texte(k.typeDocument, 80) || null,
          numeroDocument: texte(k.numeroDocument, 60) || null,
          recto: texte(k.recto, 200) || null,
          verso: texte(k.verso, 200) || null,
          selfie: texte(k.selfie, 200) || null,
          justificatif: texte(k.justificatif, 200) || null,
          soumisLe: new Date(),
          motifRejet: null,
        };
      } else if (statut === "verifie" || statut === "rejete") {
        if (!EQUIPE.includes(moi.role)) return refus("Réservé à l'équipe de modération.", 403);
        if (soi) return refus("Vous ne pouvez pas valider votre propre dossier.", 400);
        kyc = { motifRejet: statut === "rejete" ? texte(k.motifRejet, 300) || null : null };
      } else {
        return refus("Statut inconnu.", 400);
      }
      donnees.statutKYC = statut;
    }

    if (!Object.keys(donnees).length) return refus("Aucune modification reconnue.", 400);

    const [maj] = await db.$transaction([
      db.utilisateur.update({
        where: { id: cible.id },
        data: { ...donnees, ...(kyc && { kyc: { upsert: { create: kyc, update: kyc } } }) },
        include: { kyc: true },
      }),
      // Suspendre ou changer de rôle ferme les sessions ouvertes : le changement s'applique tout de suite.
      ...(fermerSessions ? [db.session.deleteMany({ where: { utilisateurId: cible.id } })] : []),
    ]);
    const champs = Object.keys(patch);
    if (!soi || fermerSessions)
      log.audit("Compte modifié par l'équipe", {
        cible: cible.id,
        champs,
        ...("role" in patch && { role: patch.role }),
        ...("suspendu" in patch && { suspendu: patch.suspendu }),
        ...("whatsapp" in patch && { whatsapp: "remis à zéro" }),
        ...("statutKYC" in patch && { statutKYC: patch.statutKYC }),
      });
    else log.info("Profil modifié", { champs });
    return NextResponse.json({ utilisateur: versUtilisateur(maj) });
  } catch (e) {
    log.erreur("PATCH /api/utilisateurs", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

// POST /api/utilisateurs  { nom, email, role, telephone?, suspendu?, statutKYC? } : création d'un compte par un administrateur.
// Le compte reçoit un mot de passe provisoire, renvoyé une seule fois pour être transmis à la personne.
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);
    if (moi.role !== "admin") return refus("Réservé aux administrateurs.", 403);

    const corps = await lireJson(requete);
    const nom = texte(corps?.nom, 100) ?? "";
    const email = typeof corps?.email === "string" ? normaliserEmail(corps.email) : "";
    const role = ROLES.find((r) => r === corps?.role);
    if (nom.length < 2) return refus("Indiquez le nom complet.", 400);
    if (!emailValide(email)) return refus("Adresse email invalide.", 400);
    if (!role) return refus("Rôle inconnu.", 400);

    const motDePasseProvisoire = genererMotDePasseProvisoire();
    const compte = await db.utilisateur.create({
      data: {
        nom,
        email,
        role,
        telephone: texte(corps?.telephone, 30) || null,
        suspendu: corps?.suspendu === true,
        statutKYC: corps?.statutKYC === "en_attente" ? "en_attente" : "non_soumis",
        motDePasseHash: await hacherMotDePasse(motDePasseProvisoire),
      },
      include: { kyc: true },
    });
    log.audit("Compte créé par un administrateur", { cible: compte.id, role });
    return NextResponse.json({ utilisateur: versUtilisateur(compte), motDePasseProvisoire }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return refus("Un compte existe déjà avec cet email.", 409);
    log.erreur("POST /api/utilisateurs", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const GET = avecJournal("GET /api/utilisateurs", get);
export const PATCH = avecJournal("PATCH /api/utilisateurs", patch);
export const POST = avecJournal("POST /api/utilisateurs", post);
