"use client";
import { LABELS_VENTE, lireDossiers, statutVente } from "@/lib/dossiers";
import { useStocke } from "@/lib/stockage";

export default function BadgeVente({ bienId }: { bienId: string }) {
  const statut = useStocke(() => statutVente(bienId, lireDossiers()), "disponible", [bienId]);
  if (statut === "disponible") return null;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statut === "vendu" ? "bg-navy-dark text-white" : "bg-blue text-white"}`}>
      {LABELS_VENTE[statut]}
    </span>
  );
}
