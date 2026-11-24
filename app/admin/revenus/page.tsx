"use client";
import { useBiens, useMetasAnnonces } from "@/lib/annonces";
import { lireDossiers } from "@/lib/dossiers";
import { formatFCFA } from "@/lib/mock-data";
import { useParametres } from "@/lib/parametres";
import {
  calculerRevenus,
  lireAbonnesNewsletter,
  lireCommandes,
  lireDemandesFinancement,
  OFFRES_FINANCEMENT,
  PRIX_LEAD,
  SERVICES,
  traiterCommande,
  transmettreDemande,
} from "@/lib/revenus";
import { useStocke } from "@/lib/stockage";
import { lireDemandesTF } from "@/lib/tf";
import { lireUtilisateurs } from "@/lib/utilisateurs";
import BarresHorizontales from "@/components/BarresHorizontales";
import { CAMPAGNES, lireStatsPublicite } from "@/lib/publicite";

const jour = (d: string) => new Date(d).toLocaleDateString("fr-FR");

export default function RevenusPage() {
  const biens = useBiens(true);
  const metas = useMetasAnnonces();
  const p = useParametres();
  const dossiers = useStocke(lireDossiers, []);
  const utilisateurs = useStocke(lireUtilisateurs, []);
  const demandesTF = useStocke(lireDemandesTF, []);
  const commandes = useStocke(lireCommandes, []);
  const leads = useStocke(lireDemandesFinancement, []);
  const abonnes = useStocke(lireAbonnesNewsletter, []);
  const publicite = useStocke(lireStatsPublicite, {});

  const lignes = calculerRevenus({ dossiers, biens, utilisateurs, metas, demandesTF, commandes, leads, publicite, p });
  const total = lignes.reduce((s, l) => s + l.montant, 0);
  const recurrent = lignes.filter((l) => l.recurrent).reduce((s, l) => s + l.montant, 0);

  const tuiles = [
    { val: formatFCFA(total), label: "Revenus estimés, toutes sources" },
    { val: formatFCFA(recurrent), label: "Dont récurrent, par mois" },
    { val: commandes.filter((c) => c.statut === "nouvelle").length, label: "Commandes à traiter" },
    { val: leads.filter((l) => l.statut === "nouvelle").length, label: "Demandes de crédit à transmettre" },
    { val: abonnes.length, label: "Inscrits à la lettre d'information" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Revenus</h1>
      <p className="text-gray-500 text-sm mb-6">
        Estimation à partir de l&apos;activité enregistrée dans ce navigateur : aucun encaissement réel dans cette démo.
      </p>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        {tuiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="text-xl font-extrabold text-navy break-words">{t.val}</div>
            <div className="text-xs text-gray-500">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Revenus par source</h2>
          <BarresHorizontales donnees={lignes.map((l) => ({ label: l.label, valeur: l.montant, detail: l.detail }))} format={formatFCFA} />
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th scope="col" className="p-3 font-semibold">
                  Source
                </th>
                <th scope="col" className="p-3 font-semibold text-right">
                  Montant
                </th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id} className="border-b border-gray-50">
                  <th scope="row" className="p-3 text-left font-normal">
                    <span className="font-semibold text-gray-800">{l.label}</span>
                    <span className="block text-xs text-gray-400">{l.detail}</span>
                  </th>
                  <td className="p-3 text-right font-semibold whitespace-nowrap">
                    {formatFCFA(l.montant)}
                    {l.recurrent && <span className="text-xs font-normal text-gray-400"> /mois</span>}
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="p-3 text-left font-bold text-navy">
                  Total
                </th>
                <td className="p-3 text-right font-bold text-navy whitespace-nowrap">{formatFCFA(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <section className="card overflow-x-auto mb-6">
        <div className="p-5 pb-2">
          <h2 className="font-bold text-gray-900">Publicité partenaires</h2>
          <p className="text-xs text-gray-400">Chaque clic sur un encart sponsorisé est facturé à l&apos;annonceur. Annonceurs et tarifs d&apos;exemple.</p>
        </div>
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
              <th scope="col" className="p-3 font-semibold">
                Campagne
              </th>
              <th scope="col" className="p-3 font-semibold text-right">
                Affichages
              </th>
              <th scope="col" className="p-3 font-semibold text-right">
                Clics
              </th>
              <th scope="col" className="p-3 font-semibold text-right">
                Taux de clic
              </th>
              <th scope="col" className="p-3 font-semibold text-right">
                Prix du clic
              </th>
              <th scope="col" className="p-3 font-semibold text-right">
                Revenu
              </th>
            </tr>
          </thead>
          <tbody>
            {CAMPAGNES.map((c) => {
              const s = publicite[c.id] ?? { vues: 0, clics: 0 };
              return (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <th scope="row" className="p-3 text-left font-normal">
                    <span className="font-semibold text-gray-800">{c.annonceur}</span>
                    <span className="block text-xs text-gray-400">{c.titre}</span>
                  </th>
                  <td className="p-3 text-right">{s.vues}</td>
                  <td className="p-3 text-right">{s.clics}</td>
                  <td className="p-3 text-right">{s.vues ? `${((s.clics / s.vues) * 100).toFixed(1).replace(".", ",")} %` : "—"}</td>
                  <td className="p-3 text-right whitespace-nowrap">{formatFCFA(c.cpc)}</td>
                  <td className="p-3 text-right font-semibold whitespace-nowrap">{formatFCFA(s.clics * c.cpc)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Commandes de services ({commandes.length})</h2>
          {commandes.length === 0 && <p className="text-sm text-gray-400">Aucune commande pour le moment.</p>}
          <ul className="flex flex-col gap-2">
            {commandes.map((c) => (
              <li key={c.id} className="bg-gray-50 rounded-lg p-3 text-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">{SERVICES.find((s) => s.id === c.serviceId)?.titre ?? c.serviceId}</div>
                  <div className="text-xs text-gray-500 break-words">
                    {c.nom} · {c.telephone} · {jour(c.date)} · {formatFCFA(c.montant)}
                  </div>
                  {c.note && <div className="text-xs text-gray-400 break-words mt-0.5">{c.note}</div>}
                </div>
                {c.statut === "nouvelle" ? (
                  <button onClick={() => traiterCommande(c.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy text-white shrink-0">
                    Marquer traitée
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-green shrink-0">✓ Traitée</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-gray-900 mb-1">Demandes de financement ({leads.length})</h2>
          <p className="text-xs text-gray-400 mb-3">Hypothèse : {formatFCFA(PRIX_LEAD)} versés par la banque pour chaque demande transmise.</p>
          {leads.length === 0 && <p className="text-sm text-gray-400">Aucune demande pour le moment.</p>}
          <ul className="flex flex-col gap-2">
            {leads.map((l) => (
              <li key={l.id} className="bg-gray-50 rounded-lg p-3 text-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">
                    {l.nom} · {formatFCFA(l.montant)} sur {l.duree} ans
                  </div>
                  <div className="text-xs text-gray-500 break-words">
                    {OFFRES_FINANCEMENT.find((o) => o.id === l.offreId)?.nom} · {l.telephone} · {jour(l.date)}
                  </div>
                </div>
                {l.statut === "nouvelle" ? (
                  <button onClick={() => transmettreDemande(l.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy text-white shrink-0">
                    Transmettre
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-green shrink-0">✓ Transmise</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
