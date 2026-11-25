"use client";
import { popup } from "@/lib/popup";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, Map, BellPlus, Link2, ChevronDown, Columns2 } from "@/components/icones";
import { Bien } from "@/lib/mock-data";
import PropertyCard from "@/components/PropertyCard";
import EncartSponsorise from "@/components/EncartSponsorise";
import { lireOverridesTF, lireDemandesTF, statutTF, StatutTF, LABELS_TF } from "@/lib/tf";
import { useBiens } from "@/lib/annonces";
import { useStocke } from "@/lib/stockage";
import { useAuth } from "@/lib/auth";
import ChampRecherche from "@/components/ChampRecherche";
import { correspond, texteRecherche } from "@/lib/recherche";
import { useExigeCompte } from "@/lib/exige-compte";
import { useParametres } from "@/lib/parametres";
import { creerAlerte, CriteresAlerte, resumeCriteres } from "@/lib/preferences";
import { IconeTF } from "@/components/Statut";
import { IconeStatut } from "@/components/Statut";

// Leaflet a besoin de window : la carte n'est rendue que côté navigateur.
const CarteLeaflet = dynamic(() => import("@/components/CarteLeaflet"), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-gray-400 text-sm">Chargement de la carte…</div>,
});

const TYPES = ["Tous", "Terrain", "Villa", "Appartement", "Bureau"];
const REGIONS_OPTIONS = ["Toutes les régions", "Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack"];
const TRIS = [
  { value: "recent", label: "Trier : Plus récents" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
  { value: "superficie", label: "Superficie" },
  { value: "prix-m2", label: "Prix / m²" },
];
const STATUTS_TF: StatutTF[] = ["verifie", "en_verification", "non_verifie", "invalide"];
const PAR_PAGE = 6;

// Les filtres vivent dans l'URL : une recherche se partage, se met en favori et se rouvre depuis une alerte.
function filtresDepuis(sp: URLSearchParams) {
  const nombre = (cle: string) => (/^\d+$/.test(sp.get(cle) ?? "") ? (sp.get(cle) as string) : "");
  const region = sp.get("region") ?? "";
  const tri = sp.get("tri") ?? "";
  return {
    type: TYPES.find((x) => x.toLowerCase() === sp.get("type")?.toLowerCase()) ?? "Tous",
    region: REGIONS_OPTIONS.includes(region) ? region : "Toutes les régions",
    quartier: sp.get("quartier") ?? "",
    recherche: sp.get("q") ?? "",
    prixMin: nombre("prixMin"),
    prixMax: nombre("prixMax"),
    superficieMin: nombre("supMin"),
    superficieMax: nombre("supMax"),
    statutsTF: (sp.get("tf") ?? "").split(",").filter((s): s is StatutTF => STATUTS_TF.includes(s as StatutTF)),
    featured: sp.get("vedette") === "1",
    baisse: sp.get("baisse") === "1",
    tri: TRIS.some((t) => t.value === tri) ? tri : "recent",
    transaction: sp.get("transaction") === "location" ? ("location" as const) : ("vente" as const),
    avecCarte: sp.get("vue") === "carte",
  };
}

export default function AnnoncesContent() {
  const searchParams = useSearchParams();
  const [init] = useState(() => filtresDepuis(searchParams));
  const urlConnue = useRef(searchParams.toString());

  const [transaction, setTransaction] = useState<"vente" | "location">(init.transaction);
  const [type, setType] = useState(init.type);
  // Vue « liste + carte » : les résultats et leur carte côte à côte.
  const [avecCarte, setAvecCarte] = useState(init.avecCarte);
  const [selection, setSelection] = useState<string | null>(null);
  const selectionner = useCallback((id: string) => setSelection(id), []);
  const [region, setRegion] = useState(init.region);
  const [quartier, setQuartier] = useState(init.quartier);
  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState(init.recherche);
  const [prixMin, setPrixMin] = useState(init.prixMin);
  const [prixMax, setPrixMax] = useState(init.prixMax);
  const [superficieMin, setSuperficieMin] = useState(init.superficieMin);
  const [superficieMax, setSuperficieMax] = useState(init.superficieMax);
  const [statutsTF, setStatutsTF] = useState<StatutTF[]>(init.statutsTF);
  const [featured, setFeatured] = useState(init.featured);
  const [baisse, setBaisse] = useState(init.baisse);
  const [tri, setTri] = useState(init.tri);
  const [alerteCreee, setAlerteCreee] = useState(false);
  const [lienCopie, setLienCopie] = useState(false);
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  // Navigation vers une autre recherche sans quitter la page (menu, alerte, bouton retour) : on réapplique l'URL.
  const parametres = searchParams.toString();
  useEffect(() => {
    if (parametres === urlConnue.current) return;
    urlConnue.current = parametres;
    const f = filtresDepuis(new URLSearchParams(parametres));
    setType(f.type);
    setRegion(f.region);
    setQuartier(f.quartier);
    setRecherche(f.recherche);
    setPrixMin(f.prixMin);
    setPrixMax(f.prixMax);
    setSuperficieMin(f.superficieMin);
    setSuperficieMax(f.superficieMax);
    setStatutsTF(f.statutsTF);
    setFeatured(f.featured);
    setBaisse(f.baisse);
    setTri(f.tri);
  }, [parametres]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (recherche.trim()) p.set("q", recherche.trim());
    if (transaction === "location") p.set("transaction", "location");
    if (type !== "Tous") p.set("type", type.toLowerCase());
    if (region !== "Toutes les régions") p.set("region", region);
    if (quartier) p.set("quartier", quartier);
    if (prixMin) p.set("prixMin", prixMin);
    if (prixMax) p.set("prixMax", prixMax);
    if (superficieMin) p.set("supMin", superficieMin);
    if (superficieMax) p.set("supMax", superficieMax);
    if (statutsTF.length > 0) p.set("tf", statutsTF.join(","));
    if (featured) p.set("vedette", "1");
    if (baisse) p.set("baisse", "1");
    if (tri !== "recent") p.set("tri", tri);
    if (avecCarte) p.set("vue", "carte");
    const qs = p.toString();
    if (qs === urlConnue.current) return;
    urlConnue.current = qs;
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    setAlerteCreee(false);
    setLienCopie(false);
  }, [transaction, type, region, quartier, recherche, prixMin, prixMax, superficieMin, superficieMax, statutsTF, featured, baisse, tri, avecCarte]);

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLienCopie(true);
      popup.succes("Lien copié", "Vous pouvez le coller où vous voulez.");
    } catch {
      /* presse-papiers indisponible : l'URL reste dans la barre d'adresse */
    }
  }
  const biens = useBiens();
  const { user } = useAuth();
  const exigeCompte = useExigeCompte();
  const { flags } = useParametres();
  const overridesTF = useStocke(lireOverridesTF, []);
  const demandesTF = useStocke(lireDemandesTF, []);

  const resultats = useMemo(() => {
    let r = biens.filter((b) => {
      if ((b.transaction ?? "vente") !== transaction) return false;
      if (type !== "Tous" && b.type !== type.toLowerCase()) return false;
      if (region !== "Toutes les régions" && b.region !== region) return false;
      if (quartier && b.quartier !== quartier) return false;
      if (prixMin && b.prix < Number(prixMin)) return false;
      if (prixMax && b.prix > Number(prixMax)) return false;
      if (superficieMin && b.superficie < Number(superficieMin)) return false;
      if (superficieMax && b.superficie > Number(superficieMax)) return false;
      if (statutsTF.length > 0 && !statutsTF.includes(statutTF(b, overridesTF, demandesTF))) return false;
      if (featured && !b.is_featured) return false;
      if (baisse && !b.prix_baisser) return false;
      if (recherche.trim() && !correspond(texteRecherche(b), recherche)) return false;
      return true;
    });

    const sorters: Record<string, (a: Bien, b: Bien) => number> = {
      "prix-asc": (a, b) => a.prix - b.prix,
      "prix-desc": (a, b) => b.prix - a.prix,
      superficie: (a, b) => b.superficie - a.superficie,
      "prix-m2": (a, b) => a.prix / a.superficie - b.prix / b.superficie,
    };
    if (sorters[tri]) r = [...r].sort(sorters[tri]);
    return r;
  }, [
    biens,
    transaction,
    type,
    region,
    quartier,
    recherche,
    prixMin,
    prixMax,
    superficieMin,
    superficieMax,
    statutsTF,
    featured,
    baisse,
    tri,
    overridesTF,
    demandesTF,
  ]);

  const quartiers = useMemo(
    () => Array.from(new Set(biens.filter((b) => region === "Toutes les régions" || b.region === region).map((b) => b.quartier))).sort(),
    [biens, region],
  );
  const nbFiltresActifs =
    [type !== "Tous", region !== "Toutes les régions", !!quartier, !!prixMin || !!prixMax, !!superficieMin || !!superficieMax, featured, baisse].filter(Boolean)
      .length + statutsTF.length;
  const nbPages = Math.max(Math.ceil(resultats.length / PAR_PAGE), 1);
  const pageCourante = Math.min(page, nbPages);
  const affiches = resultats.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  useEffect(() => {
    setPage(1);
  }, [resultats]);

  function basculerStatut(s: StatutTF) {
    setStatutsTF((actuels) => (actuels.includes(s) ? actuels.filter((x) => x !== s) : [...actuels, s]));
  }

  function enregistrerRecherche() {
    if (!user) return;
    const criteres: CriteresAlerte = {
      transaction: transaction === "location" ? "location" : undefined,
      q: recherche.trim() || undefined,
      type: type !== "Tous" ? type.toLowerCase() : undefined,
      region: region !== "Toutes les régions" ? region : undefined,
      prixMax: prixMax ? Number(prixMax) : undefined,
      superficieMin: superficieMin ? Number(superficieMin) : undefined,
      superficieMax: superficieMax ? Number(superficieMax) : undefined,
      tfVerifie: statutsTF.length === 1 && statutsTF[0] === "verifie" ? true : undefined,
    };
    creerAlerte(user.email, resumeCriteres(criteres), criteres);
    setAlerteCreee(true);
  }

  function reinitialiser() {
    setType("Tous");
    setRegion("Toutes les régions");
    setRecherche("");
    setPrixMin("");
    setPrixMax("");
    setSuperficieMin("");
    setSuperficieMax("");
    setStatutsTF([]);
    setQuartier("");
    setFeatured(false);
    setBaisse(false);
    setTri("recent");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="titre-page">Annonces immobilières</h1>
          <p className="text-gray-500 text-sm">{resultats.length} résultats trouvés</p>
        </div>
        <div className="flex gap-2">
          <ChampRecherche
            valeur={recherche}
            onChange={setRecherche}
            transaction={transaction}
            ariaLabel="Rechercher une annonce"
            placeholder="Rechercher par ville, quartier…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy w-56"
          />
          {flags.carte && (
            <Link href="/carte" className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50">
              <Map size={16} /> Carte
            </Link>
          )}
          {flags.carte && (
            <button
              type="button"
              aria-pressed={avecCarte}
              onClick={() => setAvecCarte((v) => !v)}
              className={`hidden lg:flex items-center gap-2 border rounded-lg px-4 py-2 text-sm font-medium ${avecCarte ? "bg-navy text-white border-navy" : "border-gray-200 bg-white hover:bg-gray-50"}`}
            >
              <Columns2 size={16} /> Liste + carte
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filtres */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="card p-5 lg:sticky lg:top-20">
            {/* Sur téléphone, les filtres sont repliés pour que les annonces apparaissent tout de suite. */}
            <button
              type="button"
              aria-expanded={filtresOuverts}
              onClick={() => setFiltresOuverts((o) => !o)}
              className="w-full flex items-center justify-between lg:pointer-events-none"
            >
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal size={16} /> Filtres
                {nbFiltresActifs > 0 && <span className="bg-gold text-navy-dark text-xs font-bold rounded-full px-2 py-0.5">{nbFiltresActifs}</span>}
              </h3>
              <ChevronDown size={18} className={`text-gray-400 lg:hidden transition-transform ${filtresOuverts ? "rotate-180" : ""}`} />
            </button>
            <div className={`mt-4 ${filtresOuverts ? "" : "hidden"} lg:block`}>
              {/* Acheter ou louer */}
              <div className="mb-5">
                <span className="text-sm font-semibold text-gray-700 block mb-2">Je souhaite</span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["vente", "Acheter"],
                      ["location", "Louer"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      aria-pressed={transaction === val}
                      onClick={() => {
                        setTransaction(val);
                        if (val === "location") setStatutsTF([]);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        transaction === val ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type de bien */}
              <div className="mb-5">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Type de bien</label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        t === type ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Région */}
              <div className="mb-5">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Région</label>
                <select
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setQuartier("");
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-navy"
                >
                  {REGIONS_OPTIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Quartier */}
              <div className="mb-5">
                <label htmlFor="filtre-quartier" className="text-sm font-semibold text-gray-700 block mb-2">
                  Quartier
                </label>
                <select
                  id="filtre-quartier"
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-navy"
                >
                  <option value="">Tous les quartiers</option>
                  {quartiers.map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              </div>

              {/* Prix */}
              <div className="mb-5">
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  {transaction === "location" ? "Loyer mensuel (FCFA)" : "Budget (FCFA)"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={prixMin}
                    onChange={(e) => setPrixMin(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={prixMax}
                    onChange={(e) => setPrixMax(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                </div>
              </div>

              {/* Superficie */}
              <div className="mb-5">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Superficie (m²)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={superficieMin}
                    onChange={(e) => setSuperficieMin(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={superficieMax}
                    onChange={(e) => setSuperficieMax(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="mb-5 flex flex-col gap-2">
                {/* Le Titre Foncier ne concerne que les ventes. */}
                {transaction === "vente" && <span className="text-sm font-semibold text-gray-700">Statut du Titre Foncier</span>}
                {transaction === "vente" &&
                  STATUTS_TF.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" className="rounded accent-navy" checked={statutsTF.includes(s)} onChange={() => basculerStatut(s)} />
                      <IconeTF statut={s} /> {LABELS_TF[s]}
                    </label>
                  ))}
                <span className="text-sm font-semibold text-gray-700 mt-2">Options</span>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded accent-navy" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                  Annonces en vedette
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded accent-navy" checked={baisse} onChange={(e) => setBaisse(e.target.checked)} />
                  Prix en baisse
                </label>
              </div>

              <button onClick={reinitialiser} className="w-full btn-navy text-sm">
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        </aside>

        {/* Grille annonces */}
        <div className="flex-1 min-w-0">
          {/* Tri */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-500">{resultats.length} annonces</span>
              {alerteCreee ? (
                <Link href="/notifications" className="text-sm text-green font-medium hover:underline">
                  <IconeStatut type="ok" />
                  Alerte créée, voir mes alertes
                </Link>
              ) : user ? (
                <button onClick={enregistrerRecherche} className="flex items-center gap-1 text-sm text-blue font-medium hover:underline">
                  <BellPlus size={14} /> Enregistrer cette recherche
                </button>
              ) : (
                <button onClick={() => exigeCompte()} className="flex items-center gap-1 text-sm text-blue font-medium hover:underline">
                  <BellPlus size={14} /> Connectez-vous pour créer une alerte
                </button>
              )}
              <button onClick={copierLien} className="flex items-center gap-1 text-sm text-blue font-medium hover:underline">
                <Link2 size={14} /> {lienCopie ? "Lien copié" : "Copier le lien de la recherche"}
              </button>
            </div>
            <select
              value={tri}
              onChange={(e) => setTri(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none"
            >
              {TRIS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {resultats.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <p>Aucune annonce ne correspond à ces critères.</p>
              <button onClick={reinitialiser} className="text-blue text-sm mt-2 hover:underline">
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <>
              <div className={`grid gap-5 ${avecCarte && flags.carte ? "sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
                {affiches.map((b, i) => (
                  <Fragment key={b.id}>
                    {/* Un encart partenaire après la troisième annonce, signalé comme sponsorisé. */}
                    {i === 3 && <EncartSponsorise emplacement="recherche" />}
                    <div id={`annonce-${b.id}`} onMouseEnter={() => avecCarte && setSelection(b.id)}>
                      <PropertyCard bien={b} className={avecCarte && selection === b.id ? "ring-2 ring-gold" : undefined} />
                    </div>
                  </Fragment>
                ))}
              </div>
              {nbPages > 1 && (
                <nav className="flex justify-center gap-1 mt-6" aria-label="Pagination">
                  {Array.from({ length: nbPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      aria-current={n === pageCourante ? "page" : undefined}
                      onClick={() => setPage(n)}
                      className={`w-9 h-9 rounded-lg text-sm font-semibold ${n === pageCourante ? "bg-navy text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      {n}
                    </button>
                  ))}
                </nav>
              )}
            </>
          )}
        </div>

        {avecCarte && flags.carte && (
          <div className="hidden lg:block lg:w-[26rem] shrink-0">
            <div className="card overflow-hidden lg:sticky lg:top-20 h-[calc(100vh-7rem)]">
              <CarteLeaflet biens={resultats} selection={selection} onSelection={selectionner} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
