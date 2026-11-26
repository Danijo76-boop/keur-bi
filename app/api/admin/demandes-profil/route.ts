import { NextResponse } from "next/server";
import { db } from "@/lib/serveur/db";
import { exigerRole, memeOrigine } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { lireJson } from "@/lib/serveur/securite";

const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });

// GET /api/admin/demandes-profil : demandes de profil professionnel, les plus récentes d'abord. Réservé aux administrateurs.
async function get() {
  if (!(await exigerRole("admin"))) return refus("Réservé aux administrateurs.", 403);
  try {
    const demandes = await db.demandeProfil.findMany({
      orderBy: [{ statut: "asc" }, { creeLe: "desc" }],
      take: 200,
      include: { utilisateur: { select: { nom: true, email: true, telephone: true, role: true } } },
    });
    return NextResponse.json({ demandes });
  } catch (e) {
    log.erreur("GET /api/admin/demandes-profil", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

// PATCH /api/admin/demandes-profil  { id, decision: "accepter" | "refuser", motif? }
// Accepter donne au compte le profil demandé ; refuser le laisse acheteur, avec le motif.
async function patch(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  const admin = await exigerRole("admin");
  if (!admin) return refus("Réservé aux administrateurs.", 403);
  try {
    const corps = await lireJson(requete);
    const id = typeof corps?.id === "string" ? corps.id : "";
    const decision = corps?.decision;
    const motif = typeof corps?.motif === "string" ? corps.motif.trim().slice(0, 300) : "";
    if (!id || (decision !== "accepter" && decision !== "refuser")) return refus("Demande incomplète.", 400);
    if (decision === "refuser" && motif.length < 5) return refus("Indiquez le motif du refus : il sera communiqué à la personne.", 400);

    const demande = await db.demandeProfil.findUnique({ where: { id } });
    if (!demande) return refus("Demande introuvable.", 404);
    if (demande.statut !== "en_attente") return refus("Cette demande a déjà été traitée.", 409);

    if (decision === "accepter") {
      await db.$transaction([
        db.utilisateur.update({ where: { id: demande.utilisateurId }, data: { role: demande.role } }),
        db.demandeProfil.update({ where: { id }, data: { statut: "acceptee", traiteLe: new Date(), motifRefus: null } }),
      ]);
    } else {
      await db.demandeProfil.update({ where: { id }, data: { statut: "refusee", traiteLe: new Date(), motifRefus: motif } });
    }
    log.audit(decision === "accepter" ? "Profil demandé accepté" : "Profil demandé refusé", {
      demandeId: id,
      utilisateurId: demande.utilisateurId,
      profil: demande.role,
      par: admin.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.erreur("PATCH /api/admin/demandes-profil", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const GET = avecJournal("GET /api/admin/demandes-profil", get);
export const PATCH = avecJournal("PATCH /api/admin/demandes-profil", patch);
