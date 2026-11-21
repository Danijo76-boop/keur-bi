import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { traiterAlertes } from "@/lib/serveur/alertes";
import { avecJournal, log } from "@/lib/serveur/journal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Seule la tâche planifiée de Vercel peut déclencher l'envoi : elle présente le secret CRON_SECRET.
function autorise(requete: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const recu = Buffer.from(requete.headers.get("authorization") ?? "");
  const attendu = Buffer.from(`Bearer ${secret}`);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

// GET /api/cron/alertes : envoie les alertes email arrivées à échéance (chaque matin, voir vercel.json).
async function get(requete: Request) {
  if (!autorise(requete)) {
    log.warn("Tâche planifiée : appel refusé (secret absent ou incorrect)");
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  try {
    return NextResponse.json(await traiterAlertes());
  } catch (e) {
    log.erreur("Tâche planifiée des alertes", e);
    return NextResponse.json({ erreur: "Échec du traitement." }, { status: 500 });
  }
}

export const GET = avecJournal("GET /api/cron/alertes", get);
