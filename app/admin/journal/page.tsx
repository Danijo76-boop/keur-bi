"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BoutonsExport } from "@/components/BoutonsExport";
import { CategorieJournal, journalComplet, LABELS_JOURNAL } from "@/lib/journal";
import { useStocke } from "@/lib/stockage";
import { exporterExcel, exporterPDF, type Tableau } from "@/lib/export";

const CATEGORIES = Object.keys(LABELS_JOURNAL) as CategorieJournal[];
const PERIODES = [
  { jours: 0, label: "Toute la période" },
  { jours: 1, label: "Dernières 24 h" },
  { jours: 7, label: "7 derniers jours" },
  { jours: 30, label: "30 derniers jours" },
];
const PAR_PAGE = 25;
const select = "border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy bg-white";

export default function JournalPage() {
  const journal = useStocke(journalComplet, []);
  const [categorie, setCategorie] = useState<CategorieJournal | "">("");
  const [jours, setJours] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [nbAffiches, setNbAffiches] = useState(PAR_PAGE);

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const depuis = jours ? Date.now() - jours * 86_400_000 : 0;
    return journal.filter((e) => {
      if (categorie && e.categorie !== categorie) return false;
      if (depuis && new Date(e.date).getTime() < depuis) return false;
      return !q || `${e.auteur} ${e.detail}`.toLowerCase().includes(q);
    });
  }, [journal, categorie, jours, recherche]);

  const tableau = (): Tableau => ({
    colonnes: ["Date", "Catégorie", "Auteur", "Action"],
    lignes: lignes.map((e) => [new Date(e.date).toLocaleString("fr-FR"), LABELS_JOURNAL[e.categorie], e.auteur, e.detail]),
  });
  const filtres = [
    categorie && `Catégorie : ${LABELS_JOURNAL[categorie as CategorieJournal]}`,
    PERIODES.find((x) => x.jours === jours && x.jours > 0)?.label,
    recherche.trim() && `Recherche : « ${recherche.trim()} »`,
  ]
    .filter(Boolean)
    .join(" · ");

  const exporterEnPDF = () =>
    exporterPDF("Journal_activite", {
      titre: "Journal d'activité",
      sousTitre: `${lignes.length} action${lignes.length > 1 ? "s" : ""}${filtres ? ` · ${filtres}` : ""}`,
      paysage: true,
      sections: [{ tableau: tableau() }],
    });
  const exporterEnExcel = () => exporterExcel("Journal_activite", tableau(), "Journal d'activité");

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-navy mb-1">Journal d&apos;activité</h1>
          <p className="text-gray-500 text-sm">{lignes.length} action(s) · tracées dans ce navigateur (démo)</p>
        </div>
        <BoutonsExport onPDF={exporterEnPDF} onExcel={exporterEnExcel} disabled={lignes.length === 0} raison="Aucune action pour ces filtres." />
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <input
          aria-label="Rechercher dans le journal"
          placeholder="Auteur, référence, action…"
          value={recherche}
          onChange={(e) => {
            setRecherche(e.target.value);
            setNbAffiches(PAR_PAGE);
          }}
          className={`${select} flex-1 min-w-[12rem]`}
        />
        <select aria-label="Filtrer par catégorie" value={categorie} onChange={(e) => setCategorie(e.target.value as CategorieJournal | "")} className={select}>
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {LABELS_JOURNAL[c]}
            </option>
          ))}
        </select>
        <select aria-label="Filtrer par période" value={jours} onChange={(e) => setJours(Number(e.target.value))} className={select}>
          {PERIODES.map((p) => (
            <option key={p.jours} value={p.jours}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
              <th scope="col" className="p-3 font-semibold">
                Date
              </th>
              <th scope="col" className="p-3 font-semibold">
                Catégorie
              </th>
              <th scope="col" className="p-3 font-semibold">
                Auteur
              </th>
              <th scope="col" className="p-3 font-semibold">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {lignes.slice(0, nbAffiches).map((e) => (
              <tr key={e.id} className="border-b border-gray-50 align-top">
                <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(e.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy/10 text-navy whitespace-nowrap">{LABELS_JOURNAL[e.categorie]}</span>
                </td>
                <td className="p-3 text-gray-600 whitespace-nowrap">{e.auteur}</td>
                <td className="p-3 text-gray-800 break-words">
                  {e.lien ? (
                    <Link href={e.lien} className="hover:text-blue hover:underline">
                      {e.detail}
                    </Link>
                  ) : (
                    e.detail
                  )}
                </td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">
                  Aucune action ne correspond.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {lignes.length > nbAffiches && (
        <div className="text-center mt-4">
          <button onClick={() => setNbAffiches((n) => n + PAR_PAGE)} className="text-sm text-blue font-medium hover:underline">
            Afficher plus ({lignes.length - nbAffiches} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
