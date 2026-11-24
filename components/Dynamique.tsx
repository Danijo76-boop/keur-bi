"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* ── Effets visuels de l'accueil ──
   Légers (aucune bibliothèque), et coupés pour les personnes qui ont demandé moins d'animations
   à leur appareil (prefers-reduced-motion) : le contenu s'affiche alors directement, sans mouvement.
   Sans JavaScript, tout reste visible : rien n'est caché tant que le script n'a pas pris la main. */

const mouvementReduit = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// useLayoutEffect côté navigateur (évite un clignotement), sans avertissement côté serveur.
const useEffetAvantAffichage = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* Apparition au défilement : l'élément glisse vers le haut en apparaissant quand il entre à l'écran.
   Ce qui est déjà visible au chargement n'est pas caché (pas de clignotement). */
export function Revelation({ children, delai = 0, className = "", as: Balise = "div" }: {
  children: ReactNode;
  delai?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffetAvantAffichage(() => {
    const el = ref.current;
    if (!el || mouvementReduit() || !("IntersectionObserver" in window)) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) return; // déjà à l'écran
    el.classList.add("revelation-attente");
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.classList.add("revelation-visible");
        el.classList.remove("revelation-attente");
        obs.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Balise ref={ref as any} className={className} style={{ "--revelation-delai": `${delai}ms` } as CSSProperties}>
      {children}
    </Balise>
  );
}

/* Mot qui change tout seul dans un titre (« villa », « terrain »…).
   Les lecteurs d'écran lisent la phrase complète, une seule fois, sans être dérangés par le défilement. */
export function MotTournant({ mots, intervalle = 2600, className = "" }: { mots: string[]; intervalle?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (mouvementReduit()) return;
    const t = setInterval(() => setI((n) => (n + 1) % mots.length), intervalle);
    return () => clearInterval(t);
  }, [mots.length, intervalle]);
  const plusLong = mots.reduce((a, b) => (b.length > a.length ? b : a), "");
  return (
    <span className={`mot-tournant ${className}`} aria-hidden>
      {/* Réserve la largeur du mot le plus long : la ligne ne saute pas quand le mot change. */}
      <span className="invisible">{plusLong}</span>
      <span key={i} className="mot-tournant-courant">{mots[i]}</span>
    </span>
  );
}

/* Chiffre qui défile de 0 à sa valeur quand il apparaît à l'écran. */
export function Compteur({ valeur, format = (n) => Math.round(n).toLocaleString("fr-FR"), duree = 1400 }: {
  valeur: number;
  format?: (n: number) => string;
  duree?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [affiche, setAffiche] = useState(format(valeur));
  useEffect(() => {
    const el = ref.current;
    if (!el || mouvementReduit() || !("IntersectionObserver" in window) || valeur <= 0) {
      setAffiche(format(valeur));
      return;
    }
    let raf = 0;
    setAffiche(format(0));
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const debut = performance.now();
      const pas = (t: number) => {
        const p = Math.min(1, (t - debut) / duree);
        const adouci = 1 - Math.pow(1 - p, 3); // ralentit en approchant de la valeur
        setAffiche(format(valeur * adouci));
        if (p < 1) raf = requestAnimationFrame(pas);
      };
      raf = requestAnimationFrame(pas);
    });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur, duree]);
  return (
    <span ref={ref} aria-label={format(valeur)}>
      <span aria-hidden>{affiche}</span>
    </span>
  );
}

/* Halo de lumière qui suit la souris dans une zone (le hero). */
export function HaloSouris({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const zone = el?.parentElement;
    if (!el || !zone || mouvementReduit() || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const suivre = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = zone.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - r.left}px`);
        el.style.setProperty("--y", `${e.clientY - r.top}px`);
        el.style.opacity = "1";
      });
    };
    const quitter = () => { el.style.opacity = "0"; };
    zone.addEventListener("pointermove", suivre);
    zone.addEventListener("pointerleave", quitter);
    return () => { zone.removeEventListener("pointermove", suivre); zone.removeEventListener("pointerleave", quitter); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className={`halo-souris ${className}`} aria-hidden />;
}

/* Carte qui s'incline en 3D sous la souris, avec un reflet de lumière. */
export function Inclinaison({ children, className = "", force = 8 }: { children: ReactNode; className?: string; force?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || mouvementReduit() || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const bouger = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1000px) rotateY(${px * force}deg) rotateX(${-py * force}deg)`;
        el.style.setProperty("--reflet-x", `${(px + 0.5) * 100}%`);
        el.style.setProperty("--reflet-y", `${(py + 0.5) * 100}%`);
      });
    };
    const revenir = () => { cancelAnimationFrame(raf); el.style.transform = ""; };
    el.addEventListener("pointermove", bouger);
    el.addEventListener("pointerleave", revenir);
    return () => { el.removeEventListener("pointermove", bouger); el.removeEventListener("pointerleave", revenir); cancelAnimationFrame(raf); };
  }, [force]);
  return <div ref={ref} className={`inclinaison ${className}`}>{children}</div>;
}

/* Halo qui suit la souris sur les cartes portant la classe « carte-halo » (un seul écouteur pour toute la page). */
export function HalosCartes() {
  useEffect(() => {
    if (mouvementReduit() || !window.matchMedia("(pointer: fine)").matches) return;
    const suivre = (e: PointerEvent) => {
      const carte = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(".carte-halo");
      if (!carte) return;
      const r = carte.getBoundingClientRect();
      carte.style.setProperty("--mx", `${e.clientX - r.left}px`);
      carte.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", suivre, { passive: true });
    return () => document.removeEventListener("pointermove", suivre);
  }, []);
  return null;
}

/* Grille dont les éléments apparaissent l'un après l'autre (décalage « pas » en ms) quand elle entre à l'écran. */
export function GrilleRevelee({ children, className = "", pas = 110, as: Balise = "div" }: {
  children: ReactNode;
  className?: string;
  pas?: number;
  as?: "div" | "ol" | "ul";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffetAvantAffichage(() => {
    const el = ref.current;
    if (!el || mouvementReduit() || !("IntersectionObserver" in window)) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) return; // déjà à l'écran
    const enfants = Array.from(el.children) as HTMLElement[];
    enfants.forEach((c, i) => {
      c.classList.add("revelation-attente");
      c.style.setProperty("--revelation-delai", `${i * pas}ms`);
    });
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        enfants.forEach((c) => { c.classList.add("revelation-visible"); c.classList.remove("revelation-attente"); });
        obs.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pas]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Balise ref={ref as any} className={className}>{children}</Balise>;
}
