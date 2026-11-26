import { randomBytes } from "node:crypto";
import { db } from "@/lib/serveur/db";

/* Base de données des tests d'intégration.
   Ils ne tournent que si DATABASE_URL est défini (base de test, jamais la base de production) ;
   chaque test crée ses propres comptes (adresse en …@tests.keurbi) et les supprime ensuite. */

export const baseDisponible = !!process.env.DATABASE_URL;

const DOMAINE = "@tests.keurbi";

export async function creerCompte(donnees: { role?: "acheteur" | "vendeur" | "agence" | "admin"; whatsapp?: string | null; telephone?: string } = {}) {
  return db.utilisateur.create({
    data: {
      email: `test-${randomBytes(6).toString("hex")}${DOMAINE}`,
      nom: "Compte de test",
      role: donnees.role ?? "acheteur",
      whatsapp: donnees.whatsapp ?? null,
      telephone: donnees.telephone ?? null,
    },
  });
}

export async function nettoyer() {
  const comptes = await db.utilisateur.findMany({ where: { email: { endsWith: DOMAINE } }, select: { id: true, email: true } });
  const ids = comptes.map((c) => c.id);
  await db.bien.deleteMany({ where: { auteurId: { in: ids } } });
  await db.utilisateur.deleteMany({ where: { id: { in: ids } } });
  await db.tentative.deleteMany({
    where: { OR: [{ cle: { contains: DOMAINE } }, { cle: { startsWith: "test:" } }, { cle: { startsWith: "otp-" } }, { cle: { contains: ":test-ip-" } }] },
  });
}
