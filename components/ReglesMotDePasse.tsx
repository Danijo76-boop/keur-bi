"use client";
import { Check, X } from "lucide-react";
import { REGLES_MOT_DE_PASSE } from "@/lib/auth";

// Liste des règles du mot de passe, cochées au fil de la saisie : la personne voit tout de suite ce qui manque.
export default function ReglesMotDePasse({ motDePasse, email }: { motDePasse: string; email: string }) {
  return (
    <ul className="text-xs flex flex-col gap-0.5 -mt-1" aria-label="Règles du mot de passe">
      {REGLES_MOT_DE_PASSE.map((r) => {
        const ok = r.test(motDePasse, email);
        return (
          <li key={r.texte} className={`flex items-center gap-1.5 ${ok ? "text-green-700" : "text-gray-500"}`}>
            {ok ? <Check size={13} aria-hidden /> : <X size={13} aria-hidden />}
            <span>{r.texte}</span>
            <span className="sr-only">{ok ? " : respecté" : " : manquant"}</span>
          </li>
        );
      })}
    </ul>
  );
}
