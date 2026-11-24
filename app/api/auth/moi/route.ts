import { NextResponse } from "next/server";
import { db } from "@/lib/serveur/db";
import { compteCourant, memeOrigine, versSession } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { lireJson } from "@/lib/serveur/securite";

export const dynamic = "force-dynamic";

// GET /api/auth/moi : la personne connectée, ou null.
async function get() {
  try {
    const compte = await compteCourant();
    return NextResponse.json({ utilisateur: compte ? versSession(compte) : null });
  } catch (e) {
    log.erreur("GET /api/auth/moi", e);
    return NextResponse.json({ erreur: "Le service est momentanément indisponible." }, { status: 503 });
  }
}

// PATCH /api/auth/moi  { nom?, telephone?, ville? } : la personne modifie son propre profil.
async function patch(requete: Request) {
  if (!(await memeOrigine())) return NextResponse.json({ erreur: "Requête refusée." }, { status: 403 });
  try {
    const compte = await compteCourant();
    if (!compte) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
    const corps = await lireJson(requete);
    const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
    const nom = texte(corps?.nom, 100);
    if (nom !== undefined && nom.length < 2) return NextResponse.json({ erreur: "Indiquez votre nom complet." }, { status: 400 });
    const telephone = texte(corps?.telephone, 30);
    const ville = texte(corps?.ville, 80);
    const maj = await db.utilisateur.update({
      where: { id: compte.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(telephone !== undefined && { telephone: telephone || null }),
        ...(ville !== undefined && { ville: ville || null }),
      },
    });
    return NextResponse.json({ utilisateur: versSession(maj) });
  } catch (e) {
    log.erreur("PATCH /api/auth/moi", e);
    return NextResponse.json({ erreur: "Le service est momentanément indisponible." }, { status: 503 });
  }
}

export const GET = avecJournal("GET /api/auth/moi", get);
export const PATCH = avecJournal("PATCH /api/auth/moi", patch);
