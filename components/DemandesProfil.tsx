"use client";
import { useCallback, useEffect, useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/auth";
import { estProfilDemandable, PROFILS } from "@/lib/profils";

/* ── Demandes de profil professionnel (administration) ──
   Chaque personne qui s'inscrit comme vendeur, agence, agent, notaire ou clerc apparaît ici avec les informations
   obligatoires saisies. L'administrateur vérifie (NINEA, RCCM, Chambre des notaires…), puis accepte ou refuse. */

type Demande = {
  id: string;
  role: Role;
  infos: Record<string, string>;
  statut: "en_attente" | "acceptee" | "refusee";
  motifRefus: string | null;
  creeLe: string;
  utilisateur: { nom: string; email: string; telephone: string | null; role: Role };
};

const STATUTS = { en_attente: "En attente", acceptee: "Acceptée", refusee: "Refusée" };

export default function DemandesProfil() {
  const [demandes, setDemandes] = useState<Demande[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [voirTraitees, setVoirTraitees] = useState(false);

  const charger = useCallback(async () => {
    const r = await fetch("/api/admin/demandes-profil", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErreur(d.erreur ?? "Liste indisponible.");
    setDemandes(d.demandes);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function decider(id: string, decision: "accepter" | "refuser") {
    setEnCours(id);
    setErreur("");
    const r = await fetch("/api/admin/demandes-profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision, motif: motifs[id] }),
    });
    const d = await r.json().catch(() => ({}));
    setEnCours(null);
    if (!r.ok) return setErreur(d.erreur ?? "Action impossible.");
    await charger();
  }

  if (!demandes) return erreur ? <p className="text-sm text-red mb-6">{erreur}</p> : null;
  const enAttente = demandes.filter((d) => d.statut === "en_attente");
  const affichees = voirTraitees ? demandes : enAttente;

  return (
    <section className="card p-5 mb-6" aria-labelledby="titre-demandes">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 id="titre-demandes" className="font-bold text-gray-900">
          Demandes de profil {enAttente.length > 0 && <span className="ml-1 text-xs bg-gold text-navy-dark rounded-full px-2 py-0.5">{enAttente.length}</span>}
        </h2>
        {demandes.length > enAttente.length && (
          <button type="button" onClick={() => setVoirTraitees((v) => !v)} className="text-sm text-blue hover:underline">
            {voirTraitees ? "Masquer les demandes traitées" : "Voir aussi les demandes traitées"}
          </button>
        )}
      </div>
      {erreur && <p className="text-sm text-red mb-3">{erreur}</p>}
      {affichees.length === 0 && <p className="text-sm text-gray-500">Aucune demande en attente.</p>}
      <div className="flex flex-col gap-3">
        {affichees.map((d) => {
          const champs = estProfilDemandable(d.role) ? PROFILS[d.role].champs : [];
          return (
            <article key={d.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-gray-900">{d.utilisateur.nom}</div>
                  <div className="text-xs text-gray-500">
                    {d.utilisateur.email}
                    {d.utilisateur.telephone ? ` · ${d.utilisateur.telephone}` : ""} · le {new Date(d.creeLe).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <span className="text-xs font-semibold bg-navy/10 text-navy rounded-full px-2.5 py-1">
                  {ROLE_LABELS[d.role]} · {STATUTS[d.statut]}
                </span>
              </div>
              <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-3 text-sm">
                {champs.map((c) => (
                  <div key={c.cle}>
                    <dt className="text-xs text-gray-500">{c.libelle}</dt>
                    <dd className="font-medium text-gray-800 break-words">{d.infos?.[c.cle] || "—"}</dd>
                  </div>
                ))}
              </dl>
              {d.statut === "refusee" && d.motifRefus && <p className="text-xs text-gray-500 mt-2">Motif du refus : {d.motifRefus}</p>}
              {d.statut === "en_attente" && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    type="button"
                    disabled={enCours === d.id}
                    onClick={() => decider(d.id, "accepter")}
                    className="btn-navy text-sm px-3 py-2 disabled:opacity-50"
                  >
                    Accepter : passer en {ROLE_LABELS[d.role]}
                  </button>
                  <input
                    value={motifs[d.id] ?? ""}
                    onChange={(e) => setMotifs((m) => ({ ...m, [d.id]: e.target.value }))}
                    placeholder="Motif du refus (ex. NINEA introuvable)"
                    aria-label={`Motif du refus pour ${d.utilisateur.nom}`}
                    className="flex-1 min-w-[12rem] border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                  <button
                    type="button"
                    disabled={enCours === d.id || (motifs[d.id] ?? "").trim().length < 5}
                    onClick={() => decider(d.id, "refuser")}
                    className="border border-red text-red rounded-lg px-3 py-2 text-sm font-semibold hover:bg-red/5 disabled:opacity-40"
                  >
                    Refuser
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
