import { NextRequest, NextResponse } from "next/server";
import { estPagePublique, versConnexion } from "@/lib/acces";

// Première barrière : un visiteur sans session ne voit que la présentation du site et les pages d'information.
// Pour toute autre page, il est renvoyé vers la connexion, qui le ramènera ensuite là où il voulait aller.
// La validité de la session et le rôle sont vérifiés ensuite côté serveur, là où se trouve la base.
export function middleware(requete: NextRequest) {
  const { pathname, search } = requete.nextUrl;
  if (estPagePublique(pathname) || requete.cookies.has("keurbi_session")) return NextResponse.next();
  return NextResponse.redirect(new URL(versConnexion(pathname + search), requete.url));
}

export const config = {
  // Toutes les pages, sauf les routes serveur (/api, qui ont leurs propres contrôles), les fichiers de Next.js et les fichiers statiques.
  matcher: ["/((?!api/|_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
