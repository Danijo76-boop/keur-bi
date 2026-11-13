"use client";
import Link from "next/link";
import { Building2, Inbox, FileText, Plus, Lightbulb, TriangleAlert } from "lucide-react";
import { formatPrix } from "@/lib/mock-data";
import { useState } from "react";
import { useBiens, useMetasAnnonces } from "@/lib/annonces";
import { lireMessages } from "@/lib/messages";
import { lireDossiers, LABELS_ETAPE, joursAvantExpiration, joursRestantsDGID, repondreOffre } from "@/lib/dossiers";
import { useParametres } from "@/lib/parametres";
import { useStocke } from "@/lib/stockage";
import BandeauDemo from "@/components/BandeauDemo";
import ParcoursContrat from "@/components/ParcoursContrat";
import ListeVisites from "@/components/ListeVisites";
import { User } from "@/lib/auth";
import TFBadge from "@/components/TFBadge";

export default function TableauAgence({ user }: { user: User }) {
  // Chaque vendeur gère les annonces qu'il a publiées.
  const biens = useBiens(true).filter((b) => b.auteurEmail === user.email);
  const p = useParametres();
  const messages = useStocke(lireMessages, []);
  const dossiers = useStocke(lireDossiers, []);
  const metas = useMetasAnnonces();
  const [archives, setArchives] = useState(false);
  const affichees = biens.filter((b) => !!metas[b.id]?.depublie === archives);
  const nbArchivees = biens.filter((b) => metas[b.id]?.depublie).length;

  const offresAttente = dossiers.flatMap((d) =>
    d.offres
      .filter((o) => o.statut === "en_attente" && o.auteur === "acheteur" && joursAvantExpiration(o, p.validiteOffre) >= 0)
      .map((o) => ({ o, d, bien: biens.find((b) => b.id === d.bienId) })),
  );

  const tuiles = [
    { label: "Annonces actives", val: biens.length - nbArchivees },
    { label: "Offres en attente", val: offresAttente.length },
    { label: "Dossiers en cours", val: dossiers.length },
    { label: "Vues cumulées", val: biens.reduce((s, b) => s + b.nb_vues, 0).toLocaleString("fr-FR") },
    { label: "Ventes conclues", val: dossiers.filter((d) => d.statut === "enregistre" || d.statut === "mute").length },
  ];

  return (
    <div className="flex flex-col gap-8">
      <BandeauDemo>Démo : sans vrais comptes, un compte Agence voit toutes les annonces et tous les dossiers de la plateforme.</BandeauDemo>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {tuiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="text-2xl font-extrabold text-navy">{t.val}</div>
            <div className="text-xs text-gray-500">{t.label}</div>
          </div>
        ))}
      </div>

      {offresAttente.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">🔔 Offres en attente de réponse</h2>
          <div className="flex flex-col gap-2">
            {offresAttente.map(({ o, d, bien }) => (
              <div key={o.id} className="card p-4 flex items-center justify-between gap-4 flex-wrap border-l-4 border-gold">
                <Link href={`/dossiers/${d.id}`} className="min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{bien?.titre ?? "Bien"}</div>
                  <div className="text-xs text-gray-500">
                    {d.acheteurNom} propose {formatPrix(o.montant)} · Expire dans {joursAvantExpiration(o, p.validiteOffre)} j
                  </div>
                </Link>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => repondreOffre(d.id, o.id, "acceptee")} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green text-white">Accepter</button>
                  <Link href={`/dossiers/${d.id}`} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Contre-offre</Link>
                  <button onClick={() => repondreOffre(d.id, o.id, "refusee")} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Refuser</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ListeVisites user={user} />

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-navy" /> Dossiers en cours ({dossiers.length})
        </h2>
        {dossiers.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Aucun dossier ouvert pour le moment.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {dossiers.map((d) => {
              const bien = biens.find((b) => b.id === d.bienId);
              if (!bien) return null;
              const joursDGID = joursRestantsDGID(d);
              return (
                <Link key={d.id} href={`/dossiers/${d.id}`} className="card p-4 block hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="font-semibold text-sm text-gray-900">
                      {bien.titre} <span className="text-gray-400 font-normal">· {d.acheteurNom}</span>
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy/10 text-navy shrink-0">{LABELS_ETAPE[d.statut]}</span>
                  </div>
                  <ParcoursContrat statut={d.statut} />
                  {joursDGID !== null && joursDGID <= p.alerteDGID2 && (
                    <p className="text-xs font-semibold text-red mt-2 flex items-center gap-1">
                      <TriangleAlert size={12} /> {joursDGID >= 0 ? `J-${joursDGID} délai DGID` : `Délai DGID dépassé`}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 size={18} className="text-navy" /> Mes annonces
            </h2>
            <div className="flex gap-1 mr-auto">
              <button onClick={() => setArchives(false)} className={`text-xs font-medium px-3 py-1 rounded-full ${!archives ? "bg-navy text-white" : "text-gray-500 hover:bg-gray-100"}`}>Actives ({biens.length - nbArchivees})</button>
              <button onClick={() => setArchives(true)} className={`text-xs font-medium px-3 py-1 rounded-full ${archives ? "bg-navy text-white" : "text-gray-500 hover:bg-gray-100"}`}>Archivées ({nbArchivees})</button>
            </div>
            <Link href="/publier" className="btn-primary text-sm px-3 py-2 flex items-center gap-1"><Plus size={15} /> Publier</Link>
          </div>
          <div className="flex flex-col gap-2">
            {affichees.length === 0 && <div className="card p-8 text-center text-gray-400">Aucune annonce ici.</div>}
            {affichees.map((b) => {
              const offres = dossiers.filter((d) => d.bienId === b.id).reduce((s, d) => s + d.offres.filter((o) => o.auteur === "acheteur").length, 0);
              return (
                <Link key={b.id} href={`/mes-annonces/${b.id}`} className="card p-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{b.titre}</div>
                    <div className="text-xs text-gray-400 mb-1">{b.agence} · {b.ville} · {b.nb_vues} vues · {offres} offre{offres > 1 ? "s" : ""}</div>
                    <div className="flex"><TFBadge bien={b} /></div>
                  </div>
                  <div className="text-navy font-bold text-sm shrink-0">{formatPrix(b.prix)}</div>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Actions rapides</h2>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/publier" className="text-blue hover:underline">➕ Publier une nouvelle annonce</Link>
              <Link href="/profil" className="text-blue hover:underline">👤 Compléter mon profil vendeur</Link>
              <Link href="/frais" className="text-blue hover:underline">🧮 Simuler les frais de vente</Link>
              <Link href="/tarifs" className="text-blue hover:underline">⭐ Voir les abonnements</Link>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Lightbulb size={16} className="text-gold" /> Conseils pour vendre plus vite</h2>
            <ul className="text-sm text-gray-600 flex flex-col gap-1">
              <li>✓ Publiez des photos nettes et lumineuses</li>
              <li>✓ Faites vérifier votre TF dès la publication</li>
              <li>✓ Comparez votre prix au <Link href="/statistiques" className="text-blue hover:underline">marché</Link></li>
            </ul>
          </div>
        </aside>
      </div>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Inbox size={18} className="text-blue" /> Messages reçus ({messages.length})
        </h2>
        {messages.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Aucun message reçu pour le moment.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.slice(0, 5).map((m) => (
              <div key={m.id} className="card p-4">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="font-semibold text-sm text-gray-900">{m.bienTitre ?? m.agence}</span>
                  <span className="text-xs text-gray-400 shrink-0">{new Date(m.date).toLocaleDateString("fr-FR")}</span>
                </div>
                <p className="text-sm text-gray-600 break-words">{m.message}</p>
                <p className="text-xs text-gray-400 mt-1">De {m.nom} — {m.contact}</p>
              </div>
            ))}
            <Link href="/messages" className="text-sm text-blue font-medium hover:underline">Ouvrir la messagerie →</Link>
          </div>
        )}
      </section>
    </div>
  );
}
