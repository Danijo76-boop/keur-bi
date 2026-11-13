"use client";
import { Heart } from "lucide-react";
import { basculerFavori, lireFavoris } from "@/lib/preferences";
import { useStocke } from "@/lib/stockage";

export default function FavoriButton({
  id,
  className,
  size = 15,
}: {
  id: string;
  className?: string;
  size?: number;
}) {
  const actif = useStocke(() => lireFavoris().includes(id), false, [id]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    basculerFavori(id);
  }

  return (
    <button onClick={toggle} className={className} aria-label={actif ? "Retirer des favoris" : "Ajouter aux favoris"}>
      <Heart size={size} className={actif ? "text-red fill-red" : "text-gray-400 hover:text-red"} />
    </button>
  );
}
