"use client";
import { useState } from "react";
import { Scale } from "@/components/icones";
import { basculerComparaison, lireComparaison, MAX_COMPARAISON } from "@/lib/preferences";
import { useParametres } from "@/lib/parametres";
import { useStocke } from "@/lib/stockage";
import { useExigeCompte } from "@/lib/exige-compte";

export default function BoutonComparer({ id, className, avecTexte }: { id: string; className?: string; avecTexte?: boolean }) {
  const selection = useStocke(lireComparaison, []);
  const { flags } = useParametres();
  const [plein, setPlein] = useState(false);
  const exigeCompte = useExigeCompte();
  const actif = selection.includes(id);

  if (!flags.comparateur) return null;

  function basculer(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!exigeCompte()) return;
    setPlein(!basculerComparaison(id));
  }

  return (
    <button
      type="button"
      onClick={basculer}
      className={className}
      aria-pressed={actif}
      aria-label={actif ? "Retirer du comparateur" : "Ajouter au comparateur"}
      title={plein ? `${MAX_COMPARAISON} biens maximum : retirez-en un depuis le comparateur` : undefined}
    >
      <Scale size={avecTexte ? 16 : 15} className={actif ? "text-blue" : plein ? "text-red" : "text-gray-400 hover:text-blue"} />
      {avecTexte && <span>{actif ? "Dans le comparateur" : "Comparer"}</span>}
    </button>
  );
}
