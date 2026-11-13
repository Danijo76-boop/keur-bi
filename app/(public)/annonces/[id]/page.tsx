import { BIENS } from "@/lib/mock-data";
import AnnonceDetail from "@/components/AnnonceDetail";

export default function DetailPage({ params }: { params: { id: string } }) {
  // Les annonces publiées par les utilisateurs n'existent que dans le navigateur : AnnonceDetail les résout côté client.
  return <AnnonceDetail id={params.id} initial={BIENS.find((b) => b.id === params.id)} />;
}
