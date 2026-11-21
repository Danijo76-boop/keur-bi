import { NextResponse } from "next/server";
import { fermerSession, memeOrigine } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";

// POST /api/auth/deconnexion
async function post() {
  if (!memeOrigine()) return NextResponse.json({ erreur: "Requête refusée." }, { status: 403 });
  try {
    await fermerSession();
  } catch (e) {
    log.erreur("POST /api/auth/deconnexion", e);
  }
  return NextResponse.json({ ok: true });
}

export const POST = avecJournal("POST /api/auth/deconnexion", post);
