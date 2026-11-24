"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scale, BellPlus } from "@/components/icones";
import { useBiens } from "@/lib/annonces";
import { creerAlerte, definirComparaison, lireFavoris, MAX_COMPARAISON } from "@/lib/preferences";
import { useStocke } from "@/lib/stockage";
import { estVerifie, lireOverridesTF } from "@/lib/tf";
import { formatPrix } from "@/lib/mock-data";
import { lireDossiers, statutVente } from "@/lib/dossiers";
import { useParametres } from "@/lib/parametres";
import PropertyCard from "@/components/PropertyCard";
import Protege from "@/components/Protege";
import NoteBien from "@/components/NoteBien";

export default function FavorisPage() {
  const router = useRouter();
  const biens = useBiens();
  const favoris = useStocke(lireFavoris, []);
  const overrides = useStocke(lireOverridesTF, []);
  const dossiers = useStocke(lireDossiers, []);
  const { flags } = useParametres();
  const [filtre, setFiltre] = useState("tous");
  const [selection, setSelection] = useState<string[]>([]);
  const [alerteCreee, setAlerteCreee] = useState(false);

  const mesFavoris = useMemo(() => biens.filter((b) => favoris.includes(b.id)), [biens, favoris]);
  const regions = Array.from(new Set(mesFavoris.map((b) => b.region)));

  const filtres = [
    { id: "tous", label: "Tous", test: () => true },
    { id: "dispo", label: "Disponibles", test: (b: (typeof biens)[number]) => statutVente(b.id, dossiers) === "disponible" },
    { id: "tf", label: "TF vérifié", test: (b: (typeof biens)[number]) => estVerifie(b, overrides) },
    { id: "baisse", label: "Prix en baisse", test: (b: (typeof biens)[number]) => b.prix_baisser },
    ...regions.map((r) => ({ id: r, label: r, test: (b: (typeof biens)[number]) => b.region === r })),
  ];
  const actif = filtres.find((f) => f.id === filtre) ?? filtres[0];
  const affiches = mesFavoris.filter(actif.test);

  function basculerSelection(id: string) {
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_COMPARAISON ? [...s, id] : s));
  }

  return (
    <Protege>
      {(user) => (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <h1 className="titre-page">Mes favoris</h1>
              <p className="text-gray-500 text-sm">
                {mesFavoris.length} biens sauvegardés · {mesFavoris.filter((b) => b.prix_baisser).length} avec prix en baisse
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {flags.comparateur && (
                <button
                  disabled={selection.length < 2}
                  onClick={() => {
                    definirComparaison(selection);
                    router.push("/comparer");
                  }}
                  className="flex items-center gap-2 border border-gray-200 bg-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Scale size={16} /> Comparer la sélection ({selection.length})
                </button>
              )}
              <button
                disabled={alerteCreee || mesFavoris.length === 0}
                onClick={() => {
                  // L'alerte reprend la région et le budget des favoris, pour suivre des biens comparables.
                  const r = regions.length === 1 ? regions[0] : undefined;
                  const prixMax = Math.max(...mesFavoris.map((b) => b.prix));
                  creerAlerte(user.email, `Biens proches de mes favoris${r ? ` · ${r}` : ""}`, { region: r, prixMax });
                  setAlerteCreee(true);
                }}
                className="flex items-center gap-2 btn-navy text-sm disabled:opacity-50"
              >
                <BellPlus size={16} /> {alerteCreee ? "Alerte créée" : "Créer une alerte"}
              </button>
            </div>
          </div>

          {mesFavoris.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <p>Aucun favori pour le moment.</p>
              <Link href="/annonces" className="text-blue text-sm mt-2 block hover:underline">
                Parcourir les annonces
              </Link>
            </div>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap mb-5">
                {filtres.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFiltre(f.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border ${f.id === actif.id ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200"}`}
                  >
                    {f.label} ({mesFavoris.filter(f.test).length})
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {affiches.map((b) => (
                  <div key={b.id}>
                    <PropertyCard bien={b} />
                    <div className="flex items-center justify-between mt-2 px-1 text-xs">
                      {flags.comparateur ? (
                        <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                          <input type="checkbox" className="accent-navy" checked={selection.includes(b.id)} onChange={() => basculerSelection(b.id)} />
                          Sélectionner
                        </label>
                      ) : (
                        <span />
                      )}
                      {b.prix_baisser && b.ancien_prix && <span className="text-green font-semibold">↓ −{formatPrix(b.ancien_prix - b.prix)}</span>}
                      {statutVente(b.id, dossiers) === "disponible" ? (
                        <Link href={`/annonces/${b.id}/offre`} className="text-blue font-medium hover:underline">
                          Faire une offre
                        </Link>
                      ) : (
                        <Link href={`/annonces?type=${b.type}`} className="text-blue font-medium hover:underline">
                          Similaires
                        </Link>
                      )}
                    </div>
                    <NoteBien id={b.id} className="mt-2 px-1" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Protege>
  );
}
