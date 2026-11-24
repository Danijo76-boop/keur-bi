"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useBiens } from "@/lib/annonces";
import { User } from "@/lib/auth";
import { formatFCFA } from "@/lib/mock-data";
import { lireDossiers, signalerIncident } from "@/lib/dossiers";
import { exporterPDF } from "@/lib/export";
import { BoutonPDF } from "@/components/BoutonsExport";
import { useParametres } from "@/lib/parametres";
import { usePeut } from "@/lib/permissions";
import { useStocke } from "@/lib/stockage";
import {
  deciderDemandeTF,
  DemandeTF,
  ICONES_TF,
  LABELS_TF,
  lireDemandesTF,
  relancerDemandeTF,
  soumettreDemandeTF,
} from "@/lib/tf";
import BandeauDemo from "@/components/BandeauDemo";
import Protege from "@/components/Protege";
import SiActif from "@/components/SiActif";

const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal";
const REGIONS = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack"];

const ETAPES = ["Dépôt demande", "Enregistrement DGID", "Instruction dossier", "Décision DGID", "Certificat délivré"];

function etapeCourante(d: DemandeTF): number {
  if (d.statut !== "en_verification") return 4;
  const jours = (Date.now() - new Date(d.soumisLe).getTime()) / 86_400_000;
  return jours < 1 ? 1 : 2;
}

function Contenu({ user }: { user: User }) {
  const biens = useBiens(true);
  const p = useParametres();
  const demandes = useStocke(lireDemandesTF, []);
  const dossiers = useStocke(lireDossiers, []);
  const peutSoumettre = usePeut(user.role, "tf_soumettre");
  const peutDecider = user.role === "notaire" || user.role === "admin";

  const [filtre, setFiltre] = useState<"toutes" | "en_verification" | "terminees">("toutes");
  const [recherche, setRecherche] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const [numero, setNumero] = useState("");
  const [region, setRegion] = useState(REGIONS[0]);
  const [proprietaire, setProprietaire] = useState("");
  const [bienId, setBienId] = useState("");
  const [fichier, setFichier] = useState("");
  const [motif, setMotif] = useState("");

  const mesDemandes = useMemo(() => {
    // L'acheteur ne suit que les biens qui l'intéressent ici : démo sans rattachement fin aux comptes.
    const q = recherche.trim().toLowerCase();
    return demandes
      .filter((d) => filtre === "toutes" || (filtre === "en_verification" ? d.statut === "en_verification" : d.statut !== "en_verification"))
      .filter((d) => !q || `${d.numero} ${d.region} ${d.proprietaire}`.toLowerCase().includes(q));
  }, [demandes, filtre, recherche]);

  const active = demandes.find((d) => d.id === selection) ?? mesDemandes[0];
  const bienActif = biens.find((b) => b.id === active?.bienId);
  const enCours = demandes.filter((d) => d.statut === "en_verification").length;
  const verifies = demandes.filter((d) => d.statut === "verifie").length;
  const invalides = demandes.filter((d) => d.statut === "invalide").length;

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    const d = soumettreDemandeTF({
      bienId: bienId || undefined,
      numero: numero.trim(),
      region,
      proprietaire: proprietaire.trim(),
      fichier: fichier || undefined,
      prioritaire: false,
      demandeur: user.nom,
    });
    setSelection(d.id);
    setNumero("");
    setProprietaire("");
    setBienId("");
    setFichier("");
  }

  function decider(statut: "verifie" | "invalide") {
    if (!active) return;
    if (statut === "invalide" && !motif.trim()) return;
    deciderDemandeTF(active.id, statut, statut === "invalide" ? motif.trim() : undefined);
    setMotif("");
  }

  const dossiersLies = active?.bienId ? dossiers.filter((d) => d.bienId === active.bienId) : [];
  const aSuspendre = dossiersLies.filter((d) => !d.incident);
  const etape = active ? etapeCourante(active) : 0;
  const joursEcoules = active ? Math.floor((Date.now() - new Date(active.soumisLe).getTime()) / 86_400_000) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy">Suivi des Titres Fonciers</h1>
      <p className="text-gray-500 text-sm mb-4">Vérification et traçabilité, de la demande à la décision</p>
      <BandeauDemo>Démo : aucune connexion à la DGID. Le dépôt et la décision sont saisis à la main par le compte notaire.</BandeauDemo>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { val: verifies, label: "✅ TF vérifiés" },
          { val: enCours, label: "⏳ En cours" },
          { val: invalides, label: "❌ Invalides" },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl font-bold text-navy">{s.val}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <aside className="flex flex-col gap-4">
          {peutSoumettre && (
            <form onSubmit={soumettre} className="card p-5 flex flex-col gap-3">
              <h2 className="font-bold text-gray-900">Soumettre un TF</h2>
              <label className="text-sm font-semibold text-gray-700">Numéro TF *<input required value={numero} onChange={(e) => setNumero(e.target.value)} className={champ} /></label>
              <label className="text-sm font-semibold text-gray-700">Région cadastrale *
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={champ}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
              </label>
              <label className="text-sm font-semibold text-gray-700">Propriétaire déclaré *<input required value={proprietaire} onChange={(e) => setProprietaire(e.target.value)} className={champ} /></label>
              <label className="text-sm font-semibold text-gray-700">Annonce associée
                <select value={bienId} onChange={(e) => setBienId(e.target.value)} className={champ}>
                  <option value="">Aucune, vérification libre</option>
                  {biens.map((b) => <option key={b.id} value={b.id}>{b.reference} · {b.titre}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700">Copie du TF (PDF ou image)
                <input type="file" accept=".pdf,image/*" onChange={(e) => setFichier(e.target.files?.[0]?.name ?? "")} className={champ} />
              </label>
              <button type="submit" className="btn-navy text-sm">Envoyer la demande →</button>
              <p className="text-xs text-gray-400">Délai de réponse habituel : 3 à {p.delaiDGID} jours ouvrés</p>
            </form>
          )}
          <div className="card p-5">
            <input aria-label="Rechercher un TF" placeholder="N° TF ou localité…" value={recherche} onChange={(e) => setRecherche(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mb-3" />
            <div className="flex gap-1 mb-3">
              {([["toutes", "Toutes"], ["en_verification", "En cours"], ["terminees", "Terminées"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setFiltre(id)} className={`text-xs font-medium px-3 py-1 rounded-full ${filtre === id ? "bg-navy text-white" : "text-gray-500 hover:bg-gray-50"}`}>{label}</button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {mesDemandes.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">Aucune demande.</p>}
              {mesDemandes.map((d) => (
                <button key={d.id} onClick={() => setSelection(d.id)} className={`text-left rounded-lg p-3 border ${active?.id === d.id ? "border-navy bg-navy/5" : "border-gray-100 hover:bg-gray-50"}`}>
                  <div className="text-sm font-semibold text-gray-900">TF {d.numero}</div>
                  <div className="text-xs text-gray-400">{d.region} · {new Date(d.soumisLe).toLocaleDateString("fr-FR")}</div>
                  <div className="text-xs font-medium text-gray-600 mt-0.5">{ICONES_TF[d.statut]} {LABELS_TF[d.statut]}{d.prioritaire && " · Prioritaire"}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-2 flex flex-col gap-4">
          {!active ? (
            <div className="card p-12 text-center text-gray-400">
              Aucune demande sélectionnée. Les demandes apparaissent ici quand une annonce est publiée ou qu&apos;un notaire soumet un TF.
            </div>
          ) : (
            <>
              <div className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">TF {active.numero}</h2>
                    <p className="text-sm text-gray-500">{active.region}{bienActif && <> · <Link href={`/annonces/${bienActif.id}`} className="text-blue hover:underline">{bienActif.titre}</Link></>}</p>
                  </div>
                  <span className="text-sm font-semibold">{ICONES_TF[active.statut]} {LABELS_TF[active.statut]}</span>
                </div>
                <ol className="flex gap-1 flex-wrap">
                  {ETAPES.map((e, i) => (
                    <li key={e} aria-current={i === etape ? "step" : undefined} className={`flex-1 min-w-[6rem] text-center text-xs font-semibold px-2 py-2 rounded-lg ${i < etape || (i === etape && active.statut !== "en_verification") ? "bg-green/10 text-green" : i === etape ? "bg-navy text-white" : "bg-gray-100 text-gray-400"}`}>
                      {e}
                    </li>
                  ))}
                </ol>
              </div>

              {active.statut === "en_verification" && joursEcoules >= p.delaiDGID && (
                <div className="card p-4 border-l-4 border-gold text-sm text-gray-700">
                  ⚠️ Le délai habituel de {p.delaiDGID} jours est dépassé (J+{joursEcoules}). Le notaire peut déposer une relance officielle.
                </div>
              )}

              <div className="card p-5">
                <h3 className="font-bold text-gray-900 mb-3">Fiche</h3>
                <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3"><dt className="text-xs text-gray-400">Propriétaire déclaré</dt><dd className="font-semibold break-words">{active.proprietaire}</dd></div>
                  <div className="bg-gray-50 rounded-lg p-3"><dt className="text-xs text-gray-400">Demandeur</dt><dd className="font-semibold break-words">{active.demandeur}</dd></div>
                  <div className="bg-gray-50 rounded-lg p-3"><dt className="text-xs text-gray-400">Soumis le</dt><dd className="font-semibold">{new Date(active.soumisLe).toLocaleDateString("fr-FR")}</dd></div>
                  <div className="bg-gray-50 rounded-lg p-3"><dt className="text-xs text-gray-400">Copie du TF</dt><dd className="font-semibold break-all">{active.fichier ?? "Non fournie"}</dd></div>
                  <div className="bg-gray-50 rounded-lg p-3"><dt className="text-xs text-gray-400">Relances</dt><dd className="font-semibold">{active.relances}</dd></div>
                  {active.traiteLe && <div className="bg-gray-50 rounded-lg p-3"><dt className="text-xs text-gray-400">Décision le</dt><dd className="font-semibold">{new Date(active.traiteLe).toLocaleDateString("fr-FR")}</dd></div>}
                </dl>
                {active.motif && <p className="mt-3 text-sm font-semibold text-red bg-red/10 rounded-lg px-3 py-2">Motif d&apos;invalidité : {active.motif}</p>}
                <div className="flex gap-2 flex-wrap mt-3">
                  {active.statut !== "en_verification" && (
                    <BoutonPDF
                      taille="petit"
                      libelle="Rapport en PDF"
                      onClick={() =>
                        exporterPDF(`Rapport_TF_${active.numero}`, {
                          titre: `Rapport de vérification du Titre Foncier ${active.numero}`,
                          sousTitre: `Décision : ${LABELS_TF[active.statut]}`,
                          avertissement: "Rapport de démonstration, sans valeur juridique.",
                          sections: [{
                            titre: "Vérification",
                            champs: [
                              { label: "N° de Titre Foncier", valeur: active.numero },
                              { label: "Région", valeur: active.region },
                              { label: "Propriétaire déclaré", valeur: active.proprietaire },
                              { label: "Demandeur", valeur: active.demandeur },
                              { label: "Soumis le", valeur: new Date(active.soumisLe).toLocaleDateString("fr-FR") },
                              { label: "Décision", valeur: LABELS_TF[active.statut] },
                              { label: "Décision le", valeur: active.traiteLe ? new Date(active.traiteLe).toLocaleDateString("fr-FR") : "-" },
                              { label: "Motif", valeur: active.motif ?? "-" },
                              { label: "Relances", valeur: active.relances },
                            ],
                          }],
                        })
                      }
                    />
                  )}
                  {peutDecider && active.statut === "invalide" && aSuspendre.length > 0 && (
                    <button
                      onClick={() => aSuspendre.forEach((d) => signalerIncident(d.id, "litigieux"))}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-red/30 text-red hover:bg-red/5"
                    >
                      Suspendre {aSuspendre.length} dossier{aSuspendre.length > 1 ? "s" : ""} lié{aSuspendre.length > 1 ? "s" : ""}
                    </button>
                  )}
                </div>
                {active.statut === "invalide" && active.bienId && <p className="text-xs text-gray-400 mt-2">Le vendeur et les acheteurs concernés voient l&apos;alerte dans leurs notifications.</p>}
              </div>

              {peutDecider && active.statut === "en_verification" && (
                <div className="card p-5">
                  <h3 className="font-bold text-gray-900 mb-3">Décision du notaire</h3>
                  <label className="text-sm font-semibold text-gray-700 block mb-3">
                    Motif (obligatoire en cas d&apos;invalidité)
                    <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="ex. hypothèque enregistrée, charge non levée" className={champ} />
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => decider("verifie")} className="text-sm font-semibold px-4 py-2 rounded-lg bg-green text-white">✓ Valider</button>
                    <button onClick={() => decider("invalide")} disabled={!motif.trim()} className="text-sm font-semibold px-4 py-2 rounded-lg border border-red/30 text-red disabled:opacity-50">✗ Invalide</button>
                    <button onClick={() => relancerDemandeTF(active.id)} className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600">Relancer</button>
                  </div>
                </div>
              )}

              {!peutDecider && active.statut === "en_verification" && p.flags.tfPrioritaire && (
                <div className="card p-5 text-sm text-gray-700">
                  🚀 TF accéléré disponible pour {formatFCFA(p.prixTFPrioritaire)}. <Link href="/contact?sujet=TF%20acc%C3%A9l%C3%A9r%C3%A9" className="text-blue hover:underline">Nous contacter</Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerificationTFPage() {
  return (
    <SiActif flag="cadastre" message="La vérification cadastrale des Titres Fonciers est en pause pour le moment. Elle sera rouverte dès que les données du cadastre seront disponibles.">
      <Protege>{(user) => <Contenu user={user} />}</Protege>
    </SiActif>
  );
}
