"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStocke } from "@/lib/stockage";
import { trouverUtilisateur } from "@/lib/utilisateurs";
import { demanderVisite, LABELS_VISITE, lireVisites, visiteActive } from "@/lib/visites";
import Modal from "./Modal";

const CRENEAUX = ["09:00", "11:00", "15:00", "17:00"];
const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal";

export default function DemandeVisite({ bienId, bienTitre }: { bienId: string; bienTitre: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const visites = useStocke(lireVisites, []);
  const [ouvert, setOuvert] = useState(false);
  const [jour, setJour] = useState("");
  const [heure, setHeure] = useState(CRENEAUX[0]);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const active = user ? visiteActive(bienId, user.email, visites) : undefined;
  const classe = "flex items-center justify-center gap-2 w-full border border-navy text-navy font-semibold px-5 py-2.5 rounded-lg hover:bg-navy/5 transition-colors";

  if (active) {
    return (
      <div className="text-sm bg-gray-50 rounded-lg px-3 py-2 text-center">
        <div className="font-semibold text-gray-800">Visite : {LABELS_VISITE[active.statut]}</div>
        <div className="text-xs text-gray-500 capitalize">{new Date(active.date).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    );
  }

  function ouvrir() {
    if (!user) return router.push("/connexion");
    setOuvert(true);
  }

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const date = new Date(`${jour}T${heure}:00`);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return setErreur("Choisissez une date à venir.");
    if (date.getDay() === 0) return setErreur("Pas de visite le dimanche : choisissez un autre jour.");
    demanderVisite({
      bienId,
      bienTitre,
      acheteurEmail: user.email,
      acheteurNom: user.nom,
      telephone: trouverUtilisateur(user.email)?.telephone,
      date: date.toISOString(),
      message: message.trim() || undefined,
    });
    setOuvert(false);
    setErreur("");
  }

  return (
    <>
      <button type="button" onClick={ouvrir} className={classe}>
        <CalendarCheck size={16} /> Demander une visite
      </button>
      {ouvert && (
        <Modal titre="Demander une visite" sousTitre={bienTitre} onClose={() => setOuvert(false)}>
          <form onSubmit={envoyer} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-gray-700">
                Date
                <input type="date" required value={jour} onChange={(e) => setJour(e.target.value)} className={champ} />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Heure
                <select value={heure} onChange={(e) => setHeure(e.target.value)} className={champ}>
                  {CRENEAUX.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <label className="text-sm font-semibold text-gray-700">
              Message (optionnel)
              <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} className={`${champ} resize-none`} />
            </label>
            {erreur && <p className="text-red text-xs">{erreur}</p>}
            <button type="submit" className="btn-navy text-sm">Envoyer la demande</button>
          </form>
        </Modal>
      )}
    </>
  );
}
