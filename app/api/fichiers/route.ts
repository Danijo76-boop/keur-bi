import { NextResponse } from "next/server";
import { compteCourant, memeOrigine } from "@/lib/serveur/auth";
import { enregistrerImage } from "@/lib/serveur/fichiers";
import { peutPublier } from "@/lib/serveur/annonces";

const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });

// POST /api/fichiers  { dataUrl } : envoi d'une photo d'annonce, une par requête.
export async function POST(requete: Request) {
  if (!memeOrigine()) return refus("Requête refusée.", 403);
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);
    if (!peutPublier(moi.role)) return refus("L'envoi de photos est réservé aux vendeurs.", 403);
    const corps = await requete.json().catch(() => null);
    if (typeof corps?.dataUrl !== "string") return refus("Image manquante.", 400);
    const resultat = await enregistrerImage(corps.dataUrl, moi.id);
    if (!resultat.ok) return refus(resultat.erreur, 400);
    return NextResponse.json({ url: resultat.url }, { status: 201 });
  } catch (e) {
    console.error("POST /api/fichiers", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}
