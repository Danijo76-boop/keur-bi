"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useBiens } from "@/lib/annonces";
import { ETAPES_DOSSIER, joursRestantsDGID, lireDossiers, prixRetenu } from "@/lib/dossiers";
import { Bien, formatFCFA, formatPrix } from "@/lib/mock-data";
import { commissionVente, useParametres } from "@/lib/parametres";
import { useStocke } from "@/lib/stockage";
import { lireDemandesTF, lireOverridesTF, statutTF } from "@/lib/tf";
import { lireUtilisateurs } from "@/lib/utilisateurs";
import { lireSignalements } from "@/lib/moderation";
import { ROLE_LABELS, ROLES } from "@/lib/auth";
import BarresHorizontales from "@/components/BarresHorizontales";

export default function AdminPage() {
  const biens = useBiens();
  const tousBiens = useBiens(true);
  const p = useParametres();
  const dossiers = useStocke(lireDossiers, []);
  const utilisateurs = useStocke(lireUtilisateurs, []);
  const overrides = useStocke(lireOverridesTF, []);
  const demandes = useStocke(lireDemandesTF, []);

  const bienDe = (id: string): Bien | undefined => tousBiens.find((b) => b.id === id);
  const indexActe = ETAPES_DOSSIER.indexOf("actif");
  const conclus = dossiers.filter((d) => ETAPES_DOSSIER.indexOf(d.statut) >= indexActe && !d.incident);
  const volume = conclus.reduce((s, d) => s + (bienDe(d.bienId) ? prixRetenu(d, bienDe(d.bienId)!) : 0), 0);
  const commissions = conclus.reduce((s, d) => s + (bienDe(d.bienId) ? commissionVente(prixRetenu(d, bienDe(d.bienId)!), p) : 0), 0);
  const verifies = biens.filter((b) => statutTF(b, overrides, demandes) === "verifie").length;

  const tuiles = [
    { val: utilisateurs.length, label: "Utilisateurs" },
    { val: biens.length, label: "Annonces actives" },
    { val: dossiers.length - conclus.length, label: "Dossiers en cours" },
    { val: conclus.length, label: "Actes signés" },
    { val: formatPrix(volume), label: "Volume conclu" },
    { val: `${biens.length ? Math.round((verifies / biens.length) * 100) : 0}%`, label: "TF vérifiés" },
  ];

  const parRole = ROLES.map((r) => ({
    label: ROLE_LABELS[r],
    valeur: utilisateurs.filter((u) => u.role === r).length,
  }));

  const parRegion = useMemo(() => {
    const regions = Array.from(new Set(biens.map((b) => b.region)));
    return regions.map((r) => ({ label: r, valeur: biens.filter((b) => b.region === r).length })).sort((a, b) => b.valeur - a.valeur);
  }, [biens]);

  const dgidRisque = dossiers.filter((d) => {
    const j = joursRestantsDGID(d);
    return j !== null && j <= p.alerteDGID2;
  });
  const tfInvalides = demandes.filter((d) => d.statut === "invalide");
  const kycAttente = utilisateurs.filter((u) => u.statutKYC === "en_attente");
  const kycRetard = kycAttente.filter((u) => u.kyc?.soumisLe && (Date.now() - new Date(u.kyc.soumisLe).getTime()) / 3_600_000 > p.delaiKYC);

  const signalements = useStocke(lireSignalements, []);
  const alertes = [
    { n: signalements.filter((s) => s.statut === "ouvert").length, texte: "signalement(s) d'annonce à traiter", lien: "/admin/moderation" },
    { n: dgidRisque.length, texte: `dossier(s) à moins de ${p.alerteDGID2} jours du délai DGID`, lien: "/admin/reporting" },
    // Module cadastre en pause : pas d'alerte renvoyant vers une page fermée.
    ...(p.flags.cadastre ? [{ n: tfInvalides.length, texte: "TF invalide(s)", lien: "/verification-tf" }] : []),
    { n: kycAttente.length, texte: `KYC en attente, dont ${kycRetard.length} depuis plus de ${p.delaiKYC} h`, lien: "/admin/utilisateurs" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Vue d&apos;ensemble</h1>
      <p className="text-gray-500 text-sm mb-6">Données calculées à partir de ce navigateur (démo)</p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {tuiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="text-xl font-extrabold text-navy">{t.val}</div>
            <div className="text-xs text-gray-500">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Répartition des utilisateurs</h2>
          <BarresHorizontales donnees={parRole} />
          <p className="text-xs text-gray-500 mt-3">KYC vérifié : {utilisateurs.filter((u) => u.statutKYC === "verifie").length} sur {utilisateurs.length}</p>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Annonces par région</h2>
          <BarresHorizontales donnees={parRegion} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Revenus estimés</h2>
          <dl className="text-sm flex flex-col gap-2">
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Commissions sur actes signés</dt><dd className="font-semibold text-right">{formatFCFA(commissions)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Vérifications TF prioritaires demandées</dt><dd className="font-semibold text-right">{formatFCFA(demandes.filter((d) => d.prioritaire).length * p.prixTFPrioritaire)}</dd></div>
          </dl>
          <p className="text-xs text-gray-400 mt-2">Estimation : aucun encaissement réel dans cette démo.</p>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Alertes système</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {alertes.map((a) => (
              <li key={a.texte} className="flex items-center justify-between gap-3">
                <span className={a.n > 0 ? "text-gray-800" : "text-gray-400"}>{a.n > 0 ? "⚠" : "✓"} {a.n} {a.texte}</span>
                {a.n > 0 && <Link href={a.lien} className="text-blue font-medium hover:underline shrink-0">Voir →</Link>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
