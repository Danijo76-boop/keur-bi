"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatFCFA } from "@/lib/mock-data";
import { NOTAIRES } from "@/lib/notaires";
import { texteNote } from "@/lib/moderation";
import { SimulateurCredit, SimulateurInvestisseur } from "@/components/SimulateursFinancement";
import { BAREME_HONORAIRES, calculerFrais, commissionVente, tauxCommissionPour, useParametres } from "@/lib/parametres";

type Profil = "acheteur" | "vendeur" | "investisseur";
const MAX_CURSEUR = 500_000_000;

function Simulateur() {
  const params = useSearchParams();
  const p = useParametres();
  const [profil, setProfil] = useState<Profil>("acheteur");
  const [prix, setPrix] = useState(() => Number(params.get("prix")) || 80_000_000);
  const f = calculerFrais(prix, p);
  const commission = commissionVente(prix, p);

  const lignes = [
    { label: "Prix du bien", note: "", val: prix },
    { label: `Droits d'enregistrement (${p.droitsEnregistrement}%)`, note: "Base : prix de vente", val: f.droits },
    { label: `Publicité foncière (${p.publiciteFonciere}%)`, note: "Conservation foncière", val: f.publicite },
    { label: "Honoraires notaire HT", note: "Barème ci-dessous", val: f.honoraires },
    { label: `TVA sur honoraires (${p.tvaHonoraires}%)`, note: "", val: f.tva },
    { label: "Frais de mutation TF", note: "Droits de timbre + copie", val: f.mutation },
  ];

  let plancher = 0;
  let cumul = 0;
  const bareme = BAREME_HONORAIRES.map((t) => {
    const debut = plancher;
    if (Number.isFinite(t.jusqua)) cumul += ((t.jusqua - plancher) * t.taux) / 100;
    plancher = t.jusqua;
    return {
      tranche: Number.isFinite(t.jusqua) ? `${formatFCFA(debut).replace(" FCFA", "")} – ${formatFCFA(t.jusqua)}` : `Au-delà de ${formatFCFA(debut)}`,
      taux: t.taux,
      cumul: Number.isFinite(t.jusqua) ? formatFCFA(cumul) : "variable",
      votreCas: prix > debut && prix <= t.jusqua,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy">Simulateur de frais</h1>
      <p className="text-gray-500 text-sm mb-6">Estimez le coût total avant de vous engager</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="flex gap-1 mb-4" role="group" aria-label="Profil">
              {(["acheteur", "vendeur", "investisseur"] as Profil[]).map((x) => (
                <button
                  key={x}
                  aria-pressed={profil === x}
                  onClick={() => setProfil(x)}
                  className={`flex-1 text-sm font-semibold py-2 rounded-lg capitalize ${profil === x ? "bg-navy text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  {x}
                </button>
              ))}
            </div>
            <label className="text-sm font-semibold text-gray-700 block">
              Prix de vente (FCFA)
              <input
                type="number"
                min={0}
                value={prix || ""}
                onChange={(e) => setPrix(Math.max(Number(e.target.value), 0))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal"
              />
            </label>
            <input
              type="range"
              aria-label="Prix de vente"
              min={1_000_000}
              max={MAX_CURSEUR}
              step={1_000_000}
              value={Math.min(prix, MAX_CURSEUR)}
              onChange={(e) => setPrix(Number(e.target.value))}
              className="w-full mt-3 accent-gold"
            />
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Délais clés</h2>
            <ul className="text-sm flex flex-col gap-3">
              <li>
                <span className="font-semibold text-gray-800 block">📋 Promesse de vente</span>
                <span className="text-xs text-gray-500">Validité max. 6 mois, renouvelable</span>
              </li>
              <li>
                <span className="font-semibold text-gray-800 block">🏛️ Enregistrement DGID</span>
                <span className="text-xs text-gray-500">{p.moisEnregistrement} mois après la signature de l&apos;acte</span>
              </li>
              <li>
                <span className="font-semibold text-gray-800 block">⚠️ Pénalité de retard</span>
                <span className="text-xs text-gray-500">+{p.penaliteRetard}% sur les droits d&apos;enregistrement</span>
              </li>
              <li>
                <span className="font-semibold text-gray-800 block">🔖 Mutation TF</span>
                <span className="text-xs text-gray-500">15–30 jours ouvrés après dépôt</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Détail des frais</h2>
            {profil !== "vendeur" ? (
              <dl className="text-sm flex flex-col gap-3">
                {lignes.map((l) => (
                  <div key={l.label} className="flex justify-between gap-3">
                    <dt className="text-gray-600">
                      {l.label}
                      {l.note && <span className="block text-xs text-gray-400">{l.note}</span>}
                    </dt>
                    <dd className="font-semibold text-right shrink-0">{formatFCFA(l.val)}</dd>
                  </div>
                ))}
                {p.flags.cadastre && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-600">Vérification TF (KEUR BI)</dt>
                    <dd className="font-semibold text-green">Inclus ✓</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t border-gray-100 pt-3">
                  <dt className="font-bold text-navy">
                    Total acquisition
                    {prix > 0 && (
                      <span className="block text-xs font-normal text-gray-400">
                        soit +{((f.totalFrais / prix) * 100).toFixed(1).replace(".", ",")}% sur le prix
                      </span>
                    )}
                  </dt>
                  <dd className="font-bold text-navy text-right">{formatFCFA(f.totalAcquisition)}</dd>
                </div>
              </dl>
            ) : (
              <dl className="text-sm flex flex-col gap-3">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Prix de vente</dt>
                  <dd className="font-semibold text-right">{formatFCFA(prix)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">
                    Commission KEUR BI ({tauxCommissionPour(prix, p)}%)<span className="block text-xs text-gray-400">Due uniquement si la vente aboutit</span>
                  </dt>
                  <dd className="font-semibold text-right">−{formatFCFA(commission)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-gray-100 pt-3">
                  <dt className="font-bold text-navy">Net vendeur estimé</dt>
                  <dd className="font-bold text-navy text-right">{formatFCFA(prix - commission)}</dd>
                </div>
              </dl>
            )}
          </div>
          {profil === "investisseur" && <SimulateurInvestisseur prix={prix} frais={f.totalFrais} />}
          {profil !== "vendeur" && (
            <div className="card p-5 bg-gold/10 border-gold/30 text-sm text-gray-700">
              <strong className="block mb-1">⚠️ Délai d&apos;enregistrement DGID</strong>
              L&apos;acte doit être enregistré dans les {p.moisEnregistrement} mois suivant la signature. Au-delà, une pénalité de {p.penaliteRetard}%
              s&apos;applique sur les droits, soit +{formatFCFA(f.penaliteRetard)} dans votre cas.
            </div>
          )}
          <p className="text-xs text-gray-400">Estimation indicative. Seul votre notaire peut établir le décompte définitif.</p>
        </div>

        <div className="flex flex-col gap-4">
          {profil === "acheteur" && (
            <div className="-mb-6">
              <SimulateurCredit prix={prix} />
            </div>
          )}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Barème des honoraires</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400">
                  <th scope="col" className="pb-2 font-semibold">
                    Tranche
                  </th>
                  <th scope="col" className="pb-2 font-semibold">
                    Taux
                  </th>
                  <th scope="col" className="pb-2 font-semibold text-right">
                    Cumul
                  </th>
                </tr>
              </thead>
              <tbody>
                {bareme.map((b) => (
                  <tr key={b.tranche} className={`border-t border-gray-100 ${b.votreCas ? "bg-gold/10 font-semibold" : ""}`}>
                    <td className="py-2 pr-2">
                      {b.tranche}
                      {b.votreCas && <span className="block text-[11px] text-gray-500">← votre cas</span>}
                    </td>
                    <td className="py-2 pr-2">{b.taux.toLocaleString("fr-FR")}%</td>
                    <td className="py-2 text-right whitespace-nowrap">{b.cumul}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">Honoraires hors taxes, à faire confirmer par le notaire.</p>
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Notaires partenaires</h2>
            <div className="flex flex-col gap-3">
              {NOTAIRES.slice(0, 2).map((n) => (
                <Link key={n.slug} href={`/notaires/${n.slug}`} className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-navy/10 text-navy font-bold text-xs flex items-center justify-center shrink-0">{n.initiales}</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-navy">{n.nom}</div>
                    <div className="text-xs text-gray-400">
                      {n.ville}
                      {n.nbAvis > 0 && ` · ⭐ ${texteNote(n.note, n.nbAvis)}`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-5 bg-navy text-white">
            <h2 className="font-bold mb-3">Prêt à acheter ?</h2>
            <Link href="/annonces" className="btn-primary text-sm block text-center mb-2">
              Voir les annonces →
            </Link>
            <Link href="/guides" className="text-sm text-white/80 hover:text-white block text-center">
              Lire le guide d&apos;achat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FraisPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-400">Chargement…</div>}>
      <Simulateur />
    </Suspense>
  );
}
