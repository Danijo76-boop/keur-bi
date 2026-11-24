"use client";
import { useMetaAnnonce } from "@/lib/annonces";
import { Bien, formatFCFA } from "@/lib/mock-data";

type Ligne = { cle: string; date?: string; evenement: string; prix: number; variation?: number };

// Historique de l'annonce : mise en ligne puis changements de prix successifs.
export default function HistoriqueAnnonce({ bien }: { bien: Bien }) {
  const meta = useMetaAnnonce(bien.id);
  const changements = meta.historiquePrix ?? [];
  const prixInitial = bien.ancien_prix ?? bien.prix;

  const lignes: Ligne[] = [];
  if (bien.publieLe || bien.ancien_prix) {
    lignes.push({ cle: "initial", date: bien.publieLe, evenement: "Mise en ligne", prix: prixInitial });
  }
  let precedent = prixInitial;
  for (const c of changements) {
    lignes.push({
      cle: c.date,
      date: c.date,
      evenement: c.prix < precedent ? "Baisse de prix" : "Hausse de prix",
      prix: c.prix,
      variation: ((c.prix - precedent) / precedent) * 100,
    });
    precedent = c.prix;
  }
  // Baisse connue sans date précise (annonces d'origine).
  if (changements.length === 0 && bien.ancien_prix && bien.ancien_prix !== bien.prix) {
    lignes.push({
      cle: "actuel",
      evenement: bien.prix < bien.ancien_prix ? "Baisse de prix" : "Hausse de prix",
      prix: bien.prix,
      variation: ((bien.prix - bien.ancien_prix) / bien.ancien_prix) * 100,
    });
  }
  if (lignes.length === 0) return null;

  const jours = bien.publieLe ? Math.max(Math.floor((Date.now() - new Date(bien.publieLe).getTime()) / 86_400_000), 0) : null;
  const total = ((bien.prix - prixInitial) / prixInitial) * 100;
  const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1).replace(".", ",")} %`;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="font-bold text-gray-900">Historique de l&apos;annonce</h2>
        <p className="text-xs text-gray-500">
          {jours !== null && <>En ligne depuis {jours === 0 ? "aujourd'hui" : `${jours} jour${jours > 1 ? "s" : ""}`}</>}
          {jours !== null && total !== 0 && " · "}
          {total !== 0 && <span className={total < 0 ? "text-green font-semibold" : "text-red font-semibold"}>{pct(total)} depuis la mise en ligne</span>}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
            <th scope="col" className="py-2 font-semibold">
              Date
            </th>
            <th scope="col" className="py-2 font-semibold">
              Événement
            </th>
            <th scope="col" className="py-2 font-semibold text-right">
              Prix
            </th>
          </tr>
        </thead>
        <tbody>
          {[...lignes].reverse().map((l) => (
            <tr key={l.cle} className="border-b border-gray-50 last:border-0">
              <td className="py-2 text-gray-500 whitespace-nowrap">{l.date ? new Date(l.date).toLocaleDateString("fr-FR") : "—"}</td>
              <td className="py-2 text-gray-800">{l.evenement}</td>
              <td className="py-2 text-right whitespace-nowrap">
                <span className="font-semibold text-gray-900">{formatFCFA(l.prix)}</span>
                {l.variation !== undefined && (
                  <span className={`ml-2 text-xs font-semibold ${l.variation < 0 ? "text-green" : "text-red"}`}>{pct(l.variation)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
