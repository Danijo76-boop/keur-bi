import { NextResponse } from "next/server";
import { compteCourant, memeOrigine } from "@/lib/serveur/auth";
import { supprimerAlerte } from "@/lib/serveur/alertes";
import { avecJournal, log } from "@/lib/serveur/journal";

// DELETE /api/alertes/<id> : supprime une alerte de la personne connectée.
async function supprimer(_requete: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  if (!(await memeOrigine())) return NextResponse.json({ erreur: "Requête refusée." }, { status: 403 });
  try {
    const moi = await compteCourant();
    if (!moi) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
    if (!(await supprimerAlerte(moi, params.id))) return NextResponse.json({ erreur: "Alerte introuvable." }, { status: 404 });
    log.info("Alerte supprimée", { alerteId: params.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.erreur("DELETE /api/alertes/[id]", e);
    return NextResponse.json({ erreur: "Le service est momentanément indisponible." }, { status: 503 });
  }
}

export const DELETE = avecJournal("DELETE /api/alertes/[id]", supprimer);
