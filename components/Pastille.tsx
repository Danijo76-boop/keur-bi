import type { TypeIcone } from "@/components/icones";

/* ── Pastille d'icône (charte graphique) ──
   Une icône pleine, en blanc, dans un rond de couleur : le repère visuel des menus et des raccourcis,
   dans l'esprit des grandes applications grand public. Chaque rubrique a sa couleur, toujours la même. */

export type CouleurPastille = "navy" | "bleu" | "or" | "vert" | "rouge" | "gris";

const FONDS: Record<CouleurPastille, string> = {
  navy: "from-[#2E6E9E] to-[#1B4F72]",
  bleu: "from-[#3A8FB0] to-[#1F6F8B]",
  or: "from-[#F5B82E] to-[#C98A00]",
  vert: "from-[#2E9B5E] to-[#1E7B45]",
  rouge: "from-[#D6493C] to-[#B42318]",
  gris: "from-[#7C8494] to-[#5F6673]",
};

export default function Pastille({
  icone: Icone,
  couleur = "navy",
  taille = 36,
  className = "",
}: {
  icone: TypeIcone;
  couleur?: CouleurPastille;
  taille?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center shrink-0 rounded-full bg-gradient-to-br text-white shadow-[0_6px_14px_-8px_rgba(27,42,74,0.6)] ${FONDS[couleur]} ${className}`}
      style={{ width: taille, height: taille }}
    >
      <Icone size={Math.round(taille * 0.52)} />
    </span>
  );
}
