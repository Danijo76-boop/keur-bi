import { NextResponse } from "next/server";
import { memeOrigine } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { renvoyerCode } from "@/lib/serveur/otp";
import { lireJson } from "@/lib/serveur/securite";
import { normaliserNumero } from "@/lib/serveur/whatsapp";

const refus = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });

// POST /api/auth/otp/envoyer  { defi, numero?, canal? } : envoie ou renvoie le code de connexion
// par WhatsApp (SMS en secours), ou par SMS si canal = "sms".
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  const corps = await lireJson(requete);
  let numero: string | null = null;
  if (typeof corps?.numero === "string" && corps.numero.trim()) {
    numero = normaliserNumero(corps.numero);
    if (!numero) return refus("Numéro WhatsApp invalide. Exemple : 77 123 45 67 ou +33 6 12 34 56 78.");
  }
  try {
    const r = await renvoyerCode(corps?.defi, numero, corps?.canal === "sms");
    if (!r.ok) return refus(r.erreur, r.status);
    return NextResponse.json({ otp: r.valeur });
  } catch (e) {
    log.erreur("POST /api/auth/otp/envoyer", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const POST = avecJournal("POST /api/auth/otp/envoyer", post);
