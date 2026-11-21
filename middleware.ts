import { NextRequest, NextResponse } from "next/server";
import { estPagePublique, versConnexion } from "@/lib/acces";

// Première barrière : un visiteur sans session ne voit que la présentation du site et les pages d'information.
// Pour toute autre page, il est renvoyé vers la connexion, qui le ramènera ensuite là où il voulait aller.
// La validité de la session et le rôle sont vérifiés ensuite côté serveur, là où se trouve la base.
//
// Chaque requête reçoit aussi un identifiant (x-request-id), repris dans tous les journaux du serveur :
// il permet de retrouver ce qui s'est passé lors d'un bug signalé.
export function middleware(requete: NextRequest) {
  const { pathname, search } = requete.nextUrl;
  // Identifiant toujours créé ici, jamais repris du navigateur : il ne peut pas servir à polluer les journaux.
  const requeteId = crypto.randomUUID();
  const entetes = new Headers(requete.headers);
  entetes.set("x-request-id", requeteId);

  if (pathname.startsWith("/api/") || estPagePublique(pathname) || requete.cookies.has("keurbi_session")) {
    const reponse = NextResponse.next({ request: { headers: entetes } });
    reponse.headers.set("x-request-id", requeteId);
    return reponse;
  }
  return NextResponse.redirect(new URL(versConnexion(pathname + search), requete.url));
}

export const config = {
  // Toutes les pages et routes serveur, sauf les fichiers de Next.js et les fichiers statiques.
  matcher: ["/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
