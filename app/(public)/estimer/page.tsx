"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Home, TrendingUp } from "lucide-react";
import { useBiens } from "@/lib/annonces";
import { estimer } from "@/lib/marche";
import { Bien, formatFCFA, formatPrix } from "@/lib/mock-data";
import { commissionVente, useParametres } from "@/lib/parametres";
import PropertyCard from "@/components/PropertyCard";

const TYPES: Bien["type"][] = ["terrain", "villa", "appartement", "bureau"];
const REGIONS = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack"];
const champ = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-navy mt-1 font-normal bg-white";
const lib = "text-sm font-semibold text-gray-700";
const FIABILITE = {
  bonne: { texte: "Fiabilité bonne", classe: "bg-green/10 text-green" },
  moyenne: { texte: "Fiabilité moyenne", classe: "bg-blue/10 text-blue" },
  faible: { texte: "Fiabilité faible", classe: "bg-gold/20 text-navy-dark" },
};

export default function EstimerPage() {
  const biens = useBiens();
  const p = useParametres();
  const [type, setType] = useState<Bien["type"]>("terrain");
  const [region, setRegion] = useState("Dakar");
  const [quartier, setQuartier] = useState("");
  const [superficie, setSuperficie] = useState("");

  const quartiers = useMemo(
    () => Array.from(new Set(biens.filter((b) => b.region === region).map((b) => b.quartier))).sort(),
    [biens, region],
  );
  const surface = Number(superficie) || 0;
  const resultat = useMemo(
    () => (surface > 0 ? estimer({ type, region, quartier: quartier || undefined, superficie: surface }, biens) : null),
    [type, region, quartier, surface, biens],
  );
  const position = resultat ? ((resultat.estime - resultat.bas) / (resultat.haut - resultat.bas || 1)) * 100 : 50;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <p className="eyebrow mb-2">Outil vendeur</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-navy-dark mb-2">Combien vaut mon bien ?</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">Une estimation immédiate, calculée à partir des annonces comparables publiées sur KEUR BI.</p>
      </div>

      <div className="grid lg:grid-cols-[22rem_1fr] gap-6 items-start">
        <form className="card p-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Home size={18} className="text-gold" /> Votre bien</h2>
          <div>
            <span className={lib}>Type de bien</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={t === type}
                  onClick={() => setType(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium capitalize transition-colors ${t === type ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:border-navy"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <label className={lib}>
            Région
            <select value={region} onChange={(e) => { setRegion(e.target.value); setQuartier(""); }} className={champ}>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className={lib}>
            Quartier
            <select value={quartier} onChange={(e) => setQuartier(e.target.value)} className={champ}>
              <option value="">Autre / je ne sais pas</option>
              {quartiers.map((q) => <option key={q}>{q}</option>)}
            </select>
          </label>
          <label className={lib}>
            Superficie (m²)
            <input type="number" min={1} inputMode="numeric" placeholder="Ex. : 300" value={superficie} onChange={(e) => setSuperficie(e.target.value)} className={champ} />
          </label>
          <p className="text-xs text-gray-400">Aucune donnée n&apos;est enregistrée : le calcul se fait dans votre navigateur.</p>
        </form>

        <div className="flex flex-col gap-6 min-w-0">
          {surface <= 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <Calculator size={36} className="mx-auto mb-3 text-navy/30" />
              Renseignez la superficie pour obtenir une estimation.
            </div>
          ) : !resultat ? (
            <div className="card p-12 text-center text-gray-500">
              <p className="font-semibold text-gray-700 mb-1">Pas assez d&apos;annonces comparables</p>
              <p className="text-sm">Nous n&apos;avons pas encore assez de biens de ce type pour estimer le vôtre. Un notaire partenaire peut vous orienter.</p>
              <Link href="/notaires" className="text-blue text-sm font-medium hover:underline mt-3 inline-block">Trouver un notaire →</Link>
            </div>
          ) : (
            <>
              <div className="card p-6 md:p-8">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                  <p className="text-sm text-gray-500">Valeur estimée</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${FIABILITE[resultat.fiabilite].classe}`}>{FIABILITE[resultat.fiabilite].texte}</span>
                </div>
                <div className="font-display text-4xl md:text-5xl font-extrabold text-navy-dark">{formatFCFA(resultat.estime)}</div>
                <div className="mt-6">
                  <div className="relative h-2.5 rounded-full bg-gradient-to-r from-blue/30 via-gold to-blue/30">
                    <span className="absolute -top-1 w-[18px] h-[18px] rounded-full bg-navy-dark border-[3px] border-white shadow -translate-x-1/2" style={{ left: `${position}%` }} />
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span><span className="text-gray-400 text-xs block">Fourchette basse</span><span className="font-semibold text-gray-800">{formatPrix(resultat.bas)}</span></span>
                    <span className="text-right"><span className="text-gray-400 text-xs block">Fourchette haute</span><span className="font-semibold text-gray-800">{formatPrix(resultat.haut)}</span></span>
                  </div>
                </div>
                <dl className="grid sm:grid-cols-3 gap-3 mt-6 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <dt className="text-xs text-gray-400">Prix médian au m²</dt>
                    <dd className="font-semibold text-gray-800">{formatFCFA(resultat.medianeM2)}</dd>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <dt className="text-xs text-gray-400">Périmètre comparé</dt>
                    <dd className="font-semibold text-gray-800 first-letter:uppercase">{resultat.perimetre}</dd>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <dt className="text-xs text-gray-400">Net vendeur estimé</dt>
                    <dd className="font-semibold text-gray-800">{formatFCFA(resultat.estime - commissionVente(resultat.estime, p))}</dd>
                  </div>
                </dl>
                <p className="text-xs text-gray-400 mt-4">
                  Estimation indicative fondée sur les prix affichés, pas sur des ventes conclues. L&apos;emplacement précis, l&apos;état du bien et la situation du Titre Foncier peuvent la faire varier. Elle ne remplace pas l&apos;avis d&apos;un professionnel.
                </p>
                <div className="flex gap-3 flex-wrap mt-5">
                  <Link href="/publier" className="btn-primary text-sm">Publier mon bien</Link>
                  <Link href="/frais" className="border border-gray-200 bg-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 flex items-center gap-2"><TrendingUp size={15} /> Simuler les frais de vente</Link>
                </div>
              </div>

              <div>
                <h2 className="font-bold text-gray-900 mb-3">Annonces comparables</h2>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {resultat.comparables.map((b) => <PropertyCard key={b.id} bien={b} />)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
