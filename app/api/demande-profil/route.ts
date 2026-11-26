import { NextResponse } from "next/server";
import { db } from "@/lib/serveur/db";
import { compteCourant } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";

// GET /api/demande-profil : la demande de profil de la personne connectée (ou null), pour afficher où elle en est.
async function get() {
  try {
    const moi = await compteCourant();
    if (!moi) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
    const demande = await db.demandeProfil.findUnique({
      where: { utilisateurId: moi.id },
      select: { role: true, statut: true, motifRefus: true, creeLe: true, traiteLe: true },
    });
    return NextResponse.json({ demande });
  } catch (e) {
    log.erreur("GET /api/demande-profil", e);
    return NextResponse.json({ erreur: "Le service est momentanément indisponible." }, { status: 503 });
  }
}

export const GET = avecJournal("GET /api/demande-profil", get);
