import { NextResponse } from "next/server";
import { memeOrigine } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { renvoyerCode, type But, type Canal } from "@/lib/serveur/otp";
import { lireJson } from "@/lib/serveur/securite";
import { normaliserNumero } from "@/lib/serveur/whatsapp";

const refus = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });
const CANAUX: Canal[] = ["whatsapp", "sms", "email"];

// POST /api/auth/otp/envoyer  { defi, but?, numero?, canal? } : envoie un nouveau code de vérification,
// par WhatsApp (SMS puis email en secours), ou par le moyen demandé.
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  const corps = await lireJson(requete);
  const but: But = corps?.but === "reinitialisation" ? "reinitialisation" : "connexion";
  const canal = CANAUX.find((c) => c === corps?.canal);
  let numero: string | null = null;
  if (typeof corps?.numero === "string" && corps.numero.trim()) {
    numero = normaliserNumero(corps.numero);
    if (!numero) return refus("Numéro WhatsApp invalide. Exemple : 77 123 45 67 ou +33 6 12 34 56 78.");
  }
  try {
    const r = await renvoyerCode(corps?.defi, but, numero, canal);
    if (!r.ok) return refus(r.erreur, r.status);
    return NextResponse.json({ otp: r.valeur });
  } catch (e) {
    log.erreur("POST /api/auth/otp/envoyer", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const POST = avecJournal("POST /api/auth/otp/envoyer", post);
