import { ETAPES_DOSSIER, LABELS_ETAPE, StatutDossier } from "@/lib/dossiers";

export default function ParcoursContrat({ statut }: { statut: StatutDossier }) {
  const idx = ETAPES_DOSSIER.indexOf(statut);
  return (
    <div className="flex flex-wrap gap-2">
      {ETAPES_DOSSIER.map((e, i) => (
        <span
          key={e}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
            i < idx
              ? "bg-green/10 text-green"
              : i === idx
              ? "bg-navy text-white"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {LABELS_ETAPE[e]}
        </span>
      ))}
    </div>
  );
}