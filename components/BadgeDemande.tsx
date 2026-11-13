"use client";
import { Flame } from "lucide-react";
import { lireDossiers } from "@/lib/dossiers";
import { niveauDemande } from "@/lib/marche";
import { Bien } from "@/lib/mock-data";
import { useStocke } from "@/lib/stockage";
import { lireVisites } from "@/lib/visites";

// Signal d'intérêt sur un bien : compact sur les cartes, détaillé sur la fiche.
export default function BadgeDemande({ bien, detail = false }: { bien: Bien; detail?: boolean }) {
  const visites = useStocke(lireVisites, []);
  const dossiers = useStocke(lireDossiers, []);
  const nbVisites = visites.filter((v) => v.bienId === bien.id && (v.statut === "demandee" || v.statut === "confirmee")).length;
  const nbOffres = dossiers
    .filter((d) => d.bienId === bien.id && !d.incident)
    .reduce((s, d) => s + d.offres.filter((o) => o.statut === "en_attente").length, 0);
  const demande = niveauDemande(bien, nbVisites, nbOffres);
  if (!demande) return null;
  const forte = demande.niveau === "forte";
  const libelle = forte ? "Très demandé" : "Demande soutenue";

  if (!detail) {
    if (!forte) return null;
    return (
      <span className="bg-white text-red text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
        <Flame size={11} /> {libelle}
      </span>
    );
  }

  return (
    <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${forte ? "bg-red/10 text-red" : "bg-gold/15 text-navy-dark"}`}>
      <Flame size={18} className="shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold text-sm">{libelle}</div>
        <p className="text-xs opacity-80 mt-0.5">
          {demande.raisons.join(" · ")}. {forte ? "Ce bien pourrait partir vite : planifiez une visite sans tarder." : "Ce bien suscite un intérêt régulier."}
        </p>
      </div>
    </div>
  );
}
