import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { versConnexion } from "@/lib/acces";
import { compteCourant } from "./auth";

/* ── Pages réservées : contrôle sur le serveur ──
   Appelé par les layouts de l'administration avant tout affichage. Une personne non connectée est envoyée
   vers la connexion ; une personne connectée sans le bon rôle est renvoyée ailleurs, sans voir la page.
   Les données, elles, sont protégées une seconde fois par chaque route d'API (exigerRole / compteCourant). */

// Une seule lecture de la session par requête, même si plusieurs layouts imbriqués la demandent.
const compteDeLaRequete = cache(compteCourant);

export async function exigerRolePage(roles: Role[], chemin: string, repli = "/tableau-de-bord") {
  const compte = await compteDeLaRequete();
  if (!compte) redirect(versConnexion(chemin));
  if (!roles.includes(compte.role)) redirect(compte.role === "moderateur" && repli !== "/admin/moderation" ? "/admin/moderation" : repli);
  return compte;
}

// L'équipe (administrateurs et modérateurs) entre dans l'administration ; certaines sections sont réservées aux administrateurs.
export const EQUIPE: Role[] = ["admin", "moderateur"];
export const ADMIN: Role[] = ["admin"];
