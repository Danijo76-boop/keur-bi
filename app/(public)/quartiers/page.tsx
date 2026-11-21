"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { useBiens } from "@/lib/annonces";
import { mediane } from "@/lib/marche";
import { formatFCFA, formatPrix, enVente } from "@/lib/mock-data";
import { useStocke } from "@/lib/stockage";
import { estVerifie, lireOverridesTF } from "@/lib/tf";

const TRIS = [
  { id: "annonces", label: "Plus d'annonces" },
  { id: "moins_cher", label: "Prix au m² croissant" },
  { id: "plus_cher", label: "Prix au m² décroissant" },
] as const;

export default function QuartiersPage() {
  // Statistiques de prix : ventes seulement, un loyer fausserait les moyennes.
  const biens = useBiens().filter(enVente);
  const overrides = useStocke(lireOverridesTF, []);
  const [region, setRegion] = useState("");
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<(typeof TRIS)[number]["id"]>("annonces");

  const regions = useMemo(() => Array.from(new Set(biens.map((b) => b.region))).sort(), [biens]);

  // Une fiche par quartier, calculée à partir des annonces en ligne.
  const quartiers = useMemo(() => {
    const groupes = new Map<string, typeof biens>();
    for (const b of biens) {
      const cle = `${b.region}|${b.quartier}`;
      groupes.set(cle, [...(groupes.get(cle) ?? []), b]);
    }
    return Array.from(groupes.entries()).map(([cle, lot]) => {
      const [reg, nom] = cle.split("|");
      return {
        cle,
        nom,
        region: reg,
        ville: lot[0].ville,
        nb: lot.length,
        medianeM2: mediane(lot.map((b) => b.prix / b.superficie)),
        prixMin: Math.min(...lot.map((b) => b.prix)),
        types: Array.from(new Set(lot.map((b) => b.type))),
        tfVerifies: lot.filter((b) => estVerifie(b, overrides)).length,
        photo: lot[0].photo,
      };
    });
  }, [biens, overrides]);

  const visibles = quartiers
    .filter((q) => (!region || q.region === region) && (!recherche.trim() || `${q.nom} ${q.ville}`.toLowerCase().includes(recherche.trim().toLowerCase())))
    .sort((a, b) => (tri === "annonces" ? b.nb - a.nb : tri === "moins_cher" ? a.medianeM2 - b.medianeM2 : b.medianeM2 - a.medianeM2));

  const select = "border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-navy bg-white";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <p className="eyebrow mb-2">Guide des quartiers</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-navy-dark mb-2">Où acheter au Sénégal ?</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">Comparez les quartiers : prix au m², nombre d&apos;annonces et part de Titres Fonciers vérifiés.</p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        <label className="flex items-center gap-2 flex-1 min-w-[12rem] border border-gray-200 rounded-xl px-3 bg-white">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input aria-label="Rechercher un quartier" placeholder="Rechercher un quartier ou une ville…" value={recherche} onChange={(e) => setRecherche(e.target.value)} className="w-full py-2.5 text-sm outline-none !shadow-none !bg-transparent" />
        </label>
        <select aria-label="Filtrer par région" value={region} onChange={(e) => setRegion(e.target.value)} className={select}>
          <option value="">Toutes les régions</option>
          {regions.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select aria-label="Trier" value={tri} onChange={(e) => setTri(e.target.value as typeof tri)} className={select}>
          {TRIS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {visibles.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">Aucun quartier ne correspond.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibles.map((q) => (
            <Link key={q.cle} href={`/annonces?region=${encodeURIComponent(q.region)}&quartier=${encodeURIComponent(q.nom)}`} className="card card-hover group flex flex-col">
              <div className="relative h-36 bg-gradient-to-br from-navy to-navy-dark overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {!q.photo.startsWith("data:") && <img src={q.photo} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/90 via-navy-dark/30 to-transparent" />
                <div className="absolute left-4 bottom-3 text-white">
                  <h2 className="font-bold text-lg leading-tight">{q.nom}</h2>
                  <p className="text-xs text-white/75 flex items-center gap-1"><MapPin size={11} className="text-gold" /> {q.ville} · {q.region}</p>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-gray-400">Prix médian au m²</dt>
                    <dd className="font-bold text-navy-dark">{formatFCFA(q.medianeM2)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">À partir de</dt>
                    <dd className="font-bold text-navy-dark">{formatPrix(q.prixMin)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Annonces</dt>
                    <dd className="font-semibold text-gray-800">{q.nb}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">TF vérifiés</dt>
                    <dd className="font-semibold text-gray-800">{q.tfVerifies} sur {q.nb}</dd>
                  </div>
                </dl>
                <div className="flex gap-1.5 flex-wrap mt-4">
                  {q.types.map((t) => <span key={t} className="text-xs capitalize bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">{t}</span>)}
                </div>
                <span className="text-sm text-navy font-semibold mt-4">Voir les annonces →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 text-center mt-8">Chiffres calculés sur les annonces en ligne. Avec peu d&apos;annonces dans un quartier, la médiane reste un simple repère.</p>
    </div>
  );
}
