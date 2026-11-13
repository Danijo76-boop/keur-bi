"use client";
import { useState } from "react";

export type Barre = { label: string; valeur: number; detail?: string };

// Série unique : le titre de la carte nomme la mesure, la valeur est écrite en bout de barre.
export default function BarresHorizontales({
  donnees,
  unite,
  format,
}: {
  donnees: Barre[];
  unite?: string;
  format?: (v: number) => string;
}) {
  const [survol, setSurvol] = useState<string | null>(null);
  const max = Math.max(...donnees.map((d) => d.valeur), 1);
  const texte = (v: number) => (format ? format(v) : `${v.toLocaleString()}${unite ? ` ${unite}` : ""}`);

  return (
    <div className="flex flex-col gap-1">
      {donnees.map((d) => (
        <div
          key={d.label}
          className={`grid grid-cols-[6rem_1fr_auto] items-center gap-2 text-xs rounded py-1 px-1 ${survol === d.label ? "bg-gray-50" : ""}`}
          onMouseEnter={() => setSurvol(d.label)}
          onMouseLeave={() => setSurvol(null)}
          title={d.detail ? `${d.label} : ${texte(d.valeur)} (${d.detail})` : `${d.label} : ${texte(d.valeur)}`}
        >
          <span className="text-gray-600 truncate">{d.label}</span>
          <span className="h-3 bg-gray-100 rounded-r overflow-hidden">
            <span className="block h-full bg-navy rounded-r" style={{ width: `${(d.valeur / max) * 100}%` }} />
          </span>
          <span className="font-semibold text-gray-800 tabular-nums">{texte(d.valeur)}</span>
        </div>
      ))}
    </div>
  );
}
