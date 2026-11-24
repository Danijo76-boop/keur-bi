"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, Info } from "lucide-react";
import { DemandePopup, EVENEMENT_POPUP, TypePopup } from "@/lib/popup";

const DUREE_SUCCES = 4500;

const STYLES: Record<TypePopup, { icone: typeof Info; pastille: string }> = {
  succes: { icone: CheckCircle2, pastille: "bg-green-light/15 text-green-light" },
  erreur: { icone: AlertTriangle, pastille: "bg-red/10 text-red" },
  info: { icone: Info, pastille: "bg-blue/10 text-blue" },
  confirmation: { icone: HelpCircle, pastille: "bg-gold/20 text-gold" },
};

export default function PopupHost() {
  const [file, setFile] = useState<DemandePopup[]>([]);
  const boutonOk = useRef<HTMLButtonElement>(null);
  const courant = file[0];

  useEffect(() => {
    const ajouter = (e: Event) => {
      const p = (e as CustomEvent<DemandePopup>).detail;
      // Une action peut déclencher plusieurs messages : seul le dernier est gardé, les demandes de validation restent.
      setFile((f) => [...f.filter((x) => x.type === "confirmation"), p]);
    };
    window.addEventListener(EVENEMENT_POPUP, ajouter);
    return () => window.removeEventListener(EVENEMENT_POPUP, ajouter);
  }, []);

  const fermer = useCallback((valeur: boolean) => {
    setFile((f) => {
      f[0]?.repondre?.(valeur);
      return f.slice(1);
    });
  }, []);

  useEffect(() => {
    if (!courant) return;
    boutonOk.current?.focus();
    const clavier = (e: KeyboardEvent) => e.key === "Escape" && fermer(false);
    window.addEventListener("keydown", clavier);
    // Une confirmation de réussite se referme seule ; une erreur ou une question attend une réponse.
    const minuteur = courant.type === "succes" ? setTimeout(() => fermer(true), DUREE_SUCCES) : undefined;
    return () => {
      window.removeEventListener("keydown", clavier);
      clearTimeout(minuteur);
    };
  }, [courant, fermer]);

  if (!courant) return null;
  const s = STYLES[courant.type];
  const question = courant.type === "confirmation";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-navy-dark/60 backdrop-blur-[2px] p-4 print:hidden" onClick={() => fermer(false)}>
      <div
        role={question || courant.type === "erreur" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="popup-titre"
        aria-describedby={courant.message ? "popup-message" : undefined}
        onClick={(e) => e.stopPropagation()}
        className="popup-fenetre relative bg-white rounded-3xl w-full max-w-sm p-7 text-center shadow-[0_40px_80px_-24px_rgba(0,0,0,0.6)] overflow-hidden animate-[apparition_0.2s_ease-out]"
      >
        <span className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${s.pastille}`}>
          <s.icone size={32} />
        </span>
        <h2 id="popup-titre" className="text-lg font-bold text-gray-900">
          {courant.titre}
        </h2>
        {courant.message && (
          <p id="popup-message" className="text-sm text-gray-500 mt-1.5 break-words">
            {courant.message}
          </p>
        )}
        <div className="flex gap-3 mt-6">
          {question && (
            <button
              onClick={() => fermer(false)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
          )}
          <button
            ref={boutonOk}
            onClick={() => fermer(true)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${courant.danger ? "bg-red hover:opacity-90" : "bg-navy hover:bg-navy-light"}`}
          >
            {courant.libelleOk ?? (question ? "Confirmer" : "OK")}
          </button>
        </div>
        {courant.type === "succes" && (
          <span
            key={courant.id}
            className="absolute left-0 bottom-0 h-1 bg-green-light/70"
            style={{ animation: `decompte ${DUREE_SUCCES}ms linear forwards` }}
          />
        )}
      </div>
    </div>
  );
}
