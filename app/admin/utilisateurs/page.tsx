"use client";
import { useMemo, useState } from "react";
import { Role, ROLE_LABELS, useAuth, ROLES } from "@/lib/auth";
import { lireDossiers } from "@/lib/dossiers";
import { journaliser } from "@/lib/journal";
import { usePeut } from "@/lib/permissions";
import { useStocke } from "@/lib/stockage";
import { deciderKYC, LABELS_KYC, lireUtilisateurs, majUtilisateur, scoreConfiance, StatutKYC, Utilisateur } from "@/lib/utilisateurs";

const select = "border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy bg-white";

function etiquette(u: Utilisateur) {
  return u.suspendu ? "⛔ Suspendu" : LABELS_KYC[u.statutKYC];
}

export default function UtilisateursPage() {
  const { user } = useAuth();
  const utilisateurs = useStocke(lireUtilisateurs, []);
  const dossiers = useStocke(lireDossiers, []);
  const [recherche, setRecherche] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [statut, setStatut] = useState<StatutKYC | "suspendu" | "">("");
  const [selection, setSelection] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const peutGerer = usePeut(user?.role, "admin_utilisateurs");
  const peutKYC = usePeut(user?.role, "admin_kyc");

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return utilisateurs.filter((u) => {
      if (role && u.role !== role) return false;
      if (statut === "suspendu" && !u.suspendu) return false;
      if (statut && statut !== "suspendu" && u.statutKYC !== statut) return false;
      return !q || `${u.nom} ${u.email} ${u.telephone ?? ""}`.toLowerCase().includes(q);
    });
  }, [utilisateurs, recherche, role, statut]);

  const actif = utilisateurs.find((u) => u.email === selection);
  const fileKYC = utilisateurs.filter((u) => u.statutKYC === "en_attente");
  const dossiersActif = actif ? dossiers.filter((d) => d.acheteurEmail === actif.email) : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-4">Utilisateurs & KYC</h1>
      <div className="flex gap-2 flex-wrap mb-4">
        <input aria-label="Rechercher un utilisateur" placeholder="Nom, email, téléphone…" value={recherche} onChange={(e) => setRecherche(e.target.value)} className={`${select} flex-1 min-w-[12rem]`} />
        <select aria-label="Filtrer par rôle" value={role} onChange={(e) => setRole(e.target.value as Role | "")} className={select}>
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select aria-label="Filtrer par statut" value={statut} onChange={(e) => setStatut(e.target.value as typeof statut)} className={select}>
          <option value="">Tous statuts</option>
          <option value="verifie">KYC vérifié</option>
          <option value="en_attente">KYC en attente</option>
          <option value="non_soumis">KYC non soumis</option>
          <option value="suspendu">Suspendu</option>
        </select>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th scope="col" className="p-3 font-semibold">Utilisateur</th>
                <th scope="col" className="p-3 font-semibold">Rôle</th>
                <th scope="col" className="p-3 font-semibold">Statut</th>
                <th scope="col" className="p-3 font-semibold">Inscription</th>
                <th scope="col" className="p-3" />
              </tr>
            </thead>
            <tbody>
              {liste.map((u) => (
                <tr key={u.email} className={`border-b border-gray-50 ${selection === u.email ? "bg-navy/5" : ""}`}>
                  <td className="p-3">
                    <div className="font-semibold text-gray-900">{u.nom}</div>
                    <div className="text-xs text-gray-400">{u.email}{u.telephone && ` · ${u.telephone}`}</div>
                  </td>
                  <td className="p-3 text-gray-600">{ROLE_LABELS[u.role]}</td>
                  <td className="p-3 text-gray-600 whitespace-nowrap">{etiquette(u)}</td>
                  <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(u.inscritLe).toLocaleDateString("fr-FR")}</td>
                  <td className="p-3"><button onClick={() => setSelection(u.email)} className="text-blue font-medium hover:underline">Gérer</button></td>
                </tr>
              ))}
              {liste.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Aucun utilisateur.</td></tr>}
            </tbody>
          </table>
        </div>

        <aside className="flex flex-col gap-4">
          {actif && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-1 break-words">{actif.nom}</h2>
              <p className="text-xs text-gray-400 mb-3 break-all">{actif.email}</p>
              <p className="text-sm mb-3">{etiquette(actif)} · Score {scoreConfiance(actif, dossiersActif.filter((d) => d.statut === "mute").length)}/100</p>
              <label className="text-xs font-semibold text-gray-600 block mb-3">
                Rôle
                <select
                  value={actif.role}
                  disabled={!peutGerer || actif.email === user?.email}
                  onChange={(e) => {
                    const nouveau = e.target.value as Role;
                    majUtilisateur(actif.email, { role: nouveau });
                    journaliser("compte", `Rôle de ${actif.nom} : ${ROLE_LABELS[actif.role]} → ${ROLE_LABELS[nouveau]}`, "/admin/utilisateurs");
                  }}
                  className={`${select} w-full font-normal mt-1`}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </label>
              <dl className="text-sm flex flex-col gap-1 mb-3">
                <div className="flex justify-between"><dt className="text-gray-500">Dossiers</dt><dd className="font-semibold">{dossiersActif.length}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Offres soumises</dt><dd className="font-semibold">{dossiersActif.reduce((s, d) => s + d.offres.filter((o) => o.auteur === "acheteur").length, 0)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">WhatsApp</dt><dd className="font-semibold">{actif.whatsapp ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Dernière connexion</dt><dd className="font-semibold">{actif.derniereConnexion ? new Date(actif.derniereConnexion).toLocaleDateString("fr-FR") : "—"}</dd></div>
              </dl>
              <button
                disabled={!peutGerer || actif.email === user?.email}
                onClick={() => {
                  majUtilisateur(actif.email, { suspendu: !actif.suspendu });
                  journaliser("compte", `Compte ${actif.suspendu ? "réactivé" : "suspendu"} : ${actif.nom}`, "/admin/utilisateurs");
                }}
                className="text-sm font-semibold px-4 py-2 rounded-lg border border-red/30 text-red hover:bg-red/5 disabled:opacity-50 w-full"
              >
                {actif.suspendu ? "Réactiver le compte" : "Suspendre le compte"}
              </button>
              {actif.whatsapp && (
                <button
                  disabled={!peutGerer || actif.email === user?.email}
                  onClick={() => {
                    if (!confirm(`Effacer le numéro WhatsApp de ${actif.nom} ? À sa prochaine connexion, il devra en indiquer un nouveau, vérifié par un code.`)) return;
                    majUtilisateur(actif.email, { whatsapp: null });
                    journaliser("compte", `Numéro WhatsApp remis à zéro : ${actif.nom}`, "/admin/utilisateurs");
                  }}
                  className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 w-full mt-2"
                >
                  Réinitialiser le numéro WhatsApp
                </button>
              )}
              {actif.email === user?.email && <p className="text-xs text-gray-400 mt-1">Vous ne pouvez pas modifier votre propre compte.</p>}
              {!peutGerer && <p className="text-xs text-gray-400 mt-1">Consultation seule : votre rôle n&apos;est pas habilité à gérer les comptes.</p>}
            </div>
          )}

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">File KYC ({fileKYC.length} en attente)</h2>
            {fileKYC.length === 0 && <p className="text-sm text-gray-400">Rien à traiter.</p>}
            {fileKYC.length > 0 && !peutKYC && <p className="text-xs text-gray-400 mb-2">Votre rôle n&apos;est pas habilité à valider les KYC.</p>}
            <div className="flex flex-col gap-3">
              {fileKYC.map((u) => (
                <div key={u.email} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-gray-900">{u.nom}</div>
                  <div className="text-xs text-gray-400 mb-1">{u.kyc?.typeDocument ?? "Document"}{u.kyc?.soumisLe && ` · soumis le ${new Date(u.kyc.soumisLe).toLocaleDateString("fr-FR")}`}</div>
                  <div className="text-xs text-gray-500 mb-2 break-all">{[u.kyc?.recto, u.kyc?.verso, u.kyc?.selfie, u.kyc?.justificatif].filter(Boolean).join(", ") || "Aucune pièce"}</div>
                  <div className="flex gap-2">
                    <button
                      disabled={!peutKYC}
                      onClick={() => {
                        deciderKYC(u.email, "verifie");
                        journaliser("kyc", `KYC validé : ${u.nom}`, "/admin/utilisateurs");
                      }}
                      className="text-xs font-semibold px-3 py-1 rounded-lg bg-green text-white disabled:opacity-40"
                    >
                      Valider
                    </button>
                    <button
                      disabled={!peutKYC}
                      onClick={() => {
                        const raison = motif.trim() || undefined;
                        deciderKYC(u.email, "rejete", raison);
                        journaliser("kyc", `KYC rejeté : ${u.nom}${raison ? ` (${raison})` : ""}`, "/admin/utilisateurs");
                        setMotif("");
                      }}
                      className="text-xs font-semibold px-3 py-1 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
              {fileKYC.length > 0 && (
                <input aria-label="Motif de rejet" placeholder="Motif de rejet (optionnel)" value={motif} onChange={(e) => setMotif(e.target.value)} className={`${select} w-full`} />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
