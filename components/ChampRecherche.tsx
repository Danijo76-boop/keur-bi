"use client";
import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, MapPin } from "@/components/icones";
import { useBiens } from "@/lib/annonces";
import { suggestions, type Suggestion } from "@/lib/recherche";

/* ── Champ de recherche avec suggestions ──
   Dès deux lettres, propose les lieux (quartier, ville, région, avec le nombre d'annonces) et quelques annonces.
   Clavier : flèches pour se déplacer, Entrée pour choisir, Échap pour fermer.
   Choisir un lieu remplit le champ et appelle onChoisir ; choisir une annonce l'ouvre directement. */
export default function ChampRecherche({
  valeur,
  onChange,
  onChoisir,
  transaction,
  placeholder,
  className,
  conteneur = "",
  ariaLabel = "Rechercher",
}: {
  valeur: string;
  onChange: (v: string) => void;
  onChoisir?: (v: string) => void;
  transaction?: "vente" | "location";
  placeholder?: string;
  className?: string;
  conteneur?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const biens = useBiens();
  const id = useId();
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);

  const liste = useMemo(
    () => suggestions(transaction ? biens.filter((b) => (b.transaction ?? "vente") === transaction) : biens, valeur),
    [biens, valeur, transaction],
  );
  const visible = ouvert && liste.length > 0;

  function choisir(s: Suggestion) {
    setOuvert(false);
    setActif(-1);
    if (s.genre === "annonce") return router.push(`/annonces/${s.id}`);
    onChange(s.valeur);
    onChoisir?.(s.valeur);
  }

  function clavier(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") return setOuvert(false);
    if (!liste.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOuvert(true);
      // Positions -1 (le champ lui-même) à liste.length - 1, en boucle.
      const pas = e.key === "ArrowDown" ? 1 : -1;
      setActif((i) => ((i + 1 + pas + liste.length + 1) % (liste.length + 1)) - 1);
    } else if (e.key === "Enter" && visible && actif >= 0) {
      e.preventDefault();
      choisir(liste[actif]);
    }
  }

  const premiereAnnonce = liste.findIndex((s) => s.genre === "annonce");

  return (
    <div className={`relative ${conteneur}`}>
      <input
        type="search"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={visible}
        aria-controls={`${id}-liste`}
        aria-autocomplete="list"
        aria-activedescendant={visible && actif >= 0 ? `${id}-${actif}` : undefined}
        autoComplete="off"
        value={valeur}
        onChange={(e) => {
          onChange(e.target.value);
          setOuvert(true);
          setActif(-1);
        }}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
        onKeyDown={clavier}
        placeholder={placeholder}
        className={className}
      />
      {visible && (
        <ul
          id={`${id}-liste`}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-50 min-w-[20rem] bg-white rounded-xl shadow-flottant border border-gray-100 py-1.5 text-left max-h-96 overflow-auto"
        >
          {liste.map((s, i) => (
            <li key={s.genre === "lieu" ? `l-${s.libelle}-${s.detail}` : `a-${s.id}`} role="presentation">
              {i === premiereAnnonce && (
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-t border-gray-100 mt-1">Annonces</div>
              )}
              <div
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === actif}
                // mousedown plutôt que click : le choix est pris avant que le champ ne perde le focus.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choisir(s);
                }}
                onMouseEnter={() => setActif(i)}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${i === actif ? "bg-gray-50" : ""}`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.genre === "lieu" ? "bg-gold/15 text-gold-dark" : "bg-blue/10 text-blue"}`}
                >
                  {s.genre === "lieu" ? <MapPin size={16} /> : <Home size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-900 truncate">{s.libelle}</span>
                  <span className="block text-xs text-gray-500 truncate">{s.detail}</span>
                </span>
                {s.genre === "lieu" && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {s.nombre} annonce{s.nombre > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
