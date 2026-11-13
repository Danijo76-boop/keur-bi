"use client";
import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { CheckCircle, Star, Phone, MessageSquare, MapPin, Mail, Clock, CalendarDays } from "lucide-react";
import { agenceParSlug } from "@/lib/agences";
import { useBiens } from "@/lib/annonces";
import { useStocke } from "@/lib/stockage";
import { lireAvis, noteAgregee } from "@/lib/moderation";
import { lireDemandesTF, lireOverridesTF, statutTF } from "@/lib/tf";
import PropertyCard from "@/components/PropertyCard";
import ContactLauncher from "@/components/ContactLauncher";

type Onglet = "annonces" | "apropos" | "agents" | "avis";

function Etoiles({ note, taille = 14 }: { note: number; taille?: number }) {
  return (
    <span className="flex" role="img" aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={taille} className={i <= Math.round(note) ? "text-gold fill-gold" : "text-gray-300"} />
      ))}
    </span>
  );
}

export default function AgencePage() {
  const { slug } = useParams<{ slug: string }>();
  const agence = agenceParSlug(slug);
  if (!agence) notFound();

  const biens = useBiens();
  const overrides = useStocke(lireOverridesTF, []);
  const demandes = useStocke(lireDemandesTF, []);
  const [onglet, setOnglet] = useState<Onglet>("annonces");

  const annonces = biens.filter((b) => b.agence_slug === slug);
  const verifies = annonces.filter((b) => statutTF(b, overrides, demandes) === "verifie").length;
  const partTF = annonces.length ? Math.round((verifies / annonces.length) * 100) : 0;
  const avisLocaux = useStocke(() => lireAvis("agence", agence.slug), [], [agence.slug]);
  const { note, nbAvis } = noteAgregee(agence.note, agence.nbAvis, avisLocaux);
  const tousLesAvis = [
    ...avisLocaux.map((a) => ({ auteur: a.auteurNom, date: new Date(a.date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }), note: a.note, texte: a.texte })),
    ...agence.avis,
  ];

  const onglets: { id: Onglet; label: string }[] = [
    { id: "annonces", label: `Annonces (${annonces.length})` },
    { id: "apropos", label: "À propos" },
    { id: "agents", label: `Agents (${agence.agents.length})` },
    { id: "avis", label: `Avis (${nbAvis})` },
  ];

  return (
    <div>
      {/* Hero agence */}
      <div className="h-40 w-full" style={{ background: "linear-gradient(135deg, #1B4F72 0%, #2E86AB 50%, #1A5E20 100%)" }} />

      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 -mt-8 mb-6 flex flex-col md:flex-row gap-5 items-start">
          <div className="w-20 h-20 rounded-2xl bg-navy shrink-0 flex items-center justify-center text-gold font-bold text-2xl shadow-lg">{agence.initiales}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{agence.nom}</h1>
            <p className="text-sm text-gray-500 mb-2">Agence immobilière · {agence.adresse} · Fondée en {agence.fondee}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
              {agence.badges.map((b) => <span key={b} className="badge-verified"><CheckCircle size={12} /> {b}</span>)}
              <span className="badge-tf">{partTF}% TF vérifiés</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Etoiles note={note} taille={16} />
              <span className="font-bold text-gray-700">{note.toLocaleString("fr-FR")}</span>
              <span className="text-xs text-gray-400">({nbAvis} avis)</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto shrink-0">
            <ContactLauncher titre={`Contacter ${agence.nom}`} agence={agence.nom} className="btn-navy flex items-center gap-2 justify-center">
              <MessageSquare size={16} /> Contacter
            </ContactLauncher>
            <ContactLauncher titre={`Demander un rendez-vous à ${agence.nom}`} agence={agence.nom} className="flex items-center gap-2 justify-center border border-gray-200 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-50">
              <CalendarDays size={16} /> Rendez-vous
            </ContactLauncher>
            <a href={`tel:${agence.telephone}`} className="flex items-center gap-2 justify-center border border-gray-200 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-50">
              <Phone size={16} /> Appeler
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { val: annonces.length, label: "Annonces actives" },
            { val: agence.ventes, label: "Ventes conclues" },
            { val: `${partTF}%`, label: "TF vérifiés" },
            { val: `${note.toLocaleString("fr-FR")} ★`, label: "Note moyenne" },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className="font-bold text-navy text-xl">{s.val}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div role="tablist" aria-label="Sections de l'agence" className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
          {onglets.map((o) => (
            <button
              key={o.id}
              role="tab"
              aria-selected={onglet === o.id}
              onClick={() => setOnglet(o.id)}
              className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${onglet === o.id ? "border-navy text-navy" : "border-transparent text-gray-500 hover:text-navy"}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            {onglet === "annonces" &&
              (annonces.length === 0 ? (
                <div className="card p-12 text-center text-gray-400">
                  <p>Aucune annonce disponible pour cette agence.</p>
                  <Link href="/annonces" className="text-blue text-sm mt-2 block hover:underline">Voir toutes les annonces</Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {annonces.map((b) => <PropertyCard key={b.id} bien={b} />)}
                </div>
              ))}
            {onglet === "apropos" && (
              <div className="card p-5">
                <h2 className="font-bold text-gray-900 mb-2">À propos</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{agence.description}</p>
              </div>
            )}
            {onglet === "agents" && (
              <div className="grid sm:grid-cols-2 gap-4">
                {agence.agents.map((a) => (
                  <div key={a.nom} className="card p-4 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-navy/10 text-navy font-bold text-sm flex items-center justify-center shrink-0">{a.initiales}</div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{a.nom}</div>
                      <div className="text-xs text-gray-400">{a.role} · {a.ventes} ventes · ★ {a.note.toLocaleString("fr-FR")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {onglet === "avis" && (
              <div className="flex flex-col gap-3">
                {tousLesAvis.map((a) => (
                  <div key={`${a.auteur}-${a.texte}`} className="card p-4">
                    <Etoiles note={a.note} />
                    <p className="text-sm text-gray-600 my-2">« {a.texte} »</p>
                    <div className="text-xs text-gray-400">{a.auteur} · {a.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="w-full lg:w-72 shrink-0">
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-3">Contact</h2>
              <ul className="flex flex-col gap-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><Phone size={14} className="mt-0.5 shrink-0" /> <a href={`tel:${agence.telephone}`} className="hover:text-navy">{agence.telephone}</a></li>
                <li className="flex items-start gap-2"><Mail size={14} className="mt-0.5 shrink-0" /> <span className="break-all">{agence.email}</span></li>
                <li className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0" /> {agence.adresse}</li>
                <li className="flex items-start gap-2"><Clock size={14} className="mt-0.5 shrink-0" /> {agence.horaires}</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
