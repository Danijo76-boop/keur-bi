"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useBiens } from "@/lib/annonces";
import { mediane } from "@/lib/marche";
import { Bien, formatFCFA, formatPrix, enVente } from "@/lib/mock-data";
import { useStocke } from "@/lib/stockage";
import { lireDossiers } from "@/lib/dossiers";
import { ICONES_TF, LABELS_TF, lireDemandesTF, lireOverridesTF, statutTF, StatutTF } from "@/lib/tf";
import BarresHorizontales from "@/components/BarresHorizontales";
import BandeauDemo from "@/components/BandeauDemo";

const TYPES: { id: Bien["type"]; label: string }[] = [
  { id: "terrain", label: "Terrain" },
  { id: "villa", label: "Villa" },
  { id: "appartement", label: "Appartement" },
  { id: "bureau", label: "Bureau" },
];

const COULEURS_TF: Record<StatutTF, string> = {
  verifie: "bg-green-light",
  en_verification: "bg-gold",
  non_verifie: "bg-gray-400",
  invalide: "bg-red",
};

// Série illustrative issue de la maquette : le mock ne contient pas d'historique de prix.
const EVOLUTION_DAKAR = [
  { mois: "Oct. 2025", prix: 163_500 },
  { mois: "Janv. 2026", prix: 171_800 },
  { mois: "Avr. 2026", prix: 176_000 },
  { mois: "Juil. 2026", prix: 179_200 },
  { mois: "Oct. 2026", prix: 185_000 },
];

export default function StatistiquesPage() {
  // Statistiques de prix : ventes seulement, un loyer fausserait les moyennes.
  const biens = useBiens().filter(enVente);
  const overrides = useStocke(lireOverridesTF, []);
  const demandes = useStocke(lireDemandesTF, []);
  const [type, setType] = useState<Bien["type"]>("terrain");
  const dossiers = useStocke(lireDossiers, []);
  // Le titre du bien et l'étape suffisent : aucune donnée de personne n'apparaît sur cette page publique.
  const activite = dossiers
    .flatMap((d) =>
      d.evenements.filter((e) => e.libelle.startsWith("Étape")).map((e) => ({ ...e, bien: biens.find((b) => b.id === d.bienId)?.titre ?? "Bien" })),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const statuts = useMemo(() => biens.map((b) => statutTF(b, overrides, demandes)), [biens, overrides, demandes]);
  const parStatut = (["verifie", "en_verification", "non_verifie", "invalide"] as StatutTF[]).map((s) => ({
    statut: s,
    nb: statuts.filter((x) => x === s).length,
  }));
  const nbVerifies = parStatut[0].nb;

  const parRegion = useMemo(() => {
    const regions = Array.from(new Set(biens.map((b) => b.region)));
    return regions
      .map((r) => {
        const lot = biens.filter((b) => b.region === r && b.type === type);
        return { label: r, valeur: Math.round(mediane(lot.map((b) => b.prix / b.superficie))), detail: `${lot.length} annonce${lot.length > 1 ? "s" : ""}` };
      })
      .filter((x) => x.valeur > 0)
      .sort((a, b) => b.valeur - a.valeur);
  }, [biens, type]);

  const top = useMemo(() => [...biens].sort((a, b) => b.nb_vues - a.nb_vues).slice(0, 5), [biens]);

  const tuiles = [
    { val: biens.length, label: "Annonces actives" },
    { val: formatPrix(mediane(biens.map((b) => b.prix))), label: "Prix médian" },
    { val: nbVerifies, label: `TF vérifiés (${biens.length ? Math.round((nbVerifies / biens.length) * 100) : 0}%)` },
    { val: biens.reduce((s, b) => s + b.nb_vues, 0).toLocaleString("fr-FR"), label: "Vues cumulées" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy">Statistiques du marché</h1>
      <p className="text-gray-500 text-sm mb-4">Calculées en direct à partir des annonces de la plateforme</p>
      <BandeauDemo>Les chiffres portent sur le jeu d&apos;annonces de démonstration : ils ne décrivent pas le marché réel.</BandeauDemo>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tuiles.map((t) => (
          <div key={t.label} className="card p-5">
            <div className="text-2xl font-extrabold text-navy">{t.val}</div>
            <div className="text-xs text-gray-500">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <h2 className="font-bold text-gray-900">Prix médian par région (FCFA / m²)</h2>
            <div className="flex gap-1 flex-wrap" role="group" aria-label="Type de bien">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  aria-pressed={type === t.id}
                  onClick={() => setType(t.id)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${type === t.id ? "bg-navy text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {parRegion.length === 0 ? <p className="text-sm text-gray-400">Pas d&apos;annonce pour ce type.</p> : <BarresHorizontales donnees={parRegion} />}
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-1">Statut TF des annonces</h2>
          <p className="text-xs text-gray-400 mb-4">Part de transparence foncière</p>
          <div
            className="flex h-5 gap-0.5 rounded overflow-hidden mb-4"
            role="img"
            aria-label={parStatut.map((x) => `${LABELS_TF[x.statut]} : ${x.nb}`).join(", ")}
          >
            {parStatut
              .filter((x) => x.nb > 0)
              .map((x) => (
                <div
                  key={x.statut}
                  className={COULEURS_TF[x.statut]}
                  style={{ width: `${(x.nb / biens.length) * 100}%` }}
                  title={`${LABELS_TF[x.statut]} : ${x.nb}`}
                />
              ))}
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-2 text-sm">
            {parStatut.map((x) => (
              <li key={x.statut} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-sm shrink-0 ${COULEURS_TF[x.statut]}`} />
                <span className="text-gray-600">
                  {ICONES_TF[x.statut]} {LABELS_TF[x.statut]}
                </span>
                <span className="font-semibold text-gray-900 ml-auto">{x.nb}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5 overflow-x-auto">
          <h2 className="font-bold text-gray-900 mb-3">🏆 Top annonces par vues</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400">
                <th scope="col" className="pb-2 font-semibold">
                  Bien
                </th>
                <th scope="col" className="pb-2 font-semibold">
                  Région
                </th>
                <th scope="col" className="pb-2 font-semibold text-right">
                  Prix
                </th>
                <th scope="col" className="pb-2 font-semibold text-right">
                  Vues
                </th>
              </tr>
            </thead>
            <tbody>
              {top.map((b) => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="py-2 pr-2">
                    <Link href={`/annonces/${b.id}`} className="text-gray-800 hover:text-navy font-medium">
                      {b.titre}
                    </Link>
                  </td>
                  <td className="py-2 pr-2 text-gray-500">{b.region}</td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap">{formatPrix(b.prix)}</td>
                  <td className="py-2 text-right tabular-nums">{b.nb_vues.toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-1">📈 Évolution du prix médian, Dakar centre</h2>
          <p className="text-xs text-gray-400 mb-3">Série illustrative issue de la maquette, en FCFA / m²</p>
          <BarresHorizontales donnees={EVOLUTION_DAKAR.map((e) => ({ label: e.mois, valeur: e.prix }))} format={(v) => formatFCFA(v).replace(" FCFA", "")} />
        </div>
      </div>

      <div className="card p-5 mt-6">
        <h2 className="font-bold text-gray-900 mb-3">Activité récente de la plateforme</h2>
        {activite.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune activité pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {activite.map((e) => (
              <li key={e.id} className="flex justify-between gap-4">
                <span className="text-gray-700">
                  {e.bien} · {e.libelle.replace("Étape : ", "")}
                </span>
                <span className="text-xs text-gray-400 shrink-0">{new Date(e.date).toLocaleDateString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
