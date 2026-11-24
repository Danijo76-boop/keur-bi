"use client";
import { useState } from "react";
import { BarChart3, Megaphone, Target, Users } from "lucide-react";
import { ajouterMessage } from "@/lib/messages";
import { FORMATS_PUBLICITE } from "@/lib/publicite";
import EncartSponsorise from "@/components/EncartSponsorise";

const ARGUMENTS = [
  { icone: Target, titre: "Une audience qui a un projet", desc: "Vos offres s'affichent devant des personnes en train de chercher un bien à acheter." },
  { icone: Users, titre: "Sénégal et diaspora", desc: "Acheteurs sur place et Sénégalais de l'extérieur, au même endroit." },
  { icone: BarChart3, titre: "Vous payez au résultat", desc: "Facturation au clic : pas de visite, pas de facture. Statistiques fournies chaque mois." },
];

const champ = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-navy bg-white";

export default function AnnonceursPage() {
  const [societe, setSociete] = useState("");
  const [nom, setNom] = useState("");
  const [contact, setContact] = useState("");
  const [format, setFormat] = useState(FORMATS_PUBLICITE[0].nom);
  const [message, setMessage] = useState("");

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    ajouterMessage({
      type: "message",
      agence: "Régie publicitaire KEUR BI",
      nom: `${nom.trim()} (${societe.trim()})`,
      contact: contact.trim(),
      message: `[Publicité · ${format}] ${message.trim()}`,
    });
    setSociete("");
    setNom("");
    setContact("");
    setMessage("");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <p className="eyebrow mb-2">Espace annonceurs</p>
        <h1 className="titre-page mb-2">Annoncez sur KEUR BI</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Banques, assureurs, constructeurs, artisans, déménageurs : présentez votre offre au moment où vos futurs clients préparent leur achat.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-12">
        {ARGUMENTS.map((a) => (
          <div key={a.titre} className="card p-6">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-navy to-navy-dark text-gold flex items-center justify-center mb-4">
              <a.icone size={22} />
            </span>
            <h2 className="font-bold text-gray-900 mb-1">{a.titre}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{a.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_22rem] gap-8 items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Formats et tarifs</h2>
          <div className="card divide-y divide-gray-100">
            {FORMATS_PUBLICITE.map((f) => (
              <div key={f.id} className="p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900">{f.nom}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
                <span className="text-sm font-bold text-navy-dark whitespace-nowrap">{f.prix}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Tarifs indicatifs hors taxes. Chaque encart porte la mention « Sponsorisé » : nous ne mélangeons jamais publicité et annonces.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">À quoi ressemble un encart</h2>
          <div className="max-w-sm">
            <EncartSponsorise emplacement="recherche" />
          </div>
        </div>

        <form onSubmit={envoyer} className="card p-6 flex flex-col gap-3 lg:sticky lg:top-24">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Megaphone size={18} className="text-gold" /> Recevoir une proposition
          </h2>
          <input required placeholder="Société" value={societe} onChange={(e) => setSociete(e.target.value)} className={champ} />
          <input required placeholder="Votre nom" value={nom} onChange={(e) => setNom(e.target.value)} className={champ} />
          <input required placeholder="Téléphone ou email" value={contact} onChange={(e) => setContact(e.target.value)} className={champ} />
          <select aria-label="Format souhaité" value={format} onChange={(e) => setFormat(e.target.value)} className={champ}>
            {FORMATS_PUBLICITE.map((f) => (
              <option key={f.id}>{f.nom}</option>
            ))}
          </select>
          <textarea
            rows={3}
            placeholder="Votre activité, votre objectif, votre budget mensuel…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${champ} resize-none`}
          />
          <button type="submit" className="btn-primary">
            Envoyer ma demande
          </button>
          <p className="text-xs text-gray-400">Réponse sous deux jours ouvrés.</p>
        </form>
      </div>
    </div>
  );
}
