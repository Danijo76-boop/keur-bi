"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "@/components/icones";

/* ── Assistant KEUR GUI ──
   Bulle en bas à droite de chaque page. Les questions partent vers /api/assistant, la réponse s'affiche au fil de l'eau.
   La conversation est gardée pendant la visite (sessionStorage), jamais en base. */

type Message = { role: "user" | "assistant"; content: string };

const CLE = "keurgui_assistant";
const SUGGESTIONS = [
  "Une villa à Dakar à moins de 150 M FCFA ?",
  "Comment faire une offre d'achat ?",
  "Que vérifier sur un Titre Foncier ?",
  "Je vis à l'étranger, comment acheter ?",
];
const ACCUEIL =
  "Bonjour ! Je suis l'assistant KEUR GUI. Je peux vous aider à trouver un bien, comprendre les étapes d'un achat ou utiliser le site. Que cherchez-vous ?";

// Liens Markdown [texte](/chemin) et **gras** : le reste est affiché tel quel. Seuls les liens internes sont rendus cliquables.
function Texte({ contenu }: { contenu: string }) {
  const morceaux = contenu.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*)/g);
  return (
    <>
      {morceaux.map((m, i) => {
        const lien = m.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (lien) {
          return lien[2].startsWith("/") && !lien[2].startsWith("//") ? (
            <Link key={i} href={lien[2]} className="font-semibold text-blue underline underline-offset-2">
              {lien[1]}
            </Link>
          ) : (
            <Fragment key={i}>{lien[1]}</Fragment>
          );
        }
        const gras = m.match(/^\*\*([^*]+)\*\*$/);
        return gras ? <strong key={i}>{gras[1]}</strong> : <Fragment key={i}>{m}</Fragment>;
      })}
    </>
  );
}

export default function Assistant() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const fil = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const garde = sessionStorage.getItem(CLE);
      if (garde) setMessages(JSON.parse(garde));
    } catch {
      /* stockage indisponible : la conversation repart de zéro */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLE, JSON.stringify(messages.slice(-30)));
    } catch {
      /* rien à faire */
    }
    fil.current?.scrollTo({ top: fil.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (ouvert) champ.current?.focus();
  }, [ouvert]);

  async function envoyer(question: string) {
    const texte = question.trim();
    if (!texte || enCours) return;
    const historique: Message[] = [...messages, { role: "user", content: texte }];
    setMessages([...historique, { role: "assistant", content: "" }]);
    setSaisie("");
    setEnCours(true);
    const ajouter = (morceau: string) =>
      setMessages((m) => {
        const copie = [...m];
        copie[copie.length - 1] = { role: "assistant", content: copie[copie.length - 1].content + morceau };
        return copie;
      });
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historique.filter((m) => m.content) }),
      });
      if (!r.ok || !r.body) {
        const d = await r.json().catch(() => null);
        ajouter(d?.erreur ?? "L'assistant est momentanément indisponible. Réessayez dans un instant.");
        return;
      }
      const lecteur = r.body.getReader();
      const decodeur = new TextDecoder();
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        ajouter(decodeur.decode(value, { stream: true }));
      }
    } catch {
      ajouter("Connexion perdue. Vérifiez votre réseau et réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  if (chemin?.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] print:hidden flex flex-col items-end gap-3">
      {ouvert && (
        <section
          aria-label="Assistant KEUR GUI"
          className="w-[calc(100vw-2rem)] sm:w-96 h-[min(34rem,calc(100vh-7rem))] bg-white rounded-2xl shadow-flottant border border-gray-100 flex flex-col overflow-hidden"
        >
          <header className="bg-navy-dark text-white px-4 py-3 flex items-center gap-3">
            <Image src="/logo.png" alt="" width={36} height={36} className="w-9 h-9 rounded-lg ring-1 ring-white/15" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Assistant KEUR GUI</div>
              <div className="text-xs text-white/60">Réponses automatiques, à vérifier avant de vous engager</div>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={() => setMessages([])} disabled={enCours} className="text-xs text-white/70 hover:text-white disabled:opacity-40">
                Effacer
              </button>
            )}
            <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer l'assistant" className="text-white/70 hover:text-white p-1">
              <X size={18} />
            </button>
          </header>

          <div ref={fil} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 text-sm" aria-live="polite">
            <p className="bg-gray-50 text-gray-800 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] whitespace-pre-line">{ACCUEIL}</p>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => envoyer(s)}
                    className="text-xs border border-gray-200 rounded-full px-3 py-1.5 text-gray-700 hover:bg-gray-50 text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <p key={i} className="self-end bg-navy text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] whitespace-pre-line">
                  {m.content}
                </p>
              ) : (
                <p key={i} className="bg-gray-50 text-gray-800 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] whitespace-pre-line">
                  {m.content ? <Texte contenu={m.content} /> : <span className="text-gray-400">L&apos;assistant réfléchit…</span>}
                </p>
              ),
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              envoyer(saisie);
            }}
            className="border-t border-gray-100 p-2 flex items-end gap-2"
          >
            <textarea
              ref={champ}
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  envoyer(saisie);
                }
              }}
              rows={1}
              maxLength={1500}
              placeholder="Posez votre question…"
              aria-label="Votre question"
              className="flex-1 resize-none max-h-28 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-navy"
            />
            <button type="submit" disabled={enCours || !saisie.trim()} aria-label="Envoyer" className="btn-primary px-3 py-2 disabled:opacity-40">
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-label={ouvert ? "Fermer l'assistant" : "Ouvrir l'assistant KEUR GUI"}
        className="w-14 h-14 rounded-full bg-gold text-navy-dark shadow-flottant flex items-center justify-center hover:bg-gold-light transition-colors"
      >
        {ouvert ? <X size={24} /> : <MessageCircle size={26} />}
      </button>
    </div>
  );
}
