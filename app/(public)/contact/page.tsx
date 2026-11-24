"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ajouterMessage } from "@/lib/messages";
import BandeauDemo from "@/components/BandeauDemo";
import { IconeStatut } from "@/components/Statut";

const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal";

function Formulaire() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [nom, setNom] = useState(user?.nom ?? "");
  const [contact, setContact] = useState(user?.email ?? "");
  const [sujet, setSujet] = useState(params.get("sujet") ?? "");
  const [message, setMessage] = useState("");
  const [envoye, setEnvoye] = useState(false);

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    ajouterMessage({ type: "message", agence: "Support KEUR BI", nom, contact, message: `${sujet ? `[${sujet}] ` : ""}${message}`, envoyeur: user?.email });
    setEnvoye(true);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="titre-page mb-1">Contact</h1>
      <p className="text-gray-500 text-sm mb-4">Une question sur la plateforme, un abonnement ou un dossier ?</p>
      <BandeauDemo>Démo : le message reste dans ce navigateur, il n&apos;est envoyé à personne.</BandeauDemo>
      {envoye ? (
        <div className="card p-8 text-center text-green font-semibold">
          <IconeStatut type="ok" />
          Message enregistré
        </div>
      ) : (
        <form onSubmit={envoyer} className="card p-6 flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-700">
            Votre nom
            <input required value={nom} onChange={(e) => setNom(e.target.value)} className={champ} />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Téléphone ou email
            <input required value={contact} onChange={(e) => setContact(e.target.value)} className={champ} />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Sujet
            <input value={sujet} onChange={(e) => setSujet(e.target.value)} className={champ} />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Message
            <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={`${champ} resize-none`} />
          </label>
          <button type="submit" className="btn-navy">
            Envoyer
          </button>
        </form>
      )}
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-400">Chargement…</div>}>
      <Formulaire />
    </Suspense>
  );
}
