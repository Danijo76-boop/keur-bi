"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { basculerPublication, boostActif, booster, modifierPrix, modifierTexte, useBiens, useMetaAnnonce } from "@/lib/annonces";
import { trouverUtilisateur } from "@/lib/utilisateurs";
import { User } from "@/lib/auth";
import { LABELS_ETAPE, lireDossiers } from "@/lib/dossiers";
import { Bien, formatFCFA } from "@/lib/mock-data";
import { useParametres } from "@/lib/parametres";
import { usePeut } from "@/lib/permissions";
import { lireFavoris } from "@/lib/preferences";
import { useStocke } from "@/lib/stockage";
import BarresHorizontales from "@/components/BarresHorizontales";
import Protege from "@/components/Protege";
import TFBadge from "@/components/TFBadge";

const LABEL_STATUT = { en_attente: "En attente", acceptee: "✓ Acceptée", refusee: "Refusée", retiree: "Retirée" };

function Gestion({ bien, user }: { bien: Bien; user: User }) {
  const meta = useMetaAnnonce(bien.id);
  const p = useParametres();
  const peutModifier = usePeut(user.role, "annonce_modifier");
  const peutBooster = usePeut(user.role, "annonce_booster");
  const dossiers = useStocke(() => lireDossiers().filter((d) => d.bienId === bien.id), [], [bien.id]);
  const favoris = useStocke(lireFavoris, []);
  const [nouveauPrix, setNouveauPrix] = useState("");
  const [edition, setEdition] = useState(false);
  const [titre, setTitre] = useState(bien.titre);
  const [description, setDescription] = useState(bien.description);
  const plan = useStocke(() => trouverUtilisateur(user.email)?.plan, undefined, [user.email]);

  const offres = dossiers.flatMap((d) => d.offres.filter((o) => o.auteur === "acheteur").map((o) => ({ ...o, dossier: d })));
  const acceptees = offres.filter((o) => o.statut === "acceptee").length;
  const boostEnCours = boostActif(meta);

  // Le mock ne stocke qu'un total de vues : la répartition hebdomadaire est une illustration stable.
  const parts = [0.15, 0.2, 0.4, 0.25];
  const vuesParSemaine = parts.map((x, i) => ({ label: `S${i + 1}`, valeur: Math.round(bien.nb_vues * x) }));

  const stats = [
    { label: "Vues totales", val: bien.nb_vues },
    { label: "Favoris (ce navigateur)", val: favoris.includes(bien.id) ? 1 : 0 },
    { label: "Offres reçues", val: offres.length },
    { label: "Offres acceptées", val: acceptees },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="card p-5 mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{bien.titre}</h1>
          <p className="text-sm text-gray-400 mb-2">
            {bien.superficie.toLocaleString("fr-FR")} m² · {bien.ville} · Réf {bien.reference}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <TFBadge bien={bien} />
            {meta.depublie && <span className="bg-gray-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Dépubliée</span>}
            {boostEnCours && <span className="bg-gold text-navy-dark text-xs font-semibold px-2 py-0.5 rounded-full">⭐ Boostée</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-navy">{formatFCFA(bien.prix)}</div>
          {peutModifier && (
            <div className="flex gap-2 mt-2 justify-end flex-wrap">
              <Link href={`/annonces/${bien.id}`} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
                Voir
              </Link>
              <button onClick={() => setEdition(!edition)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
                Modifier
              </button>
              <button
                onClick={() => basculerPublication(bien.id)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
              >
                {meta.depublie ? "Republier" : "Dépublier"}
              </button>
            </div>
          )}
        </div>
      </div>

      {edition && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            modifierTexte(bien.id, titre.trim(), description.trim());
            setEdition(false);
          }}
          className="card p-5 mb-6 flex flex-col gap-3"
        >
          <label className="text-sm font-semibold text-gray-700">
            Titre
            <input
              required
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal mt-1 outline-none focus:border-navy"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Description
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal mt-1 outline-none focus:border-navy resize-none"
            />
          </label>
          <button type="submit" className="btn-navy text-sm self-start">
            Enregistrer
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl font-bold text-navy">{s.val}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Offres reçues ({offres.length})</h2>
          {offres.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune offre reçue pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {offres.map((o) => (
                <Link key={o.id} href={`/dossiers/${o.dossier.id}`} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-sm text-gray-900">{o.dossier.acheteurNom}</span>
                    <span className="text-xs font-semibold text-gray-500">{LABEL_STATUT[o.statut]}</span>
                  </div>
                  <div className="font-bold text-navy text-sm">
                    {formatFCFA(o.montant)}{" "}
                    <span className="text-xs font-normal text-gray-400">({(((o.montant - bien.prix) / bien.prix) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(o.date).toLocaleDateString("fr-FR")}
                    {o.financement && <> · {o.financement}</>} · Dossier : {LABELS_ETAPE[o.dossier.statut]}
                  </div>
                  {o.message && <p className="text-sm text-gray-600 mt-1">« {o.message} »</p>}
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-1">Vues par semaine</h2>
            <p className="text-xs text-gray-400 mb-3">Répartition illustrative du total de vues</p>
            <BarresHorizontales donnees={vuesParSemaine} unite="vues" />
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Historique du prix</h2>
            <ul className="text-sm flex flex-col gap-1 mb-3">
              {(meta.historiquePrix ?? []).length === 0 && <li className="text-gray-400">Aucune modification.</li>}
              {(meta.historiquePrix ?? []).map((h) => (
                <li key={h.date} className="flex justify-between gap-3">
                  <span className="text-gray-500">{new Date(h.date).toLocaleDateString("fr-FR")}</span>
                  <span className="font-semibold">{formatFCFA(h.prix)}</span>
                </li>
              ))}
            </ul>
            {peutModifier && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (Number(nouveauPrix) > 0) {
                    modifierPrix(bien, Number(nouveauPrix));
                    setNouveauPrix("");
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="number"
                  min={1}
                  aria-label="Nouveau prix en FCFA"
                  placeholder="Nouveau prix"
                  value={nouveauPrix}
                  onChange={(e) => setNouveauPrix(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                />
                <button type="submit" className="btn-navy text-sm px-3 py-2">
                  OK
                </button>
              </form>
            )}
          </div>

          {p.flags.boost && peutBooster && (
            <div className="card p-5 bg-navy text-white">
              <h2 className="font-bold mb-1">⚡ Booster l&apos;annonce</h2>
              <p className="text-white/70 text-sm mb-3">Badge « En vedette » pendant 30 jours.</p>
              {boostEnCours ? (
                <p className="text-sm text-gold font-semibold">Actif jusqu&apos;au {new Date(meta.boostJusquau!).toLocaleDateString("fr-FR")}</p>
              ) : (
                <>
                  <button onClick={() => booster(bien.id)} className="btn-primary w-full text-sm">
                    {plan === "promoteur" ? "Booster (inclus dans votre plan)" : `Booster pour ${formatFCFA(p.prixBoost)}`}
                  </button>
                  <p className="text-white/50 text-xs mt-2 text-center">Démo : aucun paiement n&apos;est prélevé</p>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function MesAnnoncesPage() {
  const { id } = useParams<{ id: string }>();
  const biens = useBiens(true);
  const bien = biens.find((b) => b.id === id);
  return (
    <Protege roles={["vendeur", "agence", "agent", "admin"]}>
      {(user) =>
        !bien ? (
          <div className="py-16 text-center text-gray-400">Annonce introuvable.</div>
        ) : bien.auteurEmail !== user.email && user.role !== "admin" ? (
          <div className="py-16 text-center text-gray-400">Cette annonce est gérée par un autre compte.</div>
        ) : (
          <Gestion bien={bien} user={user} />
        )
      }
    </Protege>
  );
}
