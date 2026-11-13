import { BIENS } from "@/lib/mock-data";
import { trouverAnnonce } from "@/lib/serveur/annonces";
import AnnonceDetail from "@/components/AnnonceDetail";

export const dynamic = "force-dynamic";

export default async function DetailPage({ params }: { params: { id: string } }) {
  // L'annonce est lue dans la base. Celles publiées depuis le navigateur n'y sont pas encore : AnnonceDetail les résout côté client.
  const initial = await trouverAnnonce(params.id).catch((e) => {
    console.error("Annonce : base de données injoignable", e);
    return BIENS.find((b) => b.id === params.id) ?? null;
  });
  return <AnnonceDetail id={params.id} initial={initial ?? undefined} />;
}
