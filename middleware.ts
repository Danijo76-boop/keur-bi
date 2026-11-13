import { NextRequest, NextResponse } from "next/server";

// Première barrière : sans cookie de session, les pages de l'espace connecté et de l'administration
// renvoient vers la connexion avant même d'être chargées. La validité de la session et le rôle
// sont ensuite vérifiés côté serveur, là où se trouve la base.
export function middleware(requete: NextRequest) {
  if (requete.cookies.has("keurbi_session")) return NextResponse.next();
  const url = requete.nextUrl.clone();
  url.pathname = "/connexion";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/tableau-de-bord/:path*", "/profil/:path*", "/messages/:path*", "/favoris/:path*", "/calendrier/:path*",
    "/notifications/:path*", "/kyc/:path*", "/publier/:path*", "/mes-annonces/:path*", "/dossiers/:path*",
    "/verification-tf/:path*", "/admin/:path*",
  ],
};
