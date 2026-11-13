"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Wallet } from "lucide-react";
import { useBiens } from "@/lib/annonces";
import { formatFCFA } from "@/lib/mock-data";
import { calculerFrais, useParametres } from "@/lib/parametres";
import PropertyCard from "@/components/PropertyCard";

const champ = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-navy mt-1 font-normal bg-white";
const lib = "text-sm font-semibold text-gray-700";
const ENDETTEMENT_MAX = 33;

// Capital qu'une mensualité donnée permet d'emprunter (inverse de la formule de mensualité).
function capitalEmpruntable(mensualite: number, tauxAnnuel: number, mois: number): number {
  if (mensualite <= 0 || mois <= 0) return 0;
  const t = tauxAnnuel / 100 / 12;
  return t === 0 ? mensualite * mois : (mensualite * (1 - Math.pow(1 + t, -mois))) / t;
}

export default function BudgetPage() {
  const biens = useBiens();
  const p = useParametres();
  const [revenu, setRevenu] = useState("");
  const [charges, setCharges] = useState("");
  const [apport, setApport] = useState("");
  const [duree, setDuree] = useState("15");
  const [taux, setTaux] = useState("8");

  const nombre = (v: string) => Math.max(Number(v) || 0, 0);
  const mensualiteMax = Math.max((nombre(revenu) * ENDETTEMENT_MAX) / 100 - nombre(charges), 0);
  const capital = capitalEmpruntable(mensualiteMax, nombre(taux), Math.round(nombre(duree) * 12));
  const enveloppe = capital + nombre(apport);

  // Les frais d'acquisition dépendent du prix : on cherche le prix le plus élevé dont le total tient dans l'enveloppe.
  const prixMax = useMemo(() => {
    if (enveloppe <= 0) return 0;
    let bas = 0;
    let haut = enveloppe;
    for (let i = 0; i < 40; i++) {
      const milieu = (bas + haut) / 2;
      if (calculerFrais(milieu, p).totalAcquisition <= enveloppe) bas = milieu;
      else haut = milieu;
    }
    return Math.floor(bas / 100_000) * 100_000;
  }, [enveloppe, p]);

  const frais = calculerFrais(prixMax, p);
  const accessibles = biens.filter((b) => b.prix <= prixMax).sort((a, b) => b.prix - a.prix);
  const pret = nombre(revenu) > 0 || nombre(apport) > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <p className="eyebrow mb-2">Outil acheteur</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-navy-dark mb-2">Quel budget pour mon achat ?</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">Calculez le prix maximum que vous pouvez viser, frais de notaire et droits compris, puis voyez les biens à votre portée.</p>
      </div>

      <div className="grid lg:grid-cols-[22rem_1fr] gap-6 items-start">
        <form className="card p-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Wallet size={18} className="text-gold" /> Votre situation</h2>
          <label className={lib}>Revenu mensuel net du foyer (FCFA)<input type="number" min={0} inputMode="numeric" placeholder="Ex. : 1 200 000" value={revenu} onChange={(e) => setRevenu(e.target.value)} className={champ} /></label>
          <label className={lib}>Crédits en cours, par mois (FCFA)<input type="number" min={0} inputMode="numeric" placeholder="0" value={charges} onChange={(e) => setCharges(e.target.value)} className={champ} /></label>
          <label className={lib}>Apport personnel (FCFA)<input type="number" min={0} inputMode="numeric" placeholder="Ex. : 10 000 000" value={apport} onChange={(e) => setApport(e.target.value)} className={champ} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className={lib}>Durée (ans)<input type="number" min={1} max={30} value={duree} onChange={(e) => setDuree(e.target.value)} className={champ} /></label>
            <label className={lib}>Taux annuel (%)<input type="number" min={0} step="0.1" value={taux} onChange={(e) => setTaux(e.target.value)} className={champ} /></label>
          </div>
          <p className="text-xs text-gray-400">Hypothèses : mensualité plafonnée à {ENDETTEMENT_MAX} % du revenu, hors assurance. Le taux par défaut est indicatif ; seule votre banque peut vous faire une offre.</p>
        </form>

        <div className="flex flex-col gap-6 min-w-0">
          {!pret ? (
            <div className="card p-12 text-center text-gray-400">
              <Wallet size={36} className="mx-auto mb-3 text-navy/30" />
              Renseignez votre revenu ou votre apport pour calculer votre budget.
            </div>
          ) : (
            <>
              <div className="card p-6 md:p-8">
                <p className="text-sm text-gray-500 mb-1">Prix d&apos;achat maximum conseillé</p>
                <div className="font-display text-4xl md:text-5xl font-extrabold text-navy-dark">{formatFCFA(prixMax)}</div>
                <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mt-6 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Mensualité maximale</dt><dd className="font-semibold">{formatFCFA(Math.round(mensualiteMax))}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Montant empruntable</dt><dd className="font-semibold">{formatFCFA(Math.round(capital))}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Apport</dt><dd className="font-semibold">{formatFCFA(nombre(apport))}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Frais d&apos;acquisition estimés</dt><dd className="font-semibold">{formatFCFA(frais.totalFrais)}</dd></div>
                </dl>
                {mensualiteMax === 0 && nombre(revenu) > 0 && (
                  <p className="text-sm font-semibold mt-4 rounded-xl px-3 py-2 bg-red/10 text-red">Vos crédits en cours atteignent déjà le plafond d&apos;endettement : le budget repose sur votre seul apport.</p>
                )}
                <div className="flex gap-3 flex-wrap mt-6">
                  <Link href={`/annonces?prixMax=${prixMax}`} className={`btn-primary text-sm flex items-center gap-2 ${prixMax <= 0 ? "pointer-events-none opacity-50" : ""}`}>
                    <Search size={15} /> Voir les {accessibles.length} biens dans mon budget
                  </Link>
                  <Link href={`/frais?prix=${prixMax}`} className="border border-gray-200 bg-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-gray-50">Détail des frais</Link>
                </div>
              </div>

              {accessibles.length > 0 && (
                <div>
                  <h2 className="font-bold text-gray-900 mb-3">À votre portée</h2>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {accessibles.slice(0, 3).map((b) => <PropertyCard key={b.id} bien={b} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
