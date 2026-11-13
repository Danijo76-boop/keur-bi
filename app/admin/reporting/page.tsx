"use client";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { ROLE_LABELS } from "@/lib/auth";
import { useBiens, useMetasAnnonces } from "@/lib/annonces";
import {
  ETAPES_DOSSIER,
  joursRestantsDGID,
  LABELS_ETAPE,
  lireDossiers,
  prixRetenu,
  referenceDossier,
  StatutDossier,
  totalConfirme,
} from "@/lib/dossiers";
import { notaireParSlug } from "@/lib/notaires";
import { calculerFrais, commissionVente, useParametres } from "@/lib/parametres";
import { lire, ecrire, nouvelId, useStocke } from "@/lib/stockage";
import { telecharger } from "@/lib/telechargement";
import { LABELS_TF, lireDemandesTF, lireOverridesTF, statutTF } from "@/lib/tf";
import { LABELS_KYC, lireUtilisateurs } from "@/lib/utilisateurs";
import { genererXlsx } from "@/lib/xlsx";

type Valeur = string | number;
type Ligne = { id: string; valeurs: Record<string, Valeur>; region?: string; statut?: StatutDossier; date?: string };
type Colonne = { id: string; groupe: string; label: string; defaut?: boolean };
type Rapport = { id: string; label: string; colonnes: Colonne[]; lignes: Ligne[]; totaux?: { label: string; id: string }[] };
type Export = { id: string; nom: string; date: string; lignes: number };

const CLE_HISTORIQUE = "keurbi_exports";
const dateFr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

const col = (groupe: string, defs: [string, string, boolean?][]): Colonne[] => defs.map(([id, label, defaut]) => ({ id, label, groupe, defaut }));

const COLONNES_DOSSIERS: Colonne[] = [
  ...col("📋 Identification", [["ref", "N° Dossier", true], ["ouverture", "Date ouverture", true], ["statut", "Statut contrat", true], ["notaire", "Notaire assigné"]]),
  ...col("🏡 Bien", [["adresse", "Localité", true], ["region", "Région", true], ["superficie", "Superficie (m²)"], ["tf", "N° TF", true], ["statutTF", "Statut TF"], ["type", "Type de bien"]]),
  ...col("👤 Parties", [["acheteur", "Acheteur", true], ["emailAcheteur", "Email acheteur"], ["vendeur", "Vendeur", true]]),
  ...col("💰 Financier", [["prix", "Prix vente (FCFA)", true], ["commission", "Commission (FCFA)", true], ["honoraires", "Honoraires notaire (FCFA)"], ["droits", "Droits DGID (FCFA)"], ["tva", "TVA (FCFA)"], ["cout", "Coût total acquéreur (FCFA)"], ["verse", "Versements confirmés (FCFA)"]]),
  ...col("📅 Dates clés", [["compromis", "Date compromis"], ["acte", "Date acte"], ["limite", "Limite DGID"], ["jours", "Jours restants DGID"]]),
];

// Empêche un tableur d'interpréter comme formule une valeur saisie par un utilisateur.
function celluleCSV(v: Valeur): string {
  const s = String(v);
  const sure = typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(sure) ? `"${sure.replace(/"/g, '""')}"` : sure;
}

export default function ReportingPage() {
  const biens = useBiens(true);
  const metas = useMetasAnnonces();
  const p = useParametres();
  const dossiers = useStocke(lireDossiers, []);
  const overrides = useStocke(lireOverridesTF, []);
  const demandes = useStocke(lireDemandesTF, []);
  const utilisateurs = useStocke(lireUtilisateurs, []);
  const historique = useStocke(() => lire<Export[]>(CLE_HISTORIQUE, []), []);

  const [rapportId, setRapportId] = useState("dossiers");
  const [region, setRegion] = useState("");
  const [statut, setStatut] = useState<StatutDossier | "">("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [choixColonnes, setChoixColonnes] = useState<Record<string, string[]>>({});

  const rapports = useMemo<Rapport[]>(() => {
    const lignesDossiers: Ligne[] = dossiers.flatMap((d) => {
      const b = biens.find((x) => x.id === d.bienId);
      if (!b) return [];
      const prix = prixRetenu(d, b);
      const f = calculerFrais(prix, p);
      return [
        {
          id: d.id,
          region: b.region,
          statut: d.statut,
          date: d.dateOuverture,
          valeurs: {
            ref: referenceDossier(d),
            ouverture: dateFr(d.dateOuverture),
            statut: LABELS_ETAPE[d.statut],
            notaire: notaireParSlug(d.notaireSlug)?.nom ?? "",
            adresse: `${b.quartier}, ${b.ville}`,
            region: b.region,
            superficie: b.superficie,
            tf: b.tf.numero ?? "",
            statutTF: LABELS_TF[statutTF(b, overrides, demandes)],
            type: b.type,
            acheteur: d.acheteurNom,
            emailAcheteur: d.acheteurEmail,
            vendeur: b.agence,
            prix,
            commission: commissionVente(prix, p),
            honoraires: f.honoraires,
            droits: f.droits,
            tva: f.tva,
            cout: f.totalAcquisition,
            verse: totalConfirme(d),
            compromis: dateFr(d.dateCompromis),
            acte: dateFr(d.dateActe),
            limite: dateFr(d.dateLimiteDGID),
            jours: joursRestantsDGID(d) ?? "",
          },
        },
      ];
    });
    const indexActe = ETAPES_DOSSIER.indexOf("actif");
    const totauxFinanciers = [
      { label: "Total prix de vente", id: "prix" },
      { label: "Total commissions", id: "commission" },
      { label: "Total droits DGID", id: "droits" },
      { label: "Total TVA honoraires", id: "tva" },
    ];

    return [
      { id: "dossiers", label: "Dossiers de vente", colonnes: COLONNES_DOSSIERS, lignes: lignesDossiers, totaux: totauxFinanciers },
      {
        id: "annonces",
        label: "Annonces publiées",
        colonnes: col("🏡 Annonce", [["ref", "Référence", true], ["titre", "Titre", true], ["type", "Type", true], ["region", "Région", true], ["quartier", "Quartier"], ["superficie", "Superficie (m²)", true], ["prix", "Prix (FCFA)", true], ["prixM2", "Prix / m² (FCFA)"], ["vues", "Vues", true], ["tf", "Statut TF", true], ["vendeur", "Vendeur"], ["etat", "État", true]]),
        lignes: biens.map((b) => ({
          id: b.id,
          region: b.region,
          date: b.publieLe,
          valeurs: { ref: b.reference, titre: b.titre, type: b.type, region: b.region, quartier: b.quartier, superficie: b.superficie, prix: b.prix, prixM2: Math.round(b.prix / b.superficie), vues: b.nb_vues, tf: LABELS_TF[statutTF(b, overrides, demandes)], vendeur: b.agence, etat: metas[b.id]?.depublie ? "Dépubliée" : "Publiée" },
        })),
        totaux: [{ label: "Total prix affichés", id: "prix" }],
      },
      {
        id: "utilisateurs",
        label: "Utilisateurs",
        colonnes: col("👤 Utilisateur", [["nom", "Nom", true], ["email", "Email", true], ["telephone", "Téléphone"], ["ville", "Ville"], ["role", "Rôle", true], ["kyc", "KYC", true], ["etat", "État", true], ["inscrit", "Inscription", true], ["connexion", "Dernière connexion"]]),
        lignes: utilisateurs.map((u) => ({
          id: u.email,
          date: u.inscritLe,
          valeurs: { nom: u.nom, email: u.email, telephone: u.telephone ?? "", ville: u.ville ?? "", role: ROLE_LABELS[u.role], kyc: LABELS_KYC[u.statutKYC], etat: u.suspendu ? "Suspendu" : "Actif", inscrit: dateFr(u.inscritLe), connexion: dateFr(u.derniereConnexion) },
        })),
      },
      {
        id: "financier",
        label: "Financier / Commissions",
        colonnes: COLONNES_DOSSIERS.filter((c) => ["ref", "statut", "vendeur", "prix", "commission", "honoraires", "droits", "tva", "verse", "acte"].includes(c.id)).map((c) => ({ ...c, defaut: true })),
        lignes: lignesDossiers.filter((l) => ETAPES_DOSSIER.indexOf(l.statut!) >= indexActe),
        totaux: totauxFinanciers,
      },
      {
        id: "tf",
        label: "TF & DGID",
        colonnes: col("📜 Vérification", [["numero", "N° TF", true], ["region", "Région", true], ["proprietaire", "Propriétaire déclaré", true], ["demandeur", "Demandeur"], ["statut", "Statut", true], ["soumis", "Soumis le", true], ["decision", "Décision le", true], ["motif", "Motif"], ["relances", "Relances"]]),
        lignes: demandes.map((d) => ({
          id: d.id,
          region: d.region,
          date: d.soumisLe,
          valeurs: { numero: d.numero, region: d.region, proprietaire: d.proprietaire, demandeur: d.demandeur, statut: LABELS_TF[d.statut], soumis: dateFr(d.soumisLe), decision: dateFr(d.traiteLe), motif: d.motif ?? "", relances: d.relances },
        })),
      },
      {
        id: "alertes",
        label: "Alertes DGID",
        colonnes: COLONNES_DOSSIERS.filter((c) => ["ref", "adresse", "acheteur", "notaire", "acte", "limite", "jours", "droits"].includes(c.id)).map((c) => ({ ...c, defaut: true })),
        lignes: lignesDossiers.filter((l) => typeof l.valeurs.jours === "number" && l.valeurs.jours <= p.alerteDGID1),
      },
    ];
  }, [dossiers, biens, metas, p, overrides, demandes, utilisateurs]);

  const rapport = rapports.find((r) => r.id === rapportId)!;
  const colonnes = choixColonnes[rapport.id] ?? rapport.colonnes.filter((c) => c.defaut).map((c) => c.id);
  const choisies = rapport.colonnes.filter((c) => colonnes.includes(c.id));
  const groupes = Array.from(new Set(rapport.colonnes.map((c) => c.groupe)));
  const aRegion = rapport.lignes.some((l) => l.region);
  const aStatut = rapport.lignes.some((l) => l.statut) || rapport.id === "dossiers";
  const regions = Array.from(new Set(rapport.lignes.map((l) => l.region).filter(Boolean))) as string[];

  const lignes = rapport.lignes.filter((l) => {
    if (region && l.region !== region) return false;
    if (statut && l.statut !== statut) return false;
    if (debut && (!l.date || l.date < debut)) return false;
    if (fin && (!l.date || l.date.slice(0, 10) > fin)) return false;
    return true;
  });

  function changerRapport(id: string) {
    setRapportId(id);
    setRegion("");
    setStatut("");
  }

  function definirColonnes(ids: string[]) {
    setChoixColonnes((c) => ({ ...c, [rapport.id]: ids }));
  }

  function nomFichier(extension: string) {
    return `${rapport.label.replace(/[^\p{L}\p{N}]+/gu, "_")}_${new Date().toISOString().slice(0, 10)}.${extension}`;
  }

  function journaliser(nom: string) {
    ecrire(CLE_HISTORIQUE, [{ id: nouvelId(), nom, date: new Date().toISOString(), lignes: lignes.length }, ...historique].slice(0, 10));
  }

  function exporterCSV() {
    const contenu = [choisies.map((c) => celluleCSV(c.label)).join(";"), ...lignes.map((l) => choisies.map((c) => celluleCSV(l.valeurs[c.id] ?? "")).join(";"))];
    const nom = nomFichier("csv");
    // Le BOM permet à Excel de lire correctement les accents.
    telecharger(nom, "﻿" + contenu.join("\r\n"), "text/csv;charset=utf-8");
    journaliser(nom);
  }

  function exporterXlsx() {
    const fichier = genererXlsx(choisies.map((c) => c.label), lignes.map((l) => choisies.map((c) => l.valeurs[c.id] ?? "")));
    const nom = nomFichier("xlsx");
    telecharger(nom, fichier.buffer as ArrayBuffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    journaliser(nom);
  }

  const select = "border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy bg-white";
  const exportImpossible = lignes.length === 0 || choisies.length === 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Reporting · {rapport.label}</h1>
      <p className="text-sm text-gray-500 mb-4 print:hidden">Sélectionnez les colonnes, prévisualisez, puis téléchargez.</p>

      <div className="flex gap-2 flex-wrap mb-4 print:hidden" role="group" aria-label="Rapports disponibles">
        {rapports.map((r) => (
          <button
            key={r.id}
            aria-pressed={r.id === rapport.id}
            onClick={() => changerRapport(r.id)}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border ${r.id === rapport.id ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:border-navy"}`}
          >
            {r.label} ({r.lignes.length})
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center mb-4 print:hidden">
        {aRegion && (
          <select aria-label="Région" value={region} onChange={(e) => setRegion(e.target.value)} className={select}>
            <option value="">Toutes les régions</option>
            {regions.map((r) => <option key={r}>{r}</option>)}
          </select>
        )}
        {aStatut && (
          <select aria-label="Statut" value={statut} onChange={(e) => setStatut(e.target.value as StatutDossier | "")} className={select}>
            <option value="">Tous les statuts</option>
            {ETAPES_DOSSIER.map((e) => <option key={e} value={e}>{LABELS_ETAPE[e]}</option>)}
          </select>
        )}
        <input aria-label="À partir du" type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className={select} />
        <span className="text-gray-400">→</span>
        <input aria-label="Jusqu'au" type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={select} />
        <span className="text-sm font-semibold text-navy">{lignes.length} lignes trouvées</span>
      </div>

      <details className="card p-5 mb-4 print:hidden" open>
        <summary className="font-bold text-gray-900 cursor-pointer">Colonnes à exporter ({choisies.length})</summary>
        <div className="flex gap-3 text-xs mt-2 mb-3">
          <button onClick={() => definirColonnes(rapport.colonnes.map((c) => c.id))} className="text-blue font-medium hover:underline">Tout sélectionner</button>
          <button onClick={() => definirColonnes(rapport.colonnes.filter((c) => c.defaut).map((c) => c.id))} className="text-blue font-medium hover:underline">Réinitialiser</button>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {groupes.map((g) => (
            <fieldset key={g}>
              <legend className="text-xs font-bold text-gray-700 mb-1">{g}</legend>
              {rapport.colonnes.filter((c) => c.groupe === g).map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs text-gray-600 py-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-navy"
                    checked={colonnes.includes(c.id)}
                    onChange={() => definirColonnes(colonnes.includes(c.id) ? colonnes.filter((i) => i !== c.id) : [...colonnes, c.id])}
                  />
                  {c.label}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </details>

      <div className="card mb-4">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap print:hidden">
          <h2 className="font-bold text-gray-900">Prévisualisation, 5 premières lignes sur {lignes.length}</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-50"><Printer size={15} /> PDF</button>
            <button disabled={exportImpossible} onClick={exporterCSV} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"><Download size={15} /> CSV</button>
            <button disabled={exportImpossible} onClick={exporterXlsx} className="btn-navy text-sm px-3 py-2 flex items-center gap-2 disabled:opacity-50"><FileSpreadsheet size={15} /> Excel (.xlsx)</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                {choisies.map((c) => <th scope="col" key={c.id} className="p-2 font-semibold whitespace-nowrap">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {lignes.slice(0, 5).map((l) => (
                <tr key={l.id} className="border-b border-gray-50">
                  {choisies.map((c) => {
                    const v = l.valeurs[c.id] ?? "";
                    return <td key={c.id} className={`p-2 whitespace-nowrap ${typeof v === "number" ? "text-right tabular-nums" : ""}`}>{typeof v === "number" ? v.toLocaleString("fr-FR") : v}</td>;
                  })}
                </tr>
              ))}
              {lignes.length === 0 && <tr><td colSpan={Math.max(choisies.length, 1)} className="p-8 text-center text-gray-400">Aucune ligne pour ces filtres.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {rapport.totaux && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {rapport.totaux.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="text-xs text-gray-500">{t.label}</div>
              <div className="font-bold text-navy tabular-nums">{lignes.reduce((s, l) => s + Number(l.valeurs[t.id] ?? 0), 0).toLocaleString("fr-FR")} FCFA</div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5 print:hidden">
        <h2 className="font-bold text-gray-900 mb-2">Historique des exports</h2>
        {historique.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun export pour le moment.</p>
        ) : (
          <ul className="text-sm flex flex-col gap-1">
            {historique.map((h) => <li key={h.id} className="text-gray-600 break-all">{h.nom} · {new Date(h.date).toLocaleDateString("fr-FR")} · {h.lignes} lignes</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
