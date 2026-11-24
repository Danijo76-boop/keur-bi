"use client";
import { useBiens } from "@/lib/annonces";
import { lireDossiers } from "@/lib/dossiers";
import { recommander } from "@/lib/marche";
import { lireFavoris, lireVus } from "@/lib/preferences";
import { useStocke } from "@/lib/stockage";
import PropertyCard from "@/components/PropertyCard";

export default function SectionPersonnalisee({ conteneur = "" }: { conteneur?: string }) {
  const biens = useBiens();
  const vus = useStocke(lireVus, []);
  const favoris = useStocke(lireFavoris, []);
  const dossiers = useStocke(lireDossiers, []);

  const recents = vus
    .map((id) => biens.find((b) => b.id === id))
    .filter((b): b is (typeof biens)[number] => !!b)
    .slice(0, 3);
  const suggestions = recommander(biens, vus, favoris, dossiers);

  if (recents.length === 0 && suggestions.length === 0) return null;

  return (
    <div className={`flex flex-col gap-8 ${conteneur}`}>
      {suggestions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-navy mb-1">Recommandés pour vous</h2>
          <p className="text-gray-500 text-sm mb-4">D&apos;après les biens que vous avez consultés</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {suggestions.map((b) => (
              <PropertyCard key={b.id} bien={b} />
            ))}
          </div>
        </section>
      )}
      {recents.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-navy mb-4">Vus récemment</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recents.map((b) => (
              <PropertyCard key={b.id} bien={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
