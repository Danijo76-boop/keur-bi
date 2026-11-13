import { NextResponse } from "next/server";
import { listerAnnonces } from "@/lib/serveur/annonces";

// La liste dépend de la base et des filtres de l'adresse : elle est calculée à chaque appel.
export const dynamic = "force-dynamic";

// GET /api/annonces?region=Dakar&type=villa&prixMax=100000000&q=almadies
export async function GET(requete: Request) {
  const p = new URL(requete.url).searchParams;
  const nombre = (cle: string) => {
    const v = Number(p.get(cle));
    return p.get(cle) && Number.isFinite(v) && v >= 0 ? v : undefined;
  };
  try {
    const annonces = await listerAnnonces({
      q: p.get("q")?.trim() || undefined,
      type: p.get("type") ?? undefined,
      region: p.get("region") ?? undefined,
      quartier: p.get("quartier") ?? undefined,
      prixMin: nombre("prixMin"),
      prixMax: nombre("prixMax"),
    });
    return NextResponse.json({ total: annonces.length, annonces });
  } catch (e) {
    console.error("GET /api/annonces", e);
    return NextResponse.json({ erreur: "La base de données ne répond pas." }, { status: 503 });
  }
}
