"use client";
import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { LatLngBounds } from "leaflet";
import { coordonnees, useBiens } from "@/lib/annonces";
import { formatFCFA } from "@/lib/mock-data";
import { useStocke } from "@/lib/stockage";
import { ICONES_TF, LABELS_TF, lireDemandesTF, lireOverridesTF, statutTF, StatutTF } from "@/lib/tf";
import SiActif from "@/components/SiActif";

// Leaflet a besoin de window : la carte n'est rendue que côté navigateur.
const CarteLeaflet = dynamic(() => import("@/components/CarteLeaflet"), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-gray-400 text-sm">Chargement de la carte…</div>,
});

const TYPES = ["terrain", "villa", "appartement", "bureau"];

export default function CartePage() {
  const biens = useBiens();
  const overrides = useStocke(lireOverridesTF, []);
  const demandes = useStocke(lireDemandesTF, []);
  const [filtreTF, setFiltreTF] = useState<StatutTF | "">("");
  const [filtreType, setFiltreType] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const selectionner = useCallback((id: string) => setSelection(id), []);
  const [limiterZone, setLimiterZone] = useState(false);
  const [zone, setZone] = useState<LatLngBounds | null>(null);

  const visibles = useMemo(
    () =>
      biens.filter((b) => {
        if (filtreType && b.type !== filtreType) return false;
        if (filtreTF && statutTF(b, overrides, demandes) !== filtreTF) return false;
        return true;
      }),
    [biens, filtreTF, filtreType, overrides, demandes],
  );

  const liste = limiterZone && zone ? visibles.filter((b) => zone.contains(coordonnees(b))) : visibles;

  const pastille = (actif: boolean) =>
    `text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap first-letter:uppercase ${actif ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200"}`;

  return (
    <SiActif flag="carte">
      <div className="flex flex-col h-[calc(100vh-4rem)] -mb-16">
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
          <button className={pastille(!filtreTF)} onClick={() => setFiltreTF("")}>Tous</button>
          {(["verifie", "en_verification"] as StatutTF[]).map((s) => (
            <button key={s} className={pastille(filtreTF === s)} onClick={() => setFiltreTF(s)}>{ICONES_TF[s]} {LABELS_TF[s]}</button>
          ))}
          <span className="border-l border-gray-200 mx-1" />
          {TYPES.map((t) => (
            <button key={t} className={pastille(filtreType === t)} onClick={() => setFiltreType(filtreType === t ? "" : t)}>{t}</button>
          ))}
        </div>
        <div className="flex-1 flex flex-col-reverse md:flex-row min-h-0">
          <aside className="w-full md:w-80 h-64 md:h-auto overflow-y-auto bg-gray-50 border-r border-gray-100 p-3 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500 font-semibold">{liste.length} biens</p>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" className="accent-navy" checked={limiterZone} onChange={(e) => setLimiterZone(e.target.checked)} />
                Zone visible uniquement
              </label>
            </div>
            {liste.map((b) => {
              const s = statutTF(b, overrides, demandes);
              return (
                <button
                  key={b.id}
                  onClick={() => setSelection(b.id)}
                  className={`card p-3 text-left shrink-0 ${selection === b.id ? "ring-2 ring-gold" : ""}`}
                >
                  <div className="text-xs text-gray-500 mb-1">{ICONES_TF[s]} {LABELS_TF[s]}</div>
                  <div className="font-semibold text-sm text-gray-900">{b.titre}</div>
                  <div className="text-xs text-gray-400">{b.ville} · {b.superficie.toLocaleString("fr-FR")} m²</div>
                  <div className="text-navy font-bold text-sm mt-1">{formatFCFA(b.prix)}</div>
                  {selection === b.id && (
                    <Link href={`/annonces/${b.id}`} className="text-xs text-blue font-medium hover:underline mt-1 inline-block">Voir le détail →</Link>
                  )}
                </button>
              );
            })}
            {liste.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Aucun bien pour ces filtres.</p>}
          </aside>
          <div className="flex-1 min-h-[300px] bg-gray-100">
            <CarteLeaflet biens={visibles} selection={selection} onSelection={selectionner} onZone={setZone} />
          </div>
        </div>
      </div>
    </SiActif>
  );
}
