"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { BoutonExcel, BoutonPDF } from "@/components/BoutonsExport";
import { genererIcs } from "@/lib/ics";
import { telecharger } from "@/lib/telechargement";
import { exporterExcel, exporterPDF, type Tableau } from "@/lib/export";
import { LABELS_VISITE, lireVisites } from "@/lib/visites";
import { useBiens } from "@/lib/annonces";
import { User, estCoteVendeur, estNotariat } from "@/lib/auth";
import { joursRestantsDGID, lireDossiers, referenceDossier } from "@/lib/dossiers";
import { annulerRendezVous, lireRendezVous } from "@/lib/preferences";
import { useParametres } from "@/lib/parametres";
import { useStocke } from "@/lib/stockage";
import Protege from "@/components/Protege";

type Evenement = { id: string; date: Date; titre: string; detail?: string; lien?: string; type: "fait" | "rdv" | "delai"; rdvId?: string };

const COULEURS = {
  fait: "bg-green/10 text-green",
  rdv: "bg-blue/10 text-blue",
  delai: "bg-red/10 text-red",
};
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function memeJour(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Contenu({ user }: { user: User }) {
  const biens = useBiens(true);
  const p = useParametres();
  const dossiers = useStocke(() => lireDossiers().filter((d) => user.role !== "acheteur" || d.acheteurEmail === user.email), [], [user.email, user.role]);
  const rdvs = useStocke(() => lireRendezVous().filter((r) => estNotariat(user.role) || r.email === user.email), [], [user.email, user.role]);
  const visites = useStocke(
    () => lireVisites().filter((v) => (estCoteVendeur(user.role) || v.acheteurEmail === user.email) && (v.statut === "demandee" || v.statut === "confirmee")),
    [],
    [user.email, user.role],
  );
  const [mois, setMois] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const evenements = useMemo(() => {
    const out: Evenement[] = [];
    for (const d of dossiers) {
      const titre = biens.find((b) => b.id === d.bienId)?.titre ?? "Bien";
      const lien = `/dossiers/${d.id}`;
      const detail = `${referenceDossier(d)} · ${titre}`;
      for (const o of d.offres) {
        out.push({ id: `o-${o.id}`, date: new Date(o.date), titre: o.auteur === "acheteur" ? "Offre soumise" : "Contre-offre", detail, lien, type: "fait" });
      }
      if (d.dateCompromis) out.push({ id: `c-${d.id}`, date: new Date(d.dateCompromis), titre: "Compromis signé", detail, lien, type: "fait" });
      if (d.dateActe) out.push({ id: `a-${d.id}`, date: new Date(d.dateActe), titre: "Acte signé", detail, lien, type: "fait" });
      if (d.dateLimiteDGID && joursRestantsDGID(d) !== null) {
        out.push({ id: `l-${d.id}`, date: new Date(d.dateLimiteDGID), titre: "Limite enregistrement DGID", detail, lien, type: "delai" });
      }
    }
    for (const v of visites) {
      out.push({ id: `v-${v.id}`, date: new Date(v.date), titre: `Visite · ${v.bienTitre}`, detail: `${LABELS_VISITE[v.statut]}${estCoteVendeur(user.role) ? ` · ${v.acheteurNom}` : ""}`, lien: `/annonces/${v.bienId}`, type: "rdv" });
    }
    for (const r of rdvs) {
      out.push({ id: `r-${r.id}`, rdvId: r.id, date: new Date(r.date), titre: `RDV ${estNotariat(user.role) ? r.clientNom ?? "client" : r.notaireNom}`, detail: r.motif, lien: `/notaires/${r.notaireSlug}`, type: "rdv" });
    }
    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [dossiers, rdvs, visites, biens, user.role]);

  const cases = useMemo(() => {
    const decalage = (mois.getDay() + 6) % 7;
    const debut = new Date(mois.getFullYear(), mois.getMonth(), 1 - decalage);
    return Array.from({ length: 42 }, (_, i) => new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + i));
  }, [mois]);

  const maintenant = new Date();
  const aVenir = evenements.filter((e) => e.date >= new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()));
  function exporterIcs() {
    telecharger(
      "keur-bi-agenda.ics",
      genererIcs(aVenir.map((e) => ({ id: e.id, titre: e.titre, detail: e.detail, date: e.date }))),
      "text/calendar;charset=utf-8",
    );
  }

  // Rapport des évènements à venir, en PDF ou en Excel.
  const TYPES: Record<Evenement["type"], string> = { fait: "Étape", rdv: "Rendez-vous", delai: "Échéance" };
  const tableauAgenda = (): Tableau => ({
    colonnes: ["Date", "Heure", "Type", "Évènement", "Détail"],
    lignes: aVenir.map((e) => [
      e.date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" }),
      e.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      TYPES[e.type],
      e.titre,
      e.detail ?? "",
    ]),
  });
  const exporterAgendaPDF = () =>
    exporterPDF("Agenda_KEUR_BI", {
      titre: "Mon agenda KEUR BI",
      sousTitre: `${user.nom} · ${aVenir.length} évènement${aVenir.length > 1 ? "s" : ""} à venir`,
      paysage: true,
      sections: [{ tableau: tableauAgenda() }],
    });
  const exporterAgendaExcel = () => exporterExcel("Agenda_KEUR_BI", tableauAgenda(), "Agenda");

  const joursAvant = (d: Date) => Math.ceil((d.getTime() - maintenant.getTime()) / 86_400_000);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Calendrier & délais</h1>
          <p className="text-gray-500 text-sm">Vos rendez-vous et les échéances de vos dossiers</p>
        </div>
        <div className="flex gap-2 flex-wrap print:hidden">
          <button onClick={exporterIcs} disabled={aVenir.length === 0} className="btn-navy flex items-center gap-2 text-sm disabled:opacity-50">
            <CalendarPlus size={16} /> Ajouter à mon agenda (.ics)
          </button>
          <BoutonPDF onClick={exporterAgendaPDF} disabled={aVenir.length === 0} libelle="Agenda en PDF" />
          <BoutonExcel onClick={exporterAgendaExcel} disabled={aVenir.length === 0} libelle="Agenda en Excel" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 capitalize">{mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2>
            <div className="flex gap-1 print:hidden">
              <button aria-label="Mois précédent" onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronLeft size={16} /></button>
              <button aria-label="Mois suivant" onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {JOURS.map((j) => <div key={j} className="bg-gray-50 text-center text-xs font-semibold text-gray-500 py-2">{j}</div>)}
            {cases.map((c) => {
              const duJour = evenements.filter((e) => memeJour(e.date, c));
              const horsMois = c.getMonth() !== mois.getMonth();
              const auj = memeJour(c, maintenant);
              return (
                <div key={c.toISOString()} className={`bg-white min-h-20 p-1 ${horsMois ? "opacity-40" : ""}`}>
                  <div className={`text-xs mb-1 w-5 h-5 flex items-center justify-center rounded-full ${auj ? "bg-navy text-white font-bold" : "text-gray-500"}`}>{c.getDate()}</div>
                  {duJour.map((e) => (
                    <Link key={e.id} href={e.lien ?? "#"} title={`${e.titre}${e.detail ? ` · ${e.detail}` : ""}`} className={`block text-[10px] leading-tight font-semibold rounded px-1 py-0.5 mb-0.5 truncate ${COULEURS[e.type]}`}>
                      {e.type === "fait" ? "✓ " : e.type === "delai" ? "⚠ " : "📅 "}{e.titre}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">À venir</h2>
            {aVenir.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucune échéance. <Link href="/notaires" className="text-blue hover:underline">Prendre rendez-vous avec un notaire</Link>
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {aVenir.map((e) => {
                  const j = joursAvant(e.date);
                  const critique = e.type === "delai" && j <= p.alerteDGID2;
                  return (
                    <div key={e.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={e.lien ?? "#"} className="text-sm font-semibold text-gray-800 hover:text-navy block">{e.titre}</Link>
                        {e.detail && <div className="text-xs text-gray-400 truncate">{e.detail}</div>}
                        <div className="text-xs text-gray-500">{e.date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: e.type === "rdv" ? "short" : undefined })}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${critique ? "bg-red/10 text-red" : "bg-gray-100 text-gray-600"}`}>J-{j}</span>
                        {e.rdvId && (
                          <button aria-label={`Annuler ${e.titre}`} onClick={() => annulerRendezVous(e.rdvId!)} className="text-gray-400 hover:text-red"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="card p-5 text-xs text-gray-500">
            <span className="font-semibold text-gray-700 block mb-2">Légende</span>
            <div className="flex flex-col gap-1">
              <span>✓ Étape réalisée</span>
              <span>📅 Rendez-vous</span>
              <span>⚠ Délai légal, à {p.moisEnregistrement} mois après l&apos;acte</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CalendrierPage() {
  return <Protege>{(user) => <Contenu user={user} />}</Protege>;
}
