import { ReactNode } from "react";
import { ADMIN, exigerRolePage } from "@/lib/serveur/acces-pages";

// Section réservée aux administrateurs, vérifié sur le serveur.
export default async function Section({ children }: { children: ReactNode }) {
  await exigerRolePage(ADMIN, "/admin/roles", "/admin/moderation");
  return children;
}
