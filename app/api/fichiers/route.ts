import { NextResponse } from "next/server";
import { compteCourant, memeOrigine } from "@/lib/serveur/auth";
import { enregistrerImage } from "@/lib/serveur/fichiers";
import { peutPublier } from "@/lib/serveur/annonces";
import { avecJournal, log } from "@/lib/serveur/journal";
import { freiner, LIMITES, lireJson } from "@/lib/serveur/securite";

// La vérification du contenu de la photo peut prendre quelques secondes.
export const maxDuration = 60;

const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });

// POST /api/fichiers  { dataUrl } : envoi d'une photo d'annonce, une par requête.
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);
    if (!peutPublier(moi.role)) return refus("L'envoi de photos est réservé aux vendeurs.", 403);
    if (await freiner(`fichier:${moi.id}`, LIMITES.fichier)) return refus("Trop d'envois en peu de temps. Réessayez plus tard.", 429);
    // 5 Mo d'image, encodés en base64 (un tiers de plus) dans du JSON.
    const corps = await lireJson(requete, 7_000_000);
    if (typeof corps?.dataUrl !== "string") return refus("Image manquante.", 400);
    const resultat = await enregistrerImage(corps.dataUrl, moi.id);
    if (!resultat.ok) {
      log.info("Photo refusée", { raison: resultat.erreur, motifs: resultat.motifs, auteur: moi.id });
      return refus(resultat.erreur, resultat.motifs?.length ? 422 : 400);
    }
    log.debug("Photo enregistrée", { url: resultat.url });
    return NextResponse.json({ url: resultat.url }, { status: 201 });
  } catch (e) {
    log.erreur("POST /api/fichiers", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const POST = avecJournal("POST /api/fichiers", post);
