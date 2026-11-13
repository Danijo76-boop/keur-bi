"use client";
import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ShieldAlert, ShieldCheck, FileClock, TriangleAlert } from "lucide-react";
import { lireRendezVous } from "@/lib/preferences";
import { Bien, formatPrix } from "@/lib/mock-data";
import { useBiens } from "@/lib/annonces";
import { lireOverridesTF, lireDemandesTF, basculerVerificationTF, statutTF, ICONES_TF, LABELS_TF } from "@/lib/tf";
import { lireDossiers, joursRestantsDGID, LABELS_ETAPE, prixRetenu, referenceDossier } from "@/lib/dossiers";
import { useParametres } from "@/lib/parametres";
import { useStocke } from "@/lib/stockage";
import { useAuth } from "@/lib/auth";
import BandeauDemo from "@/components/BandeauDemo";
import ParcoursContrat from "@/components/ParcoursContrat";
import OuvrirDossier from "@/components/OuvrirDossier";

function LigneTF({ bien, verifie, libelle, onToggle }: { bien: Bien; verifie: boolean; libelle: string; onToggle?: (id: string) => void }) {
  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <Link href={`/annonces/${bien.id}`} className="min-w-0">
        <div className="font-semibold text-sm text-gray-900 truncate">{bien.titre}</div>
        <div className="text-xs text-gray-400">
          Réf {bien.reference} · {bien.agence} · {formatPrix(bien.prix)} · {libelle}
        </div>
      </Link>
      {onToggle && <button
        onClick={() => onToggle(bien.id)}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 ${
          verifie ? "border border-gray-200 text-gray-600 hover:bg-gray-50" : "bg-navy text-white hover:bg-navy-light"
        }`}
      >
        {verifie ? "Révoquer" : "Valider le TF"}
      </button>}
    </div>
  );
}

export default function TableauNotaire() {
  const { user } = useAuth();
  // Le clerc prépare les dossiers ; valider ou révoquer un titre reste réservé au notaire.
  const basculerTF = user?.role === "notaire" ? basculerVerificationTF : undefined;
  const biens = useBiens(true);
  const p = useParametres();
  const overrides = useStocke(lireOverridesTF, []);
  const demandes = useStocke(lireDemandesTF, []);
  const dossiers = useStocke(lireDossiers, []);
  const [filtre, setFiltre] = useState<"tous" | "urgents">("tous");
  const rdvs = useStocke(lireRendezVous, []);
  const prochainsRdv = rdvs.filter((r) => new Date(r.date).getTime() >= Date.now()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  const statutDe = (b: Bien) => statutTF(b, overrides, demandes);
  const aVerifier = biens.filter((b) => statutDe(b) !== "verifie");
  const verifies = biens.filter((b) => statutDe(b) === "verifie");

  const estUrgent = (j: number | null) => j !== null && j <= p.alerteDGID1;
  const alertes = dossiers.filter((d) => estUrgent(joursRestantsDGID(d))).sort((a, b) => (joursRestantsDGID(a) ?? 0) - (joursRestantsDGID(b) ?? 0));
  const affiches = filtre === "urgents" ? alertes : dossiers;

  const tuiles = [
    { label: "Dossiers actifs", val: dossiers.filter((d) => d.statut !== "mute" && !d.incident).length },
    { label: "Alertes DGID", val: alertes.length },
    ...(p.flags.cadastre ? [{ label: "TF en vérification", val: demandes.filter((d) => d.statut === "en_verification").length }] : []),
    { label: "Dossiers clôturés", val: dossiers.filter((d) => d.statut === "mute").length },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tuiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="text-2xl font-extrabold text-navy">{t.val}</div>
            <div className="text-xs text-gray-500">{t.label}</div>
          </div>
        ))}
      </div>

      {alertes.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TriangleAlert size={18} className="text-red" /> Alertes DGID, action requise
          </h2>
          <div className="flex flex-col gap-2">
            {alertes.map((d) => {
              const j = joursRestantsDGID(d)!;
              const bien = biens.find((b) => b.id === d.bienId);
              return (
                <Link key={d.id} href={`/dossiers/${d.id}`} className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow border-l-4 border-red">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${j <= p.alerteDGID2 ? "bg-red text-white" : "bg-gold/20 text-navy-dark"}`}>{j >= 0 ? `J-${j}` : "Dépassé"}</span>
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-gray-900 block truncate">#{referenceDossier(d)} · {bien?.titre}</span>
                    <span className="text-xs text-gray-500">Limite d&apos;enregistrement : {new Date(d.dateLimiteDGID!).toLocaleDateString("fr-FR")}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays size={18} className="text-blue" /> Agenda
          </h2>
          <Link href="/calendrier" className="text-sm text-blue font-medium hover:underline">Voir le calendrier →</Link>
        </div>
        {prochainsRdv.length === 0 ? (
          <div className="card p-6 text-center text-gray-400">Aucun rendez-vous à venir.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {prochainsRdv.map((r) => (
              <div key={r.id} className="card p-4 text-sm">
                <span className="font-semibold text-gray-900 capitalize">{new Date(r.date).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="text-gray-500"> · {r.motif} · {r.clientNom ?? "Client"} · {r.notaireNom}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileClock size={18} className="text-navy" /> Dossiers ({dossiers.length})
          </h2>
          <div className="flex gap-1">
            {(["tous", "urgents"] as const).map((f) => (
              <button key={f} onClick={() => setFiltre(f)} className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${filtre === f ? "bg-navy text-white" : "text-gray-500 hover:bg-gray-100"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="mb-4"><OuvrirDossier /></div>
        {affiches.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Aucun dossier.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {affiches.map((d) => {
              const bien = biens.find((b) => b.id === d.bienId);
              if (!bien) return null;
              return (
                <Link key={d.id} href={`/dossiers/${d.id}`} className="card p-4 block hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="font-semibold text-sm text-gray-900">
                      #{referenceDossier(d)} · {bien.titre} <span className="text-gray-400 font-normal">· {d.acheteurNom} · {formatPrix(prixRetenu(d, bien))}</span>
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy/10 text-navy shrink-0">{LABELS_ETAPE[d.statut]}</span>
                  </div>
                  <ParcoursContrat statut={d.statut} />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Module cadastre en pause : la validation des titres n'est pas proposée. */}
      {p.flags.cadastre && (
      <>
      <section>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert size={18} className="text-gold" /> Titres à vérifier ({aVerifier.length})
          </h2>
          <Link href="/verification-tf" className="text-sm text-blue font-medium hover:underline">Gérer les vérifications →</Link>
        </div>
        {!basculerTF && <p className="text-sm text-gray-500 mb-3">La validation des titres est réservée au notaire de l&apos;étude.</p>}
        <BandeauDemo>Démo : la validation est enregistrée localement dans votre navigateur et se reflète immédiatement sur les annonces.</BandeauDemo>
        {aVerifier.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Tous les titres sont à jour.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {aVerifier.map((b) => (
              <LigneTF key={b.id} bien={b} verifie={false} libelle={`${ICONES_TF[statutDe(b)]} ${LABELS_TF[statutDe(b)]}`} onToggle={basculerTF} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShieldCheck size={18} className="text-green-light" /> Titres vérifiés ({verifies.length})
        </h2>
        <div className="flex flex-col gap-2">
          {verifies.map((b) => (
            <LigneTF key={b.id} bien={b} verifie libelle="✅ Vérifié" onToggle={basculerTF} />
          ))}
        </div>
      </section>
      </>
      )}
    </div>
  );
}
