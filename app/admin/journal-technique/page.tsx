"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type Entree = {
  id: string;
  date: string;
  niveau: string;
  categorie: string | null;
  message: string;
  details: unknown;
  requeteId: string | null;
  route: string | null;
  utilisateurId: string | null;
};

const NIVEAUX = [
  { val: "", label: "Tout" },
  { val: "erreur", label: "Erreurs" },
  { val: "warn", label: "Avertissements" },
  { val: "audit", label: "Actions d'administration" },
];

const COULEUR: Record<string, string> = { erreur: "bg-red/10 text-red", warn: "bg-gold/15 text-navy-dark", info: "bg-gray-100 text-gray-600" };
const champ = "border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy bg-white";

// Journal technique : erreurs du serveur et des navigateurs, avertissements et actions d'administration.
// Sert à diagnostiquer un bug signalé à partir de son code ou de sa référence.
export default function JournalTechniquePage() {
  const [filtre, setFiltre] = useState("");
  const [recherche, setRecherche] = useState("");
  const [entrees, setEntrees] = useState<Entree[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [ouverte, setOuverte] = useState<string>();

  const charger = useCallback(async () => {
    const p = new URLSearchParams();
    if (filtre === "audit") p.set("categorie", "audit");
    else if (filtre) p.set("niveau", filtre);
    const q = recherche.trim();
    if (/^[0-9a-f]{8}/i.test(q) && !q.includes(" ")) p.set("requete", q.toLowerCase());
    else if (q) p.set("q", q);
    try {
      const r = await fetch(`/api/admin/journal?${p}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erreur ?? "Chargement impossible.");
      setEntrees(d.entrees);
      setErreur("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [filtre, recherche]);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <div>
      <h1 className="titre-page mb-1">Journal technique</h1>
      <p className="text-gray-500 text-sm mb-5">
        Erreurs, avertissements et actions d&apos;administration. Pour retrouver un bug signalé, saisissez son code ou sa référence.
      </p>

      <div className="flex gap-2 flex-wrap mb-4">
        <select aria-label="Type d'entrée" value={filtre} onChange={(e) => setFiltre(e.target.value)} className={champ}>
          {NIVEAUX.map((n) => (
            <option key={n.val} value={n.val}>
              {n.label}
            </option>
          ))}
        </select>
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && charger()}
          placeholder="Code, référence, message ou route…"
          className={`${champ} flex-1 min-w-[14rem]`}
        />
        <button onClick={charger} className="btn-navy text-sm px-3 py-2 flex items-center gap-1">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {erreur && (
        <p role="alert" className="text-red text-sm mb-3">
          {erreur}
        </p>
      )}
      {!entrees && !erreur && <p className="text-gray-400 text-sm">Chargement…</p>}
      {entrees?.length === 0 && <div className="card p-8 text-center text-gray-400">Aucune entrée.</div>}

      {!!entrees?.length && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th scope="col" className="p-3 font-semibold">
                  Date
                </th>
                <th scope="col" className="p-3 font-semibold">
                  Type
                </th>
                <th scope="col" className="p-3 font-semibold">
                  Message
                </th>
                <th scope="col" className="p-3 font-semibold">
                  Route
                </th>
                <th scope="col" className="p-3 font-semibold">
                  Référence
                </th>
              </tr>
            </thead>
            <tbody>
              {entrees.map((e) => {
                const details = e.details as { code?: string } | null;
                return (
                  <Fragment key={e.id}>
                    <tr onClick={() => setOuverte(ouverte === e.id ? undefined : e.id)} className="border-b border-gray-50 cursor-pointer hover:bg-gray-50">
                      <td className="p-3 whitespace-nowrap text-gray-500">{new Date(e.date).toLocaleString("fr-FR")}</td>
                      <td className="p-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${COULEUR[e.niveau] ?? COULEUR.info}`}>
                          {e.categorie === "audit" ? "Action admin" : e.niveau === "erreur" ? "Erreur" : e.niveau === "warn" ? "Avertissement" : "Info"}
                        </span>
                      </td>
                      <td className="p-3 text-gray-800">
                        {e.message}
                        {details?.code && <span className="text-gray-400"> · code {details.code}</span>}
                      </td>
                      <td className="p-3 text-gray-500 whitespace-nowrap">{e.route ?? "—"}</td>
                      <td className="p-3 font-mono text-xs text-gray-500">{e.requeteId?.slice(0, 8) ?? "—"}</td>
                    </tr>
                    {ouverte === e.id && (
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <td colSpan={5} className="p-3">
                          <pre className="text-xs whitespace-pre-wrap break-all text-gray-700">
                            {JSON.stringify({ requete: e.requeteId, utilisateur: e.utilisateurId, details: e.details }, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
