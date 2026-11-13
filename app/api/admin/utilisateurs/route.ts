import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { db } from "@/lib/serveur/db";
import { exigerRole, memeOrigine, normaliserEmail } from "@/lib/serveur/auth";

const ROLES: Role[] = ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc", "moderateur", "admin"];
const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });

// PATCH /api/admin/utilisateurs  { email, suspendu?, role? } : réservé aux administrateurs.
export async function PATCH(requete: Request) {
  if (!memeOrigine()) return refus("Requête refusée.", 403);
  try {
    const admin = await exigerRole("admin");
    if (!admin) return refus("Réservé aux administrateurs.", 403);

    const corps = await requete.json().catch(() => null);
    const email = typeof corps?.email === "string" ? normaliserEmail(corps.email) : "";
    const suspendu = typeof corps?.suspendu === "boolean" ? corps.suspendu : undefined;
    const role = ROLES.find((r) => r === corps?.role);
    if (!email || (suspendu === undefined && !role)) return refus("Demande incomplète.", 400);
    // Un administrateur ne peut ni se suspendre ni se retirer ses droits : la plateforme resterait sans pilote.
    if (email === admin.email) return refus("Vous ne pouvez pas modifier votre propre compte ici.", 400);

    const cible = await db.utilisateur.findUnique({ where: { email } });
    if (!cible) return refus("Compte introuvable.", 404);

    await db.$transaction([
      db.utilisateur.update({ where: { id: cible.id }, data: { ...(suspendu !== undefined && { suspendu }), ...(role && { role }) } }),
      // Suspendre ou changer de rôle ferme les sessions ouvertes : le changement s'applique tout de suite.
      db.session.deleteMany({ where: { utilisateurId: cible.id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/admin/utilisateurs", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}
