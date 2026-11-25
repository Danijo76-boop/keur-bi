"use client";
import { ReactNode, useEffect, useState } from "react";
import Modal from "./Modal";
import { useAuth } from "@/lib/auth";
import { useExigeCompte } from "@/lib/exige-compte";
import { formatFCFA } from "@/lib/mock-data";
import { commander, SERVICES } from "@/lib/revenus";
import { useStocke } from "@/lib/stockage";
import { trouverUtilisateur } from "@/lib/utilisateurs";

const champ = "border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-navy";

// Bouton qui ouvre le formulaire de commande d'un service à la carte.
// Commander un service sur une annonce précise demande d'être connecté ; les offres générales (pack diaspora) restent ouvertes.
export default function CommanderService({
  serviceId,
  bienId,
  className,
  children,
}: {
  serviceId: string;
  bienId?: string;
  className?: string;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const exigeCompte = useExigeCompte();
  const profil = useStocke(() => (user ? trouverUtilisateur(user.email) : undefined), undefined, [user?.email]);
  const service = SERVICES.find((s) => s.id === serviceId);
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!ouvert) return;
    setNom((n) => n || user?.nom || "");
    setTelephone((t) => t || profil?.telephone || "");
  }, [ouvert, user, profil]);

  if (!service) return null;

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    commander({ serviceId, bienId, nom: nom.trim(), telephone: telephone.trim(), email: user?.email, note: note.trim() || undefined });
    setOuvert(false);
    setNote("");
  }

  return (
    <>
      <button type="button" className={className} onClick={() => (!bienId || exigeCompte()) && setOuvert(true)}>
        {children}
      </button>
      {ouvert && (
        <Modal titre={service.titre} sousTitre={`${formatFCFA(service.prix)} · paiement à la confirmation`} onClose={() => setOuvert(false)}>
          <form onSubmit={envoyer} className="flex flex-col gap-3">
            <input required placeholder="Votre nom" value={nom} onChange={(e) => setNom(e.target.value)} className={champ} />
            <input
              required
              type="tel"
              placeholder="Téléphone (WhatsApp de préférence)"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className={champ}
            />
            <textarea
              rows={3}
              placeholder="Précisions : bien concerné, disponibilités… (optionnel)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${champ} resize-none`}
            />
            <p className="text-xs text-gray-400">Aucun paiement en ligne à cette étape : un conseiller vous rappelle pour confirmer la prestation.</p>
            <button type="submit" className="btn-navy w-full">
              Commander
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
