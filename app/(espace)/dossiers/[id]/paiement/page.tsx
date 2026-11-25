"use client";
import { Landmark, Smartphone, Banknote, type TypeIcone } from "@/components/icones";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBiens } from "@/lib/annonces";
import { formatFCFA } from "@/lib/mock-data";
import { notaireParSlug } from "@/lib/notaires";
import { calculerFrais, useParametres } from "@/lib/parametres";
import { useStocke } from "@/lib/stockage";
import { declarerPaiement, LABELS_MOYEN, lireDossiers, montantAcompte, MoyenPaiement, pourcentageAcompte, prixRetenu, referenceDossier } from "@/lib/dossiers";
import BandeauDemo from "@/components/BandeauDemo";
import Protege from "@/components/Protege";
import { IconeStatut } from "@/components/Statut";

const MOYENS: { id: MoyenPaiement; icone: TypeIcone; detail: string; instructions: string }[] = [
  {
    id: "virement",
    icone: Landmark,
    detail: "IBAN · Swift",
    instructions: "Le notaire vous communique les coordonnées du compte séquestre. Effectuez le virement en indiquant la référence ci-dessous dans le libellé.",
  },
  {
    id: "mobile_money",
    icone: Smartphone,
    detail: "Mobile money",
    instructions: "Le notaire vous indique le numéro marchand de l'étude. Indiquez la référence ci-dessous dans le motif du transfert.",
  },
  {
    id: "cheque",
    icone: Banknote,
    detail: "Remise au notaire",
    instructions: "Remettez le chèque certifié à l'étude, à l'ordre du compte séquestre, avec la référence ci-dessous.",
  },
];

export default function PaiementPage() {
  const { id } = useParams<{ id: string }>();
  const biens = useBiens(true);
  const dossiers = useStocke(lireDossiers, []);
  const p = useParametres();
  const [moyen, setMoyen] = useState<MoyenPaiement>("virement");
  const [envoye, setEnvoye] = useState(false);

  const dossier = dossiers.find((d) => d.id === id);
  const bien = dossier ? biens.find((b) => b.id === dossier.bienId) : undefined;

  return (
    <Protege roles={["acheteur"]}>
      {() => {
        if (!dossier || !bien) return <div className="py-16 text-center text-gray-400">Dossier introuvable.</div>;
        const accord = dossier.offres.some((o) => o.statut === "acceptee");
        const prix = prixRetenu(dossier, bien);
        const notaire = notaireParSlug(dossier.notaireSlug);
        const paiements = dossier.paiements ?? [];
        const acompteDeja = paiements.some((x) => x.type === "acompte");
        const type = acompteDeja ? "solde" : "acompte";
        const acompte = montantAcompte(dossier, bien, p.acompteMin);
        const montant = type === "acompte" ? acompte : Math.max(prix - paiements.reduce((s, x) => s + x.montant, 0), 0);
        const reference = `${referenceDossier(dossier)}-${type.toUpperCase()}`;
        const frais = calculerFrais(prix, p);
        const instructions = MOYENS.find((m) => m.id === moyen)!;

        return (
          <div className="max-w-5xl mx-auto px-4 py-8">
            <Link href={`/dossiers/${id}`} className="text-sm text-blue hover:underline mb-4 inline-block">
              ← Retour au dossier
            </Link>
            <h1 className="titre-page mb-1">Paiement séquestre · Dossier #{referenceDossier(dossier)}</h1>
            <p className="text-gray-500 text-sm mb-4">Les fonds restent bloqués chez le notaire jusqu&apos;à la signature de l&apos;acte.</p>
            <BandeauDemo>
              Démonstration : aucun paiement n&apos;est traité par KEUR GUI et aucun argent ne circule ici. Vous déclarez un versement, le notaire le confirme.
            </BandeauDemo>

            {!accord ? (
              <div className="card p-8 text-center text-gray-500">Le paiement s&apos;ouvre une fois l&apos;offre acceptée.</div>
            ) : !notaire ? (
              <div className="card p-8 text-center text-gray-500">
                Mandatez d&apos;abord un notaire pour recevoir les fonds.{" "}
                <Link href={`/dossiers/${id}`} className="text-blue hover:underline">
                  Retour au dossier
                </Link>
              </div>
            ) : envoye || montant === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-green font-semibold mb-1">
                  <IconeStatut type="ok" />
                  {montant === 0 && !envoye ? "Tous les versements sont déclarés" : "Versement déclaré"}
                </p>
                <p className="text-sm text-gray-500 mb-4">{notaire.nom} confirmera la réception des fonds sur le dossier.</p>
                <Link href={`/dossiers/${id}`} className="btn-navy text-sm inline-block">
                  Retour au dossier
                </Link>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="card p-5">
                    <dl className="grid sm:grid-cols-3 gap-3 text-sm mb-4">
                      <div>
                        <dt className="text-xs text-gray-400">Bien</dt>
                        <dd className="font-semibold">{bien.titre}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-400">Vendeur</dt>
                        <dd className="font-semibold">{bien.agence}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-400">Notaire séquestre</dt>
                        <dd className="font-semibold">{notaire.nom}</dd>
                      </div>
                    </dl>
                    <div className="bg-navy text-white rounded-lg p-4">
                      <div className="text-xs text-white/70">
                        {type === "acompte" ? `Acompte dû (${pourcentageAcompte(dossier, p.acompteMin)} %)` : "Solde restant"}
                      </div>
                      <div className="text-2xl font-bold text-gold">{formatFCFA(montant)}</div>
                      <div className="text-xs text-white/70">sur {formatFCFA(prix)}</div>
                    </div>
                  </div>

                  <fieldset className="card p-5">
                    <legend className="sr-only">Moyen de paiement</legend>
                    <h2 className="font-bold text-gray-900 mb-3">Moyen de paiement</h2>
                    <div className="grid sm:grid-cols-3 gap-3 mb-4">
                      {MOYENS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={moyen === m.id}
                          onClick={() => setMoyen(m.id)}
                          className={`border rounded-lg p-3 text-left ${moyen === m.id ? "border-navy bg-navy/5" : "border-gray-200"}`}
                        >
                          <m.icone size={20} className="text-navy mb-1" aria-hidden />
                          <div className="text-sm font-semibold text-gray-900">{LABELS_MOYEN[m.id]}</div>
                          <div className="text-xs text-gray-400">{m.detail}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{instructions.instructions}</p>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="text-xs text-gray-400">Référence obligatoire</div>
                      <div className="font-mono font-bold text-navy break-all">{reference}</div>
                    </div>
                  </fieldset>
                </div>

                <aside className="card p-5 h-fit">
                  <h2 className="font-bold text-gray-900 mb-3">Détail des montants</h2>
                  <dl className="text-sm flex flex-col gap-2 mb-4">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Prix de vente</dt>
                      <dd className="font-semibold text-right">{formatFCFA(prix)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Frais à régler à l&apos;acte</dt>
                      <dd className="font-semibold text-right">{formatFCFA(frais.totalFrais)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-gray-100 pt-2">
                      <dt className="font-bold text-navy">À verser maintenant</dt>
                      <dd className="font-bold text-navy text-right">{formatFCFA(montant)}</dd>
                    </div>
                  </dl>
                  <button
                    onClick={() => {
                      declarerPaiement(id, { type, montant, moyen, reference });
                      setEnvoye(true);
                    }}
                    className="btn-primary w-full text-sm"
                  >
                    J&apos;ai effectué le versement
                  </button>
                  <p className="text-xs text-gray-400 mt-2">Remboursement intégral prévu si le TF est invalidé, selon les conditions du compromis.</p>
                </aside>
              </div>
            )}
          </div>
        );
      }}
    </Protege>
  );
}
