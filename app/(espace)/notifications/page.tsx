"use client";
import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { User } from "@/lib/auth";
import { CategorieNotif, useNotifications } from "@/lib/notifications";
import {
  Canaux,
  creerAlerte,
  ecrireCanaux,
  lireAlertes,
  lireCanaux,
  marquerLues,
  resumeCriteres,
  supprimerAlerte,
  urlRecherche,
} from "@/lib/preferences";
import { useStocke } from "@/lib/stockage";
import { trouverUtilisateur } from "@/lib/utilisateurs";
import BandeauDemo from "@/components/BandeauDemo";
import Protege from "@/components/Protege";

const ONGLETS: { id: CategorieNotif | "tout"; label: string }[] = [
  { id: "tout", label: "Tout" },
  { id: "urgent", label: "⚠ Urgents" },
  { id: "dossier", label: "📋 Dossiers" },
  { id: "annonce", label: "🏠 Annonces" },
  { id: "message", label: "💬 Messages" },
];

const REGIONS = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack"];

function Contenu({ user }: { user: User }) {
  const notifs = useNotifications(user);
  const alertes = useStocke(() => lireAlertes(user.email), [], [user.email]);
  const canaux = useStocke(lireCanaux, { email: true, sms: false, whatsapp: false });
  const profil = useStocke(() => trouverUtilisateur(user.email), undefined, [user.email]);
  const [onglet, setOnglet] = useState<CategorieNotif | "tout">("tout");
  const [creation, setCreation] = useState(false);
  const [transaction, setTransaction] = useState<"vente" | "location">("vente");
  const [region, setRegion] = useState("");
  const [prixMax, setPrixMax] = useState("");
  const [frequence, setFrequence] = useState<"Quotidien" | "Hebdomadaire">("Quotidien");

  const affichees = notifs.filter((n) => onglet === "tout" || n.categorie === onglet);
  const nonLues = notifs.filter((n) => !n.lue);

  function creer(e: React.FormEvent) {
    e.preventDefault();
    const criteres = { transaction: transaction === "location" ? ("location" as const) : undefined, region: region || undefined, prixMax: prixMax ? Number(prixMax) : undefined };
    creerAlerte(user.email, resumeCriteres(criteres), criteres, frequence);
    setCreation(false);
    setRegion("");
    setPrixMax("");
  }

  const lignesCanaux: { id: keyof Canaux; label: string; detail: string }[] = [
    { id: "email", label: "Email", detail: user.email },
    { id: "sms", label: "SMS", detail: profil?.telephone ?? "Téléphone non renseigné" },
    { id: "whatsapp", label: "WhatsApp", detail: profil?.telephone ?? "Téléphone non renseigné" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Notifications</h1>
          <p className="text-gray-500 text-sm">{nonLues.length} non lues</p>
        </div>
        <button onClick={() => marquerLues(notifs.map((n) => n.id))} className="text-sm text-blue font-medium hover:underline">
          Tout marquer comme lu
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex gap-2 flex-wrap mb-4">
            {ONGLETS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOnglet(o.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border ${onglet === o.id ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200"}`}
              >
                {o.label} ({o.id === "tout" ? notifs.length : notifs.filter((n) => n.categorie === o.id).length})
              </button>
            ))}
          </div>
          {affichees.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">Rien à signaler pour le moment.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {affichees.map((n) => (
                <div key={n.id} className={`card p-4 border-l-4 ${n.categorie === "urgent" ? "border-red" : n.lue ? "border-gray-100" : "border-blue"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-sm text-gray-900 ${n.lue ? "font-medium" : "font-bold"}`}>{n.titre}</div>
                      <p className="text-sm text-gray-600 mt-0.5 break-words">{n.detail}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-gray-400">{new Date(n.date).toLocaleDateString("fr-FR")}</span>
                        {n.lien && (
                          <Link href={n.lien} onClick={() => marquerLues([n.id])} className="text-blue font-medium hover:underline">
                            {n.action ?? "Voir"}
                          </Link>
                        )}
                      </div>
                    </div>
                    {!n.lue && (
                      <button onClick={() => marquerLues([n.id])} className="text-xs text-gray-400 hover:text-navy shrink-0">Marquer lu</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Mes alertes de recherche</h2>
            {alertes.length === 0 && <p className="text-sm text-gray-400 mb-3">Aucune alerte.</p>}
            <div className="flex flex-col gap-2 mb-3">
              {alertes.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-lg p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 break-words">{a.nom}</div>
                    <div className="text-xs text-gray-400">
                      {a.frequence} · <Link href={urlRecherche(a.criteres)} className="text-blue font-medium hover:underline">Voir les annonces</Link>
                    </div>
                  </div>
                  <button onClick={() => supprimerAlerte(a.id)} aria-label={`Supprimer l'alerte ${a.nom}`} className="text-gray-400 hover:text-red shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            {creation ? (
              <form onSubmit={creer} className="flex flex-col gap-2">
                <select aria-label="Achat ou location" value={transaction} onChange={(e) => setTransaction(e.target.value as typeof transaction)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy">
                  <option value="vente">Acheter</option>
                  <option value="location">Louer</option>
                </select>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy">
                  <option value="">Toutes les régions</option>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <input type="number" placeholder={transaction === "location" ? "Loyer max (FCFA)" : "Budget max (FCFA)"} value={prixMax} onChange={(e) => setPrixMax(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy" />
                <select value={frequence} onChange={(e) => setFrequence(e.target.value as typeof frequence)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy">
                  <option>Quotidien</option>
                  <option>Hebdomadaire</option>
                </select>
                <button type="submit" className="btn-navy text-sm">Créer l&apos;alerte</button>
              </form>
            ) : (
              <button onClick={() => setCreation(true)} className="text-sm text-blue font-medium hover:underline">+ Créer une alerte</button>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Canaux de notification</h2>
            <BandeauDemo>Préférences enregistrées, mais aucun email, SMS ni WhatsApp n&apos;est envoyé dans cette démo.</BandeauDemo>
            <div className="flex flex-col gap-3">
              {lignesCanaux.map((c) => (
                <label key={c.id} className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-800">{c.label}</span>
                    <span className="block text-xs text-gray-400 truncate">{c.detail}</span>
                  </span>
                  <input
                    type="checkbox"
                    className="accent-navy w-4 h-4 shrink-0"
                    checked={canaux[c.id]}
                    onChange={(e) => ecrireCanaux({ ...canaux, [c.id]: e.target.checked })}
                  />
                </label>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return <Protege>{(user) => <Contenu user={user} />}</Protege>;
}
