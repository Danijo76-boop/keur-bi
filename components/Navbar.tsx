"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building,
  Building2,
  Calculator,
  ChevronDown,
  CircleHelp,
  Globe2,
  Home,
  Landmark,
  LayoutGrid,
  LogOut,
  Mail,
  Map,
  MapPin,
  MapPinned,
  Menu,
  MessageSquare,
  PlusCircle,
  Scale,
  Tag,
  Trees,
  User,
  Wallet,
  X,
  type TypeIcone,
} from "@/components/icones";
import { Role, useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";
import { useParametres } from "@/lib/parametres";
import { conversationsDe, nonLus } from "@/lib/messagerie";
import { useStocke } from "@/lib/stockage";
import ThemeToggle from "@/components/ThemeToggle";
import { sectionsAdminOuvertes, useMatrice } from "@/lib/permissions";
import Pastille, { type CouleurPastille } from "@/components/Pastille";

const LIENS_COMPTE: { href: string; label: string; roles?: Role[]; flag?: "cadastre" | "comparateur" }[] = [
  { href: "/tableau-de-bord", label: "Tableau de bord" },
  { href: "/profil", label: "Mon profil" },
  { href: "/messages", label: "Messagerie" },
  { href: "/favoris", label: "Mes favoris" },
  { href: "/calendrier", label: "Calendrier" },
  { href: "/verification-tf", label: "Suivi des TF", flag: "cadastre" },
  { href: "/comparer", label: "Comparateur", flag: "comparateur" },
];

type Entree = { href: string; label: string; desc: string; icone: TypeIcone; flag?: "carte" | "comparateur" };
type Rubrique = { id: string; label: string; couleur: CouleurPastille; entrees: Entree[] };

// Le menu suit ce que la personne vient faire : acheter, vendre, financer, se faire aider, s'informer.
const RUBRIQUES: Rubrique[] = [
  {
    id: "acheter",
    label: "Acheter",
    couleur: "navy",
    entrees: [
      { href: "/annonces", label: "Toutes les annonces", desc: "Recherche avec filtres", icone: LayoutGrid },
      { href: "/annonces?type=terrain", label: "Terrains", desc: "Parcelles et terrains agricoles", icone: Trees },
      { href: "/annonces?type=villa", label: "Villas", desc: "Maisons individuelles", icone: Home },
      { href: "/annonces?type=appartement", label: "Appartements", desc: "En immeuble ou résidence", icone: Building },
      { href: "/annonces?type=bureau", label: "Bureaux", desc: "Locaux professionnels", icone: Briefcase },
      { href: "/neuf", label: "Programmes neufs", desc: "Sur plan et en construction", icone: Building2 },
      { href: "/carte", label: "Recherche sur la carte", desc: "Les biens autour de vous", icone: Map, flag: "carte" },
      { href: "/quartiers", label: "Guide des quartiers", desc: "Prix au m² par quartier", icone: MapPinned },
      { href: "/comparer", label: "Comparateur", desc: "Jusqu'à trois biens côte à côte", icone: Scale, flag: "comparateur" },
    ],
  },
  {
    id: "louer",
    label: "Louer",
    couleur: "bleu",
    entrees: [
      { href: "/annonces?transaction=location", label: "Toutes les locations", desc: "Loyers mensuels, meublé ou vide", icone: LayoutGrid },
      { href: "/annonces?transaction=location&type=appartement", label: "Appartements à louer", desc: "Studios et grands appartements", icone: Building },
      { href: "/annonces?transaction=location&type=villa", label: "Villas à louer", desc: "Maisons avec jardin ou piscine", icone: Home },
      { href: "/annonces?transaction=location&type=bureau", label: "Bureaux à louer", desc: "Locaux professionnels", icone: Briefcase },
    ],
  },
  {
    id: "vendre",
    label: "Vendre",
    couleur: "or",
    entrees: [
      { href: "/publier", label: "Publier une annonce", desc: "À vendre ou à louer", icone: PlusCircle },
      { href: "/estimer", label: "Estimer mon bien", desc: "Sa valeur en quelques secondes", icone: Calculator },
      { href: "/tarifs", label: "Tarifs et abonnements", desc: "Commission et plans vendeur", icone: Tag },
    ],
  },
  {
    id: "financer",
    label: "Financer",
    couleur: "vert",
    entrees: [
      { href: "/budget", label: "Calculer mon budget", desc: "Le prix maximum à viser", icone: Wallet },
      { href: "/financement", label: "Comparer les crédits", desc: "Mensualités de plusieurs banques", icone: Landmark },
      { href: "/frais", label: "Simulateur de frais", desc: "Notaire, droits et crédit", icone: Calculator },
    ],
  },
  {
    id: "services",
    label: "Services",
    couleur: "rouge",
    entrees: [
      { href: "/services", label: "Services à la carte", desc: "Rapport de titre, visite, photos", icone: BadgeCheck },
      { href: "/notaires", label: "Notaires partenaires", desc: "Annuaire et prise de rendez-vous", icone: Building2 },
      { href: "/diaspora", label: "Espace diaspora", desc: "Acheter depuis l'étranger", icone: Globe2 },
    ],
  },
  {
    id: "ressources",
    label: "Ressources",
    couleur: "gris",
    entrees: [
      { href: "/statistiques", label: "Marché immobilier", desc: "Prix et tendances", icone: BarChart3 },
      { href: "/guides", label: "Guide d'achat", desc: "Les étapes, pas à pas", icone: BookOpen },
      { href: "/faq", label: "Questions fréquentes", desc: "Les réponses aux doutes courants", icone: CircleHelp },
      { href: "/contact", label: "Contact", desc: "Écrire à l'équipe", icone: Mail },
    ],
  },
];

const cheminDe = (href: string) => href.split("?")[0];

export default function Navbar() {
  const chemin = usePathname();
  const [open, setOpen] = useState(false);
  const [rubriqueOuverte, setRubriqueOuverte] = useState<string | null>(null);
  const [rubriqueMobile, setRubriqueMobile] = useState<string | null>(null);
  const [menuCompte, setMenuCompte] = useState(false);
  const barre = useRef<HTMLElement>(null);
  const { user, logout } = useAuth();
  const { flags } = useParametres();
  const notifs = useNotifications(user);
  const nonLuesNotifs = notifs.filter((n) => !n.lue).length;
  const messagesNonLus = useStocke(() => (user ? conversationsDe(user).reduce((s, c) => s + nonLus(c, user.email), 0) : 0), 0, [user?.email, user?.role]);

  const rubriques = RUBRIQUES.map((r) => ({ ...r, entrees: r.entrees.filter((e) => !e.flag || flags[e.flag]) }));
  // L'administration s'ouvre à tout rôle habilité sur au moins une de ses sections.
  const sectionsAdmin = sectionsAdminOuvertes(useMatrice(), user?.role);
  const liensCompte = [
    ...LIENS_COMPTE.filter((l) => (!l.roles || (user && l.roles.includes(user.role))) && (!l.flag || flags[l.flag])),
    ...(sectionsAdmin.length > 0 ? [{ href: sectionsAdmin[0], label: "Administration" }] : []),
  ];

  function toutFermer() {
    setRubriqueOuverte(null);
    setMenuCompte(false);
    setOpen(false);
  }

  // Changement de page : les menus se referment.
  useEffect(toutFermer, [chemin]);

  // Clic en dehors ou touche Échap : les menus se referment.
  useEffect(() => {
    if (!rubriqueOuverte && !menuCompte) return;
    const dehors = (e: MouseEvent) => {
      if (!barre.current?.contains(e.target as Node)) {
        setRubriqueOuverte(null);
        setMenuCompte(false);
      }
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRubriqueOuverte(null);
        setMenuCompte(false);
      }
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [rubriqueOuverte, menuCompte]);

  // Menu mobile ouvert : la page derrière ne défile plus.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header ref={barre} className="sticky top-0 z-[60] bg-navy-dark/95 backdrop-blur-md border-b border-white/10 shadow-eleve print:hidden">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-gold-light to-gold rounded-xl flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(240,165,0,0.8)]">
            <MapPin size={18} className="text-navy-dark" strokeWidth={2.5} />
          </div>
          <span className="font-display text-white font-extrabold text-xl tracking-tight">
            KEUR<span className="text-gold">GUI</span>
          </span>
        </Link>

        {/* Navigation ordinateur : rubriques avec sous-menus */}
        <nav className="hidden lg:flex items-center gap-0.5 text-sm font-medium text-white/75" aria-label="Navigation principale">
          {rubriques.map((r) => {
            const ouverte = rubriqueOuverte === r.id;
            const active = r.entrees.some((e) => cheminDe(e.href) === chemin);
            return (
              <div key={r.id} className="relative" onMouseEnter={() => setRubriqueOuverte(r.id)} onMouseLeave={() => setRubriqueOuverte(null)}>
                <button
                  type="button"
                  aria-expanded={ouverte}
                  aria-haspopup="true"
                  onClick={() => setRubriqueOuverte(ouverte ? null : r.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${ouverte || active ? "bg-white/10 text-white" : "hover:text-white hover:bg-white/5"}`}
                >
                  {r.label}
                  <ChevronDown size={14} className={`transition-transform ${ouverte ? "rotate-180" : ""}`} />
                </button>
                {ouverte && (
                  // Le pt-3 garde la souris « dans » le menu entre le bouton et le panneau.
                  <div className={`absolute top-full pt-3 z-50 ${r.entrees.length > 4 ? "left-0" : "left-1/2 -translate-x-1/2"}`}>
                    <div
                      className={`bg-white rounded-2xl border border-gray-100 shadow-[0_24px_48px_-16px_rgba(27,42,74,0.45)] p-2 grid gap-0.5 animate-[apparition_0.15s_ease-out] ${r.entrees.length > 4 ? "grid-cols-2 w-[34rem]" : "w-72"}`}
                    >
                      {r.entrees.map((e) => (
                        <Link
                          key={e.href}
                          href={e.href}
                          onClick={() => setRubriqueOuverte(null)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 group"
                        >
                          <Pastille icone={e.icone} couleur={r.couleur} taille={38} className="transition-transform group-hover:scale-110" />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-900">{e.label}</span>
                            <span className="block text-xs font-normal text-gray-500">{e.desc}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="hidden lg:flex items-center gap-1 shrink-0">
          <ThemeToggle className="text-white/70 hover:text-white p-2" />
          {user && (
            <Link href="/messages" aria-label={`Messagerie, ${messagesNonLus} non lus`} className="relative text-white/70 hover:text-white p-2">
              <MessageSquare size={20} />
              {messagesNonLus > 0 && (
                <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-gold text-navy-dark text-[10px] font-bold rounded-full flex items-center justify-center">
                  {messagesNonLus}
                </span>
              )}
            </Link>
          )}
          <Link
            href={user ? "/notifications" : "/connexion"}
            aria-label={`Notifications, ${nonLuesNotifs} non lues`}
            className="relative text-white/70 hover:text-white p-2"
          >
            <Bell size={20} />
            {nonLuesNotifs > 0 && (
              <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-gold text-navy-dark text-[10px] font-bold rounded-full flex items-center justify-center">
                {nonLuesNotifs}
              </span>
            )}
          </Link>
          {user ? (
            <div className="relative">
              <button
                aria-expanded={menuCompte}
                aria-haspopup="true"
                onClick={() => {
                  setRubriqueOuverte(null);
                  setMenuCompte((o) => !o);
                }}
                className="flex items-center gap-2 text-white/80 hover:text-white p-1 pr-2 rounded-full hover:bg-white/10"
              >
                <span className="w-7 h-7 rounded-full bg-gold text-navy-dark font-bold text-xs flex items-center justify-center">
                  {user.nom[0]?.toUpperCase()}
                </span>
                <span className="text-sm max-w-[7rem] truncate hidden xl:block">{user.nom}</span>
                <ChevronDown size={14} className={`transition-transform ${menuCompte ? "rotate-180" : ""}`} />
              </button>
              {menuCompte && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_20px_40px_-16px_rgba(27,42,74,0.35)] border border-gray-100 py-1.5 text-sm text-gray-700 z-50 overflow-hidden animate-[apparition_0.15s_ease-out]">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="font-semibold text-gray-900 truncate">{user.nom}</div>
                    <div className="text-xs text-gray-400 truncate">{user.email}</div>
                  </div>
                  {liensCompte.map((l) => (
                    <Link key={l.href} href={l.href} onClick={() => setMenuCompte(false)} className="block px-4 py-2 hover:bg-gray-50">
                      {l.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      logout();
                      setMenuCompte(false);
                    }}
                    className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-gray-50 border-t border-gray-100"
                  >
                    <LogOut size={14} /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/connexion"
              className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/10"
            >
              <User size={18} /> Connexion
            </Link>
          )}
          <Link href="/publier" className="btn-primary text-sm py-2 px-4 ml-1 whitespace-nowrap">
            Publier <span className="hidden xl:inline">une annonce</span>
          </Link>
        </div>

        {/* Raccourcis et bouton du menu, mobile et tablette */}
        <div className="lg:hidden flex items-center gap-1">
          {user && (
            <Link href="/notifications" aria-label={`Notifications, ${nonLuesNotifs} non lues`} className="relative text-white/80 p-2">
              <Bell size={22} />
              {nonLuesNotifs > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-gold text-navy-dark text-[10px] font-bold rounded-full flex items-center justify-center">
                  {nonLuesNotifs}
                </span>
              )}
            </Link>
          )}
          <button className="text-white p-2" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Menu mobile : rubriques en accordéon */}
      {open && (
        <div className="lg:hidden bg-navy-dark border-t border-white/10 px-4 pt-2 pb-6 text-white h-[calc(100dvh-4rem)] overflow-y-auto">
          {user && (
            <div className="flex items-center gap-3 py-3 border-b border-white/10">
              <span className="w-10 h-10 rounded-full bg-gold text-navy-dark font-bold flex items-center justify-center shrink-0">
                {user.nom[0]?.toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold truncate">{user.nom}</span>
                <span className="block text-xs text-white/50 truncate">{user.email}</span>
              </span>
            </div>
          )}

          {rubriques.map((r) => {
            const ouverte = rubriqueMobile === r.id;
            return (
              <div key={r.id} className="border-b border-white/10">
                <button
                  type="button"
                  aria-expanded={ouverte}
                  onClick={() => setRubriqueMobile(ouverte ? null : r.id)}
                  className="w-full flex items-center justify-between py-3.5 font-semibold text-left"
                >
                  {r.label}
                  <ChevronDown size={18} className={`text-white/60 transition-transform ${ouverte ? "rotate-180" : ""}`} />
                </button>
                {ouverte && (
                  <div className="flex flex-col pb-3">
                    {r.entrees.map((e) => (
                      <Link
                        key={e.href}
                        href={e.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 py-2.5 pl-1 text-white/85 hover:text-gold"
                      >
                        <Pastille icone={e.icone} couleur={r.couleur} taille={32} />
                        <span>{e.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {user && (
            <div className="border-b border-white/10">
              <button
                type="button"
                aria-expanded={rubriqueMobile === "compte"}
                onClick={() => setRubriqueMobile(rubriqueMobile === "compte" ? null : "compte")}
                className="w-full flex items-center justify-between py-3.5 font-semibold text-left"
              >
                <span>
                  Mon espace
                  {messagesNonLus > 0 && <span className="ml-2 bg-gold text-navy-dark text-xs font-bold rounded-full px-1.5 py-0.5">{messagesNonLus}</span>}
                </span>
                <ChevronDown size={18} className={`text-white/60 transition-transform ${rubriqueMobile === "compte" ? "rotate-180" : ""}`} />
              </button>
              {rubriqueMobile === "compte" && (
                <div className="flex flex-col pb-3">
                  {liensCompte.map((l) => (
                    <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 pl-1 text-white/85 hover:text-gold">
                      {l.label}
                      {l.href === "/messages" && messagesNonLus > 0 && ` (${messagesNonLus})`}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <ThemeToggle avecLibelle className="flex items-center gap-3 py-1 text-white/85 hover:text-gold text-left" />
            {user ? (
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="flex items-center gap-3 py-1 text-white/85 hover:text-gold text-left"
              >
                <LogOut size={20} /> Déconnexion
              </button>
            ) : (
              <Link
                href="/connexion"
                onClick={() => setOpen(false)}
                className="border border-white/30 rounded-xl text-center font-semibold py-2.5 hover:bg-white/10"
              >
                Connexion
              </Link>
            )}
            <Link href="/publier" className="btn-primary text-center" onClick={() => setOpen(false)}>
              Publier une annonce
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
