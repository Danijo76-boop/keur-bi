"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Paperclip, Search, Send } from "lucide-react";
import { User } from "@/lib/auth";
import { conversationsDe, envoyerMessage, marquerLue, nonLus } from "@/lib/messagerie";
import { useStocke } from "@/lib/stockage";
import { useBiens } from "@/lib/annonces";
import { lireDossiers, LABELS_ETAPE, referenceDossier } from "@/lib/dossiers";
import { notaireParSlug } from "@/lib/notaires";
import BandeauDemo from "@/components/BandeauDemo";
import Protege from "@/components/Protege";

function Messagerie({ user }: { user: User }) {
  const router = useRouter();
  const params = useSearchParams();
  const conversations = useStocke(() => conversationsDe(user), [], [user.email, user.role]);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<"tous" | "dossiers" | "notaires">("tous");
  const [texte, setTexte] = useState("");
  const biens = useBiens(true);
  const dossiers = useStocke(lireDossiers, []);

  const idActif = params.get("c");
  const active = conversations.find((c) => c.id === idActif);
  const dossierLie = active?.dossierId ? dossiers.find((d) => d.id === active.dossierId) : undefined;
  const bienLie = active?.bienId ? biens.find((b) => b.id === active.bienId) : undefined;
  const fichiers = active?.messages.filter((m) => m.fichier) ?? [];
  const notaireLie = notaireParSlug(dossierLie?.notaireSlug);

  useEffect(() => {
    if (active) marquerLue(active.id, user.email);
  }, [active, user.email]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return conversations
      .filter((c) => (filtre === "dossiers" ? !!c.dossierId : filtre === "notaires" ? c.avec === "notaire" : true))
      .filter((c) => !q || `${c.sujet} ${c.interlocuteurNom} ${c.acheteurNom}`.toLowerCase().includes(q))
      .sort((a, b) => (b.messages[b.messages.length - 1]?.date ?? "").localeCompare(a.messages[a.messages.length - 1]?.date ?? ""));
  }, [conversations, filtre, recherche]);

  // L'acheteur voit son interlocuteur, l'agence ou le notaire voit l'acheteur.
  const nomAffiche = (c: (typeof conversations)[number]) => (user.role === "acheteur" ? c.interlocuteurNom : c.acheteurNom);

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !texte.trim()) return;
    envoyerMessage(active.id, user, texte.trim());
    setTexte("");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy mb-4">Messagerie</h1>
      <BandeauDemo>
        Démo : les messages restent dans ce navigateur. Changez de rôle pour répondre et les pièces jointes ne transmettent que le nom du fichier.
      </BandeauDemo>
      <div className="card grid md:grid-cols-[20rem_1fr] xl:grid-cols-[18rem_1fr_16rem] h-[70vh]">
        <aside className={`border-r border-gray-100 flex-col min-h-0 ${active ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 mb-2">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                aria-label="Rechercher une conversation"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher…"
                className="w-full text-sm outline-none"
              />
            </div>
            <div className="flex gap-1">
              {(["tous", "dossiers", "notaires"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltre(f)}
                  className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${filtre === f ? "bg-navy text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {visibles.length === 0 && (
              <p className="text-sm text-gray-400 p-6 text-center">
                Aucune conversation. Contactez un vendeur depuis une annonce ou un notaire depuis un dossier.
              </p>
            )}
            {visibles.map((c) => {
              const dernier = c.messages[c.messages.length - 1];
              const n = nonLus(c, user.email);
              return (
                <button
                  key={c.id}
                  onClick={() => router.replace(`/messages?c=${c.id}`)}
                  className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 ${c.id === idActif ? "bg-navy/5" : ""}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-sm text-gray-900 truncate">{nomAffiche(c)}</span>
                    {n > 0 && (
                      <span className="min-w-5 h-5 px-1 bg-gold text-navy-dark text-[11px] font-bold rounded-full flex items-center justify-center shrink-0">
                        {n}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{c.sujet}</div>
                  <div className="text-xs text-gray-500 truncate">{dernier?.texte ?? "Nouvelle conversation"}</div>
                </button>
              );
            })}
          </div>
        </aside>

        {active ? (
          <section className="flex flex-col min-h-0">
            <header className="p-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <button onClick={() => router.replace("/messages")} className="md:hidden text-xs text-blue mb-1">
                  ← Conversations
                </button>
                <div className="font-bold text-sm text-gray-900 truncate">{nomAffiche(active)}</div>
                <div className="text-xs text-gray-400 truncate">{active.sujet}</div>
              </div>
              <div className="flex gap-3 text-xs font-medium shrink-0">
                {active.dossierId && (
                  <Link href={`/dossiers/${active.dossierId}`} className="text-blue hover:underline">
                    Dossier
                  </Link>
                )}
                {!active.dossierId && active.bienId && (
                  <Link href={`/annonces/${active.bienId}`} className="text-blue hover:underline">
                    Annonce
                  </Link>
                )}
                <Link href="/calendrier" className="text-blue hover:underline">
                  Calendrier
                </Link>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50" aria-live="polite">
              {active.messages.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Écrivez le premier message.</p>}
              {active.messages.map((m) => {
                const moi = m.auteurEmail === user.email;
                return (
                  <div key={m.id} className={`max-w-[80%] ${moi ? "self-end" : "self-start"}`}>
                    <div className={`rounded-xl px-3 py-2 text-sm break-words ${moi ? "bg-navy text-white" : "bg-white text-gray-800 shadow-sm"}`}>
                      {m.texte}
                      {m.fichier && <div className={`text-xs mt-1 ${moi ? "text-white/70" : "text-gray-500"}`}>📎 {m.fichier}</div>}
                    </div>
                    <div className={`text-[11px] text-gray-400 mt-0.5 ${moi ? "text-right" : ""}`}>
                      {!moi && `${m.auteurNom} · `}
                      {new Date(m.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={envoyer} className="p-3 border-t border-gray-100 flex items-center gap-2">
              <label className="text-gray-400 hover:text-navy cursor-pointer" aria-label="Joindre un fichier">
                <Paperclip size={18} />
                <input
                  type="file"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) envoyerMessage(active.id, user, "Document joint", f.name);
                    e.target.value = "";
                  }}
                />
              </label>
              <input
                aria-label="Votre message"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Écrire un message…"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
              />
              <button type="submit" aria-label="Envoyer" disabled={!texte.trim()} className="btn-navy px-3 py-2 disabled:opacity-50">
                <Send size={16} />
              </button>
            </form>
          </section>
        ) : (
          <div className="hidden md:flex items-center justify-center text-sm text-gray-400 xl:col-span-2">Sélectionnez une conversation.</div>
        )}
        {active && (
          <aside className="hidden xl:flex flex-col gap-5 border-l border-gray-100 p-4 overflow-y-auto text-sm">
            {(dossierLie || bienLie) && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">{dossierLie ? "Dossier lié" : "Annonce liée"}</h3>
                <div className="font-semibold text-gray-900">{bienLie?.titre}</div>
                {dossierLie && (
                  <div className="text-xs text-gray-400">
                    #{referenceDossier(dossierLie)} · {LABELS_ETAPE[dossierLie.statut]}
                  </div>
                )}
              </div>
            )}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Participants</h3>
              <ul className="flex flex-col gap-1">
                <li className="text-gray-800">
                  {active.acheteurNom} <span className="text-xs text-gray-400">· Acheteur</span>
                </li>
                <li className="text-gray-800">
                  {active.interlocuteurNom} <span className="text-xs text-gray-400">· {active.avec === "notaire" ? "Notaire" : "Vendeur"}</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Actions rapides</h3>
              <div className="flex flex-col gap-1.5">
                {dossierLie && (
                  <Link href={`/dossiers/${dossierLie.id}`} className="text-blue hover:underline">
                    📁 Ouvrir le dossier
                  </Link>
                )}
                {dossierLie && dossierLie.statut === "en_signature" && (
                  <Link href={`/dossiers/${dossierLie.id}/signature`} className="text-blue hover:underline">
                    ✍️ Signer l&apos;acte
                  </Link>
                )}
                {dossierLie && user.role === "acheteur" && dossierLie.offres.some((o) => o.statut === "acceptee") && (
                  <Link href={`/dossiers/${dossierLie.id}/paiement`} className="text-blue hover:underline">
                    💳 Paiement séquestre
                  </Link>
                )}
                {notaireLie && (
                  <Link href={`/notaires/${notaireLie.slug}`} className="text-blue hover:underline">
                    📅 Prendre rendez-vous
                  </Link>
                )}
                <Link href="/calendrier" className="text-blue hover:underline">
                  🗓️ Voir le calendrier
                </Link>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Fichiers partagés ({fichiers.length})</h3>
              {fichiers.length === 0 && <p className="text-xs text-gray-400">Aucun fichier.</p>}
              <ul className="flex flex-col gap-1">
                {fichiers.map((m) => (
                  <li key={m.id} className="text-xs text-gray-600 break-all">
                    📄 {m.fichier}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-400">Chargement…</div>}>
      <Protege>{(user) => <Messagerie user={user} />}</Protege>
    </Suspense>
  );
}
