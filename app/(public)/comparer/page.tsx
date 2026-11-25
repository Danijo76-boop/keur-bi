"use client";
import { popup } from "@/lib/popup";
import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Plus, Share2 } from "@/components/icones";
import { useBiens } from "@/lib/annonces";
import { Bien, formatFCFA } from "@/lib/mock-data";
import { notaireSuggere } from "@/lib/notaires";
import { calculerFrais, useParametres } from "@/lib/parametres";
import { basculerComparaison, definirComparaison, lireComparaison, MAX_COMPARAISON } from "@/lib/preferences";
import { useStocke } from "@/lib/stockage";
import { LABELS_TF, lireDemandesTF, lireOverridesTF, statutTF } from "@/lib/tf";
import SiActif from "@/components/SiActif";

export default function ComparerPage() {
  const biens = useBiens();
  const ids = useStocke(lireComparaison, []);
  const p = useParametres();
  const overrides = useStocke(lireOverridesTF, []);
  const demandes = useStocke(lireDemandesTF, []);
  const [copie, setCopie] = useState(false);

  const compares = ids.map((id) => biens.find((b) => b.id === id)).filter((b): b is Bien => !!b);
  const disponibles = biens.filter((b) => !ids.includes(b.id));

  // Le lien partagé reconstruit la sélection chez le destinataire.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("ids");
    if (param) definirComparaison(param.split(","));
  }, []);

  async function partager() {
    await navigator.clipboard.writeText(`${window.location.origin}/comparer?ids=${ids.join(",")}`);
    setCopie(true);
    popup.succes("Lien copié", "Vous pouvez le coller où vous voulez.");
  }

  const totaux = compares.map((b) => calculerFrais(b.prix, p).totalAcquisition);
  const prixM2 = compares.map((b) => b.prix / b.superficie);
  const iMoinsCher = totaux.indexOf(Math.min(...totaux));
  const iMeilleurM2 = prixM2.indexOf(Math.min(...prixM2));
  const iPlusGrand = compares.reduce((m, b, i) => (b.superficie > compares[m].superficie ? i : m), 0);

  const lignes: { label: string; rendu: (b: Bien, i: number) => ReactNode }[] = [
    {
      label: "Superficie",
      rendu: (b, i) => (
        <>
          {b.superficie.toLocaleString("fr-FR")} m²{compares.length > 1 && i === iPlusGrand && " ↑"}
        </>
      ),
    },
    {
      label: "Prix / m²",
      rendu: (b, i) => (
        <>
          {formatFCFA(prixM2[i])}
          {compares.length > 1 && i === iMeilleurM2 && " ✓"}
        </>
      ),
    },
    { label: "Quartier", rendu: (b) => b.quartier },
    {
      label: "Titre Foncier",
      rendu: (b) => {
        const s = statutTF(b, overrides, demandes);
        return LABELS_TF[s];
      },
    },
    { label: "Conservation", rendu: (b) => b.tf.conservation ?? "—" },
    { label: "Type", rendu: (b) => <span className="capitalize">{b.type}</span> },
    { label: "Frais estimés", rendu: (b) => formatFCFA(calculerFrais(b.prix, p).totalFrais) },
    {
      label: "Total acquisition",
      rendu: (b, i) => (
        <strong className="text-navy">
          {formatFCFA(totaux[i])}
          {compares.length > 1 && i === iMoinsCher && " ✓"}
        </strong>
      ),
    },
    {
      label: "Notaire suggéré",
      rendu: (b) => {
        const n = notaireSuggere(b.region);
        return (
          <Link href={`/notaires/${n.slug}`} className="text-blue hover:underline">
            {n.nom}
          </Link>
        );
      },
    },
    {
      label: "Action",
      rendu: (b) => (
        <Link href={`/annonces/${b.id}`} className="text-blue font-medium hover:underline">
          Voir le détail →
        </Link>
      ),
    },
  ];

  const analyse = (() => {
    if (compares.length < 2) return null;
    const moinsCher = compares[iMoinsCher];
    const autres = totaux.filter((_, i) => i !== iMoinsCher);
    const ecart = Math.min(...autres) - totaux[iMoinsCher];
    const grand = compares[iPlusGrand];
    return (
      <>
        <strong>{moinsCher.titre}</strong> a le coût total d&apos;acquisition le plus bas, avec {formatFCFA(ecart)} de moins que le suivant.{" "}
        <strong>{compares[iMeilleurM2].titre}</strong> a le meilleur prix au m².
        {grand.id !== moinsCher.id && (
          <>
            {" "}
            <strong>{grand.titre}</strong> offre la plus grande surface ({grand.superficie.toLocaleString("fr-FR")} m²).
          </>
        )}
      </>
    );
  })();

  return (
    <SiActif flag="comparateur">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="titre-page">Comparateur de biens</h1>
            <p className="text-gray-500 text-sm">Comparez jusqu&apos;à {MAX_COMPARAISON} biens côte à côte</p>
          </div>
          {compares.length > 0 && (
            <button
              onClick={partager}
              className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <Share2 size={16} /> {copie ? "Lien copié ✓" : "Partager la comparaison"}
            </button>
          )}
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 align-top">
                <th scope="col" className="p-4 text-left text-gray-400 font-semibold w-44">
                  Critères
                </th>
                {compares.map((b) => (
                  <th scope="col" key={b.id} className="p-4 text-left font-normal">
                    <div className="relative h-28 rounded-lg overflow-hidden bg-gray-200 mb-2">
                      <Image src={b.photo} alt={b.titre} fill className="object-cover" unoptimized={!b.photo.startsWith("http")} />
                    </div>
                    <div className="font-bold text-gray-900">{b.titre}</div>
                    <div className="text-navy font-bold">{formatFCFA(b.prix)}</div>
                    <button onClick={() => basculerComparaison(b.id)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red mt-1">
                      <X size={12} /> Retirer
                    </button>
                  </th>
                ))}
                {compares.length < MAX_COMPARAISON && (
                  <th scope="col" className="p-4 text-left font-normal w-64">
                    <div className="h-28 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 mb-2">
                      <Plus size={20} /> Ajouter un bien
                    </div>
                    <select
                      value=""
                      aria-label="Ajouter un bien à la comparaison"
                      onChange={(e) => e.target.value && basculerComparaison(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-navy"
                    >
                      <option value="">Choisir…</option>
                      {disponibles.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.titre}
                        </option>
                      ))}
                    </select>
                  </th>
                )}
              </tr>
            </thead>
            {compares.length > 0 && (
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.label} className="border-b border-gray-50 last:border-0">
                    <th scope="row" className="p-4 text-left text-gray-500 font-medium">
                      {l.label}
                    </th>
                    {compares.map((b, i) => (
                      <td key={b.id} className="p-4 text-gray-800">
                        {l.rendu(b, i)}
                      </td>
                    ))}
                    {compares.length < MAX_COMPARAISON && <td />}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {analyse && (
          <div className="card p-5 mt-6 border-l-4 border-blue">
            <h2 className="font-bold text-gray-900 mb-1">Analyse KEUR GUI</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{analyse}</p>
            <p className="text-xs text-gray-400 mt-2">
              Calcul automatique à partir des chiffres ci-dessus. Il ne remplace pas une visite ni l&apos;avis d&apos;un notaire.
            </p>
          </div>
        )}
      </div>
    </SiActif>
  );
}
