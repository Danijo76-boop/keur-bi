"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Flags, lireAudit, lireParametres, Parametres, sauvegarderParametres, useParametres } from "@/lib/parametres";
import { useStocke } from "@/lib/stockage";

type CleChamp = Exclude<keyof Parametres, "flags">;
type Champ = { cle: CleChamp; label: string; desc: string; unite?: string; texte?: boolean };
type Section = { id: string; titre: string; champs: Champ[] };

const SECTIONS: Section[] = [
  {
    id: "commissions",
    titre: "💰 Commissions & tarifs",
    champs: [
      { cle: "tauxCommission", label: "Taux de commission de référence", desc: "Tranche 50–200 M FCFA ; ±0,5 point en dessous et au-dessus. À la charge du vendeur.", unite: "%" },
      { cle: "prixBoost", label: "Prix du boost annonce (30 jours)", desc: "Montant affiché au vendeur pour la mise en avant", unite: "FCFA" },
      { cle: "prixTFPrioritaire", label: "Prix de la vérification TF prioritaire", desc: "Option accélérée, réponse en 24–48h", unite: "FCFA" },
      { cle: "tvaHonoraires", label: "TVA sur honoraires notaire", desc: "Appliquée aux honoraires du barème", unite: "%" },
      { cle: "droitsEnregistrement", label: "Droits d'enregistrement DGID", desc: "Appliqués au prix de vente", unite: "%" },
      { cle: "publiciteFonciere", label: "Publicité foncière", desc: "Appliquée au prix de vente", unite: "%" },
      { cle: "fraisMutationTF", label: "Frais de mutation TF", desc: "Droits de timbre et copie, forfait", unite: "FCFA" },
    ],
  },
  {
    id: "delais",
    titre: "📅 Délais & alertes DGID",
    champs: [
      { cle: "moisEnregistrement", label: "Fenêtre d'enregistrement DGID", desc: "Mois après la signature de l'acte pour déposer sans pénalité", unite: "mois" },
      { cle: "penaliteRetard", label: "Pénalité de retard", desc: "Majoration des droits si le délai est dépassé", unite: "%" },
      { cle: "alerteDGID1", label: "Premier rappel (J−)", desc: "Jours avant expiration du délai", unite: "jours" },
      { cle: "alerteDGID2", label: "Rappel urgent (J−)", desc: "Rappel critique avant la date limite", unite: "jours" },
      { cle: "delaiDGID", label: "Délai max de réponse", desc: "Au-delà, la demande TF est signalée en retard", unite: "jours" },
    ],
  },
  {
    id: "kyc",
    titre: "🪪 KYC & vérification d'identité",
    champs: [
      { cle: "delaiKYC", label: "Délai de traitement KYC", desc: "Au-delà, une alerte s'affiche dans la vue d'ensemble", unite: "heures" },
      { cle: "scoreMin", label: "Score de confiance minimum, acheteur", desc: "En dessous, l'acheteur ne peut pas soumettre d'offre", unite: "/ 100" },
      { cle: "docsAcheteur", label: "Documents requis, acheteur", desc: "Affichés dans le parcours KYC", texte: true },
      { cle: "docsVendeur", label: "Documents requis, vendeur", desc: "Affichés au vendeur", texte: true },
    ],
  },
  {
    id: "offres",
    titre: "🤝 Offres & négociation",
    champs: [
      { cle: "validiteOffre", label: "Durée de validité par défaut d'une offre", desc: "Délai pour accepter, refuser ou contre-proposer", unite: "jours" },
      { cle: "acompteMin", label: "Acompte minimum", desc: "Pourcentage minimal du prix de vente", unite: "%" },
      { cle: "maxContreOffres", label: "Nombre max de contre-offres", desc: "Tours de négociation autorisés au vendeur", unite: "tours" },
      { cle: "decoteMax", label: "Décote déclenchant une alerte", desc: "Au-delà, un avertissement est montré au vendeur", unite: "%" },
    ],
  },
];

const FLAGS: { cle: keyof Flags; label: string; desc: string }[] = [
  { cle: "comparateur", label: "Comparateur de biens", desc: "Comparer jusqu'à 3 biens côte à côte" },
  { cle: "carte", label: "Carte interactive", desc: "Vue carte des annonces" },
  { cle: "boost", label: "Boost annonce payant", desc: "Option de mise en avant pour les vendeurs" },
  { cle: "cadastre", label: "Vérification cadastrale des Titres Fonciers", desc: "Demandes, suivi et décisions de vérification. En pause tant que les données du cadastre ne sont pas réunies" },
  { cle: "publicite", label: "Publicité partenaires", desc: "Encarts sponsorisés sur les résultats de recherche et les fiches" },
  { cle: "tfPrioritaire", label: "Vérification TF prioritaire", desc: "Option accélérée contre supplément" },
  { cle: "signature", label: "Signature électronique", desc: "Module de signature des actes" },
  { cle: "maintenance", label: "Mode maintenance", desc: "Bloque l'accès public, seul l'admin garde la main" },
];

export default function ParametresPage() {
  const { user } = useAuth();
  const enregistres = useParametres();
  const audit = useStocke(lireAudit, []);
  const [form, setForm] = useState<Parametres>(enregistres);
  const [section, setSection] = useState(SECTIONS[0].id);
  const [historique, setHistorique] = useState(false);
  const [ok, setOk] = useState(false);

  // Comparaison par contenu : une écriture sans rapport ne doit pas effacer la saisie en cours.
  const version = JSON.stringify(enregistres);
  useEffect(() => {
    setForm(lireParametres());
  }, [version]);

  const champsModifies = [
    ...SECTIONS.flatMap((s) => s.champs).filter((c) => form[c.cle] !== enregistres[c.cle]).map((c) => c.label),
    ...FLAGS.filter((f) => form.flags[f.cle] !== enregistres.flags[f.cle]).map((f) => f.label),
  ];

  function maj(cle: CleChamp, valeur: string, texte?: boolean) {
    setOk(false);
    setForm((f) => ({ ...f, [cle]: texte ? valeur : Number(valeur) }));
  }

  function enregistrer() {
    sauvegarderParametres(form, user?.nom ?? "Admin", champsModifies);
    setOk(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h1 className="text-2xl font-bold text-navy">Paramètres plateforme</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {champsModifies.length > 0 && <span className="text-sm font-semibold text-red">⚠ {champsModifies.length} champ(s) non enregistré(s)</span>}
          {ok && champsModifies.length === 0 && <span className="text-sm font-semibold text-green">Enregistré</span>}
          <button disabled={champsModifies.length === 0} onClick={() => setForm(enregistres)} className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40">Annuler</button>
          <button disabled={champsModifies.length === 0} onClick={enregistrer} className="btn-navy text-sm px-3 py-2 disabled:opacity-40">Enregistrer les modifications</button>
        </div>
      </div>

      <div className="grid md:grid-cols-[13rem_1fr] gap-6 items-start">
        <nav className="card p-2 flex md:flex-col gap-1 overflow-x-auto" aria-label="Catégories">
          {[...SECTIONS.map((s) => ({ id: s.id, titre: s.titre })), { id: "flags", titre: "🚩 Fonctionnalités" }].map((s) => (
            <button key={s.id} aria-current={section === s.id ? "true" : undefined} onClick={() => setSection(s.id)} className={`text-left px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${section === s.id ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}>{s.titre}</button>
          ))}
        </nav>

        <div className="flex flex-col gap-4 min-w-0">
          {SECTIONS.filter((s) => s.id === section).map((s) => (
            <div key={s.id} className="card p-5">
              <h2 className="font-bold text-gray-900 mb-4">{s.titre}</h2>
              <div className="flex flex-col gap-4">
                {s.champs.map((c) => (
                  <label key={c.cle} className="grid sm:grid-cols-[1fr_14rem] gap-2 items-center">
                    <span>
                      <span className="block text-sm font-semibold text-gray-800">{c.label}</span>
                      <span className="block text-xs text-gray-400">{c.desc}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <input
                        type={c.texte ? "text" : "number"}
                        step="any"
                        min={c.texte ? undefined : 0}
                        value={form[c.cle] as string | number}
                        onChange={(e) => maj(c.cle, e.target.value, c.texte)}
                        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-navy ${form[c.cle] !== enregistres[c.cle] ? "border-gold bg-gold/5" : "border-gray-200"}`}
                      />
                      {c.unite && <span className="text-xs text-gray-400 shrink-0">{c.unite}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {section === "flags" && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-4">🚩 Fonctionnalités</h2>
              <div className="flex flex-col gap-4">
                {FLAGS.map((f) => (
                  <label key={f.cle} className="flex items-center justify-between gap-4 cursor-pointer">
                    <span>
                      <span className="block text-sm font-semibold text-gray-800">{f.label}</span>
                      <span className="block text-xs text-gray-400">{f.desc}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold ${form.flags[f.cle] ? "text-green" : "text-gray-400"}`}>{form.flags[f.cle] ? "Actif" : "Inactif"}</span>
                      <input
                        type="checkbox"
                        className="accent-navy w-4 h-4"
                        checked={form.flags[f.cle]}
                        onChange={(e) => {
                          setOk(false);
                          setForm((x) => ({ ...x, flags: { ...x.flags, [f.cle]: e.target.checked } }));
                        }}
                      />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <button onClick={() => setHistorique(!historique)} className="text-sm text-blue font-medium hover:underline">
              {historique ? "Masquer l'historique" : `Voir l'historique des modifications (${audit.length})`}
            </button>
            {historique && (
              <ul className="flex flex-col gap-2 mt-3 text-xs">
                {audit.length === 0 && <li className="text-gray-400">Aucune modification.</li>}
                {audit.map((a) => (
                  <li key={a.id} className="bg-gray-50 rounded-lg p-2">
                    <span className="font-semibold text-gray-800">{new Date(a.date).toLocaleString("fr-FR")} · {a.auteur}</span>
                    <span className="block text-gray-500">{a.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
