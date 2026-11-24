"use client";
import { useBiens } from "@/lib/annonces";
import { AGENCES } from "@/lib/agences";
import { formatPrix, enVente } from "@/lib/mock-data";
import { Compteur } from "@/components/Dynamique";

// Les chiffres de l'accueil sont calculés sur les données du site, pour rester
// cohérents avec la liste des annonces, les statistiques et les fiches d'agence.

export function ChiffresCles() {
  const tous = useBiens();
  // Le prix moyen ne porte que sur les ventes : un loyer fausserait la moyenne.
  const dakar = tous.filter(enVente).filter((b) => b.region === "Dakar");
  const moyenneDakar = dakar.length ? dakar.reduce((s, b) => s + b.prix, 0) / dakar.length : 0;
  const chiffres: { label: string; val: number; format?: (n: number) => string }[] = [
    { label: "Annonces actives", val: tous.length },
    { label: "Ventes des agences partenaires", val: AGENCES.reduce((s, a) => s + a.ventes, 0) },
    { label: "Agences partenaires", val: AGENCES.length },
    { label: "Prix moyen Dakar", val: moyenneDakar, format: (n) => (moyenneDakar ? formatPrix(n) : "—") },
  ];
  return (
    <>
      {chiffres.map((s) => (
        <div key={s.label} className="px-4 py-6 text-center">
          <div className="font-display text-navy-dark font-extrabold text-2xl md:text-3xl tabular-nums"><Compteur valeur={s.val} format={s.format} /></div>
          <div className="text-gray-500 text-xs md:text-sm mt-1">{s.label}</div>
        </div>
      ))}
    </>
  );
}

export function NbAnnoncesRegion({ region }: { region: string }) {
  const nb = useBiens().filter((b) => b.region === region).length;
  return <>{nb === 0 ? "Bientôt des annonces" : `${nb} annonce${nb > 1 ? "s" : ""}`}</>;
}
