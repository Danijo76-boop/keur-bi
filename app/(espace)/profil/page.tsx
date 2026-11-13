"use client";
import { popup } from "@/lib/popup";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ROLE_LABELS, useAuth, User } from "@/lib/auth";
import { useBiens } from "@/lib/annonces";
import { LABELS_ETAPE, lireDossiers, prixRetenu } from "@/lib/dossiers";
import { formatFCFA } from "@/lib/mock-data";
import { useStocke } from "@/lib/stockage";
import { chargerUtilisateurs, detailScore, LABELS_KYC, majUtilisateur, scoreConfiance, trouverUtilisateur } from "@/lib/utilisateurs";
import Protege from "@/components/Protege";
import Rattachement from "@/components/Rattachement";

const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal";

function Contenu({ user }: { user: User }) {
  const { majProfil } = useAuth();
  const biens = useBiens(true);
  const profil = useStocke(() => trouverUtilisateur(user.email), undefined, [user.email]);
  const dossiers = useStocke(() => lireDossiers().filter((d) => d.acheteurEmail === user.email), [], [user.email]);
  const [nom, setNom] = useState(user.nom);
  const [telephone, setTelephone] = useState("");
  const [ville, setVille] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setTelephone(profil?.telephone ?? "");
    setVille(profil?.ville ?? "");
  }, [profil?.telephone, profil?.ville]);

  const transactions = dossiers.filter((d) => d.statut === "mute").length;
  const score = scoreConfiance(profil, transactions);
  const lignes = detailScore(profil, transactions);
  const appreciation = score >= 80 ? "Excellent" : score >= 50 ? "Bon" : "À compléter";

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const resultat = await majProfil({ nom: nom.trim(), telephone: telephone.trim(), ville: ville.trim() });
    if (!resultat.ok) return popup.erreur("Profil non enregistré", resultat.erreur);
    chargerUtilisateurs();
    popup.succes("Profil enregistré");
    setOk(true);
  }

  const pieces = [
    { label: "Pièce d'identité", fichier: profil?.kyc?.recto },
    { label: "Selfie de contrôle", fichier: profil?.kyc?.selfie },
    { label: "Justificatif de domicile", fichier: profil?.kyc?.justificatif },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy">Mon profil</h1>
      <p className="text-gray-500 text-sm mb-6">{ROLE_LABELS[user.role]} · Gérez vos informations et vos documents KYC</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card p-5 flex items-center gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-full bg-navy text-gold font-extrabold text-2xl flex items-center justify-center shrink-0" aria-hidden>{score}</div>
            <div className="flex-1 min-w-[12rem]">
              <h2 className="font-bold text-gray-900">Score de confiance : {score}/100</h2>
              <p className="text-sm text-gray-500 mb-2">{appreciation}</p>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {lignes.map((l) => (
                  <li key={l.label} className={l.acquis ? "text-green" : "text-gray-400"}>{l.acquis ? "✓" : "○"} {l.label} (+{l.points})</li>
                ))}
              </ul>
            </div>
          </div>

          <form onSubmit={enregistrer} className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Informations personnelles</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <label className="text-sm font-semibold text-gray-700">Nom complet<input required value={nom} onChange={(e) => { setNom(e.target.value); setOk(false); }} className={champ} /></label>
              <label className="text-sm font-semibold text-gray-700">Email<input value={user.email} disabled className={`${champ} bg-gray-50 text-gray-500`} /></label>
              <label className="text-sm font-semibold text-gray-700">Téléphone<input type="tel" value={telephone} onChange={(e) => { setTelephone(e.target.value); setOk(false); }} className={champ} /></label>
              <label className="text-sm font-semibold text-gray-700">Ville<input value={ville} onChange={(e) => { setVille(e.target.value); setOk(false); }} className={champ} /></label>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="btn-navy text-sm">Enregistrer les modifications</button>
              {ok && <span className="text-sm text-green font-semibold">Enregistré</span>}
            </div>
          </form>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Historique des transactions</h2>
            {dossiers.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune transaction pour le moment.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {dossiers.map((d) => {
                  const b = biens.find((x) => x.id === d.bienId);
                  if (!b) return null;
                  return (
                    <Link key={d.id} href={`/dossiers/${d.id}`} className="flex items-center justify-between gap-3 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block font-semibold text-gray-800 truncate">{b.titre}</span>
                        <span className="block text-xs text-gray-400">{new Date(d.dateOuverture).toLocaleDateString("fr-FR")} · {LABELS_ETAPE[d.statut]}</span>
                      </span>
                      <span className="font-bold text-navy shrink-0">{formatFCFA(prixRetenu(d, b))}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-1">Pièces justificatives (KYC)</h2>
            <p className="text-sm font-semibold text-gray-700 mb-3">{LABELS_KYC[profil?.statutKYC ?? "non_soumis"]}</p>
            <div className="flex flex-col gap-2 mb-3">
              {pieces.map((x) => (
                <div key={x.label} className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <div className="font-semibold text-gray-800">{x.label}</div>
                  <div className="text-xs text-gray-400 break-all">{x.fichier ?? "Non fourni"}</div>
                </div>
              ))}
              <label className="bg-gray-50 rounded-lg px-3 py-2 text-sm cursor-pointer block">
                <span className="font-semibold text-gray-800 block">Relevé bancaire (optionnel)</span>
                <span className="text-xs text-gray-400 break-all block">{profil?.releveBancaire ?? "Renforce votre score · cliquez pour ajouter"}</span>
                <input
                  type="file"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) majUtilisateur(user.email, { releveBancaire: f.name });
                  }}
                />
              </label>
            </div>
            {profil?.statutKYC !== "verifie" && profil?.statutKYC !== "en_attente" && (
              <Link href="/kyc" className="btn-navy text-sm w-full text-center block">Vérifier mon identité</Link>
            )}
          </div>
          <Rattachement email={user.email} role={user.role} />
          {(user.role === "agence" || user.role === "notaire") && (
            <div className="card p-5 text-sm">
              <h2 className="font-bold text-gray-900 mb-1">Mon abonnement</h2>
              <p className="text-gray-600 mb-2 capitalize">{(profil?.plan ?? (user.role === "agence" ? "gratuit" : "aucun")).replace("_", " ")}</p>
              <Link href="/tarifs" className="text-blue hover:underline">Changer de plan</Link>
            </div>
          )}
          <div className="card p-5 text-sm flex flex-col gap-2">
            <h2 className="font-bold text-gray-900">Raccourcis</h2>
            <Link href="/favoris" className="text-blue hover:underline">Mes favoris</Link>
            <Link href="/notifications" className="text-blue hover:underline">Mes alertes et notifications</Link>
            <Link href="/calendrier" className="text-blue hover:underline">Mon calendrier</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ProfilPage() {
  return <Protege>{(user) => <Contenu user={user} />}</Protege>;
}
