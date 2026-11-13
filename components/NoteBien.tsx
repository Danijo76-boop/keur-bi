"use client";
import { useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { enregistrerNote, lireNotes } from "@/lib/preferences";
import { useStocke } from "@/lib/stockage";

// Note privée sur un bien, visible de son auteur seulement (stockée dans ce navigateur).
export default function NoteBien({ id, className = "" }: { id: string; className?: string }) {
  const enregistree = useStocke(() => lireNotes()[id] ?? "", "", [id]);
  const [texte, setTexte] = useState("");
  const [edition, setEdition] = useState(false);

  useEffect(() => {
    setTexte(enregistree);
  }, [enregistree]);

  if (!edition) {
    return (
      <button onClick={() => setEdition(true)} className={`flex items-start gap-1.5 text-xs text-left w-full ${enregistree ? "text-gray-700 bg-gold/10 rounded-lg px-2.5 py-2" : "text-blue font-medium hover:underline"} ${className}`}>
        <StickyNote size={13} className="shrink-0 mt-0.5" />
        <span className="break-words min-w-0">{enregistree || "Ajouter une note personnelle"}</span>
      </button>
    );
  }

  return (
    <form
      className={`flex flex-col gap-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        enregistrerNote(id, texte);
        setEdition(false);
      }}
    >
      <textarea
        autoFocus
        rows={2}
        maxLength={300}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Ex. : proche de l'école, à revisiter le matin…"
        className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-navy resize-none bg-white"
      />
      <div className="flex gap-2 text-xs">
        <button type="submit" className="font-semibold text-white bg-navy rounded-lg px-3 py-1">Enregistrer</button>
        <button type="button" onClick={() => { setTexte(enregistree); setEdition(false); }} className="text-gray-500 px-2 py-1">Annuler</button>
      </div>
    </form>
  );
}
