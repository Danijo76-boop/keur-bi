import { lireFichier } from "@/lib/serveur/fichiers";
import { avecJournal, log } from "@/lib/serveur/journal";

// GET /api/fichiers/<id> : sert une photo d'annonce. Publique, comme les annonces elles-mêmes.
async function get(_requete: Request, { params }: { params: { id: string } }) {
  try {
    const fichier = /^[a-z0-9]+$/.test(params.id) ? await lireFichier(params.id) : null;
    if (!fichier) return new Response("Fichier introuvable.", { status: 404 });
    return new Response(Buffer.from(fichier.donnees), {
      headers: {
        "Content-Type": fichier.type,
        // Un fichier ne change jamais une fois enregistré : le navigateur peut le garder indéfiniment.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    log.erreur("GET /api/fichiers/[id]", e);
    return new Response("Service indisponible.", { status: 503 });
  }
}

export const GET = avecJournal("GET /api/fichiers/[id]", get);
