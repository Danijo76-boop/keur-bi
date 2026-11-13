import { NextResponse } from "next/server";
import { db } from "@/lib/serveur/db";
import { compteCourant, memeOrigine, versSession } from "@/lib/serveur/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/moi : la personne connectée, ou null.
export async function GET() {
  try {
    const compte = await compteCourant();
    return NextResponse.json({ utilisateur: compte ? versSession(compte) : null });
  } catch (e) {
    console.error("GET /api/auth/moi", e);
    return NextResponse.json({ erreur: "Le service est momentanément indisponible." }, { status: 503 });
  }
}

// PATCH /api/auth/moi  { nom?, telephone?, ville? } : la personne modifie son propre profil.
export async function PATCH(requete: Request) {
  if (!memeOrigine()) return NextResponse.json({ erreur: "Requête refusée." }, { status: 403 });
  try {
    const compte = await compteCourant();
    if (!compte) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
    const corps = await requete.json().catch(() => null);
    const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
    const nom = texte(corps?.nom, 100);
    if (nom !== undefined && nom.length < 2) return NextResponse.json({ erreur: "Indiquez votre nom complet." }, { status: 400 });
    const telephone = texte(corps?.telephone, 30);
    const ville = texte(corps?.ville, 80);
    const maj = await db.utilisateur.update({
      where: { id: compte.id },
      data: { ...(nom !== undefined && { nom }), ...(telephone !== undefined && { telephone: telephone || null }), ...(ville !== undefined && { ville: ville || null }) },
    });
    return NextResponse.json({ utilisateur: versSession(maj) });
  } catch (e) {
    console.error("PATCH /api/auth/moi", e);
    return NextResponse.json({ erreur: "Le service est momentanément indisponible." }, { status: 503 });
  }
}
