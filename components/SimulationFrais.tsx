"use client";
import Link from "next/link";
import { formatFCFA } from "@/lib/mock-data";
import { calculerFrais, useParametres } from "@/lib/parametres";

export default function SimulationFrais({ prix }: { prix: number }) {
  const p = useParametres();
  const f = calculerFrais(prix, p);
  const lignes = [
    { label: "Prix du bien", val: prix },
    { label: `Droits d'enregistrement (${p.droitsEnregistrement}%)`, val: f.droits },
    { label: `Publicité foncière (${p.publiciteFonciere}%)`, val: f.publicite },
    { label: `Honoraires notaire + TVA ${p.tvaHonoraires}%`, val: f.honoraires + f.tva },
    { label: "Frais de mutation TF", val: f.mutation },
  ];

  return (
    <div className="card p-5 mb-6">
      <h2 className="font-bold text-gray-900 mb-3">Simulation des frais d&apos;acquisition</h2>
      <dl className="text-sm flex flex-col gap-2">
        {lignes.map((l) => (
          <div key={l.label} className="flex justify-between gap-4">
            <dt className="text-gray-500">{l.label}</dt>
            <dd className="font-semibold text-right">{formatFCFA(l.val)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-gray-100 pt-2">
          <dt className="font-bold text-navy">Total à prévoir</dt>
          <dd className="font-bold text-navy text-right">{formatFCFA(f.totalAcquisition)}</dd>
        </div>
      </dl>
      <p className="text-xs text-gray-400 mt-3">
        Estimation indicative, soit +{((f.totalFrais / prix) * 100).toFixed(1).replace(".", ",")}% sur le prix.{" "}
        <Link href={`/frais?prix=${prix}`} className="text-blue hover:underline">Ouvrir le simulateur complet</Link>
      </p>
    </div>
  );
}
