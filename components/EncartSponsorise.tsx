"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { useParametres } from "@/lib/parametres";
import { Campagne, choisirCampagne, Emplacement, enregistrerClicPublicite, enregistrerVuePublicite } from "@/lib/publicite";

// Encart publicitaire d'un partenaire, toujours signalé comme tel au visiteur.
export default function EncartSponsorise({ emplacement, className = "" }: { emplacement: Emplacement; className?: string }) {
  const { flags } = useParametres();
  const [campagne, setCampagne] = useState<Campagne>();

  // Choix et comptage côté navigateur uniquement : le rendu serveur ne doit ni tirer au sort ni compter une vue.
  useEffect(() => {
    if (!flags.publicite) return setCampagne(undefined);
    const c = choisirCampagne(emplacement, Math.floor(Math.random() * 1000));
    setCampagne(c);
    if (c) enregistrerVuePublicite(c.id);
  }, [emplacement, flags.publicite]);

  if (!campagne) return null;

  return (
    <aside aria-label="Contenu sponsorisé" className={`card p-5 flex flex-col border-dashed ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1"><Megaphone size={12} /> Sponsorisé</span>
        <span className="text-xs text-gray-400 truncate">{campagne.annonceur}</span>
      </div>
      <h3 className="font-bold text-gray-900 leading-snug">{campagne.titre}</h3>
      <p className="text-sm text-gray-500 mt-1 flex-1">{campagne.texte}</p>
      <Link
        href={campagne.lien}
        onClick={() => enregistrerClicPublicite(campagne.id)}
        className="mt-4 text-sm font-semibold text-navy flex items-center gap-1 hover:gap-2 transition-all"
      >
        {campagne.cta} <ArrowRight size={15} />
      </Link>
    </aside>
  );
}
