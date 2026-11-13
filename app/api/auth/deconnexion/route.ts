import { NextResponse } from "next/server";
import { fermerSession, memeOrigine } from "@/lib/serveur/auth";

// POST /api/auth/deconnexion
export async function POST() {
  if (!memeOrigine()) return NextResponse.json({ erreur: "Requête refusée." }, { status: 403 });
  try {
    await fermerSession();
  } catch (e) {
    console.error("POST /api/auth/deconnexion", e);
  }
  return NextResponse.json({ ok: true });
}
