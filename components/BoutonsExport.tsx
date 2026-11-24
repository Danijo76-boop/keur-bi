"use client";
import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "@/components/icones";

/* ── Boutons de téléchargement ──
   Les mêmes partout sur le site, bien visibles : rouge pour le PDF, vert Excel pour le tableur.
   Le PDF peut prendre une seconde à préparer : le bouton l'indique et ne peut pas être cliqué deux fois. */

type Taille = "normal" | "petit";
const TAILLES: Record<Taille, string> = {
  normal: "px-4 py-2.5 text-sm gap-2",
  petit: "px-3 py-1.5 text-xs gap-1.5",
};
const BASE =
  "inline-flex items-center justify-center font-semibold rounded-xl text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function BoutonPDF({
  onClick,
  disabled,
  libelle = "Télécharger en PDF",
  taille = "normal",
  titre,
}: {
  onClick: () => unknown | Promise<unknown>;
  disabled?: boolean;
  libelle?: string;
  taille?: Taille;
  titre?: string;
}) {
  const [encours, setEncours] = useState(false);
  async function cliquer() {
    if (encours) return;
    setEncours(true);
    try {
      await onClick();
    } finally {
      setEncours(false);
    }
  }
  const icone = taille === "petit" ? 14 : 17;
  return (
    <button
      type="button"
      onClick={cliquer}
      disabled={disabled || encours}
      title={titre}
      aria-label={titre}
      className={`${BASE} ${TAILLES[taille]} bg-red hover:bg-[#931D13] focus-visible:outline-red`}
    >
      {encours ? <Loader2 size={icone} className="animate-spin" aria-hidden /> : <FileText size={icone} aria-hidden />}
      {encours ? "Préparation…" : libelle}
    </button>
  );
}

export function BoutonExcel({
  onClick,
  disabled,
  libelle = "Télécharger en Excel",
  taille = "normal",
}: {
  onClick: () => unknown;
  disabled?: boolean;
  libelle?: string;
  taille?: Taille;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${BASE} ${TAILLES[taille]} bg-[#1D6F42] hover:bg-[#185C37] focus-visible:outline-[#1D6F42]`}
    >
      <FileSpreadsheet size={taille === "petit" ? 14 : 17} aria-hidden />
      {libelle}
    </button>
  );
}

// Les deux côte à côte, avec un message quand il n'y a rien à exporter.
export function BoutonsExport({
  onPDF,
  onExcel,
  disabled,
  raison = "Rien à exporter pour le moment.",
}: {
  onPDF: () => unknown | Promise<unknown>;
  onExcel: () => unknown;
  disabled?: boolean;
  raison?: string;
}) {
  return (
    <div className="flex flex-col items-start sm:items-end gap-1">
      <div className="flex gap-2 flex-wrap">
        <BoutonPDF onClick={onPDF} disabled={disabled} />
        <BoutonExcel onClick={onExcel} disabled={disabled} />
      </div>
      {disabled && <p className="text-xs text-gray-400">{raison}</p>}
    </div>
  );
}
