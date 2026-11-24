"use client";
import Link from "next/link";
import { basculerPublication, useBiens, useMetasAnnonces } from "@/lib/annonces";
import { formatFCFA } from "@/lib/mock-data";
import { lireSignalements, traiterSignalements } from "@/lib/moderation";
import { journaliser } from "@/lib/journal";
import { useStocke } from "@/lib/stockage";
import { lireDemandesTF, statutTF, lireOverridesTF, LABELS_TF } from "@/lib/tf";
import { IconeTF } from "@/components/Statut";

export default function ModerationPage() {
  const biens = useBiens(true);
  const metas = useMetasAnnonces();
  const signalements = useStocke(lireSignalements, []);
  const overrides = useStocke(lireOverridesTF, []);
  const demandes = useStocke(lireDemandesTF, []);

  const ouverts = signalements.filter((s) => s.statut === "ouvert");
  const traites = signalements.filter((s) => s.statut !== "ouvert").slice(0, 10);
  const parBien = Array.from(new Set(ouverts.map((s) => s.bienId))).map((id) => ({
    id,
    bien: biens.find((b) => b.id === id),
    liste: ouverts.filter((s) => s.bienId === id),
  }));
  const nouvelles = biens.filter((b) => b.publieLe).slice(0, 10);

  const titre = (id: string) => biens.find((b) => b.id === id)?.titre ?? "Annonce";

  function retirer(id: string) {
    if (!metas[id]?.depublie) basculerPublication(id);
    traiterSignalements(id, "retire");
    journaliser("moderation", `Annonce retirée après signalement : ${titre(id)}`, "/admin/moderation");
  }

  function classer(id: string) {
    traiterSignalements(id, "classe");
    journaliser("moderation", `Signalement classé sans suite : ${titre(id)}`, "/admin/moderation");
  }

  function basculer(id: string) {
    journaliser("moderation", `Annonce ${metas[id]?.depublie ? "republiée" : "retirée"} : ${titre(id)}`, "/admin/moderation");
    basculerPublication(id);
  }

  return (
    <div>
      <h1 className="titre-page mb-1">Modération</h1>
      <p className="text-gray-500 text-sm mb-6">{ouverts.length} signalement(s) à traiter</p>

      <section className="mb-8">
        <h2 className="font-bold text-gray-900 mb-3">Annonces signalées</h2>
        {parBien.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Aucun signalement en attente.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {parBien.map(({ id, bien, liste }) => (
              <div key={id} className="card p-4 border-l-4 border-red">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="min-w-0">
                    <Link href={`/annonces/${id}`} className="font-semibold text-sm text-gray-900 hover:text-navy">
                      {bien?.titre ?? "Annonce supprimée"}
                    </Link>
                    {bien && (
                      <div className="text-xs text-gray-400">
                        {bien.reference} · {bien.agence} · {formatFCFA(bien.prix)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => retirer(id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red text-white">
                      Retirer l&apos;annonce
                    </button>
                    <button
                      onClick={() => classer(id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Classer sans suite
                    </button>
                  </div>
                </div>
                <ul className="flex flex-col gap-1 text-sm">
                  {liste.map((s) => (
                    <li key={s.id} className="text-gray-600 break-words">
                      <strong className="text-gray-800">{s.motif}</strong>
                      {s.detail && ` : ${s.detail}`}
                      <span className="text-xs text-gray-400">
                        {" "}
                        · {s.auteurEmail} · {new Date(s.date).toLocaleDateString("fr-FR")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-gray-900 mb-3">Dernières annonces publiées</h2>
        {nouvelles.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Aucune nouvelle annonce.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {nouvelles.map((b) => {
              const s = statutTF(b, overrides, demandes);
              return (
                <div key={b.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <Link href={`/annonces/${b.id}`} className="font-semibold text-sm text-gray-900 hover:text-navy">
                      {b.titre}
                    </Link>
                    <div className="text-xs text-gray-400">
                      {b.agence} · <IconeTF statut={s} /> {LABELS_TF[s]}
                      {metas[b.id]?.depublie && " · Retirée"}
                    </div>
                  </div>
                  <button
                    onClick={() => basculer(b.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    {metas[b.id]?.depublie ? "Republier" : "Retirer"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {traites.length > 0 && (
        <section>
          <h2 className="font-bold text-gray-900 mb-3">Historique</h2>
          <ul className="card p-4 flex flex-col gap-1 text-sm text-gray-600">
            {traites.map((s) => (
              <li key={s.id}>
                {biens.find((b) => b.id === s.bienId)?.titre ?? "Annonce"} · {s.motif} · {s.statut === "retire" ? "Annonce retirée" : "Classé sans suite"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
