import { NextResponse } from "next/server";
import { adresseClient, compteCourant, memeOrigine } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { freiner, LIMITES, lireJson } from "@/lib/serveur/securite";

const texte = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

// POST /api/journal  { code, message, pile?, page?, type? } : une erreur survenue dans le navigateur d'un visiteur.
// Ouvert à tous (une erreur peut survenir avant la connexion), mais plafonné et limité en taille.
async function post(requete: Request) {
  if (!memeOrigine()) return NextResponse.json({ erreur: "Requête refusée." }, { status: 403 });
  const compte = await compteCourant().catch(() => null);
  const cle = `rapport:${compte?.id ?? adresseClient() ?? "anonyme"}`;
  if (await freiner(cle, LIMITES.rapportNavigateur)) return new NextResponse(null, { status: 204 });
  const corps = await lireJson(requete, 10_000);
  if (!corps) return NextResponse.json({ erreur: "Rapport illisible." }, { status: 400 });
  log.warn("Erreur dans le navigateur", {
    code: texte(corps.code, 20),
    type: texte(corps.type, 40),
    message: texte(corps.message, 500),
    pile: texte(corps.pile, 3000),
    page: texte(corps.page, 300),
    navigateur: requete.headers.get("user-agent")?.slice(0, 200),
  });
  return new NextResponse(null, { status: 204 });
}

export const POST = avecJournal("POST /api/journal", post);
