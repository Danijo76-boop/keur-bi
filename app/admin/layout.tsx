import { ReactNode } from "react";
import EspaceAdmin from "@/components/EspaceAdmin";
import { EQUIPE, exigerRolePage } from "@/lib/serveur/acces-pages";

// Toute l'administration : réservée à l'équipe, vérifié sur le serveur avant d'envoyer la moindre page.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await exigerRolePage(EQUIPE, "/admin");
  return <EspaceAdmin>{children}</EspaceAdmin>;
}
