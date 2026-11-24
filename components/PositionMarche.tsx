"use client";
import { TrendingDown, TrendingUp, Minus } from "@/components/icones";
import { useBiens } from "@/lib/annonces";
import { Bien, formatFCFA } from "@/lib/mock-data";
import { positionPrix } from "@/lib/marche";

const NIVEAUX = {
  dessous: { texte: "En dessous du marché", icone: TrendingDown, classe: "bg-green/10 text-green" },
  moyenne: { texte: "Dans la moyenne du marché", icone: Minus, classe: "bg-blue/10 text-blue" },
  dessus: { texte: "Au-dessus du marché", icone: TrendingUp, classe: "bg-gold/20 text-navy-dark" },
};

export default function PositionMarche({
  bien,
  className = "",
}: {
  bien: Pick<Bien, "type" | "region" | "prix" | "superficie" | "transaction"> & { id?: string };
  className?: string;
}) {
  const biens = useBiens();
  const p = positionPrix(bien, biens);
  if (!p) return null;
  const n = NIVEAUX[p.niveau];
  return (
    <div className={`rounded-lg px-4 py-3 ${n.classe} ${className}`}>
      <div className="flex items-center gap-2 font-semibold text-sm">
        <n.icone size={16} /> {n.texte} ({p.ecart > 0 ? "+" : ""}
        {p.ecart} %)
      </div>
      <p className="text-xs mt-0.5 opacity-80">
        Médiane : {formatFCFA(p.medianeM2)} / m² sur {p.nbComparables} annonces comparables ({p.perimetre}). Repère indicatif : l&apos;emplacement et
        l&apos;état du bien comptent aussi.
      </p>
    </div>
  );
}
