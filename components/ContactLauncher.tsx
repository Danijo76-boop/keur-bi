"use client";
import { ReactNode, useEffect, useState } from "react";
import Modal from "./Modal";
import { useAuth } from "@/lib/auth";
import { useExigeCompte } from "@/lib/exige-compte";
import { ajouterMessage } from "@/lib/messages";
import { envoyerMessage, obtenirConversation } from "@/lib/messagerie";
import { IconeStatut } from "@/components/Statut";

export default function ContactLauncher({
  children,
  className,
  titre,
  sousTitre,
  champMontant,
  bienId,
  bienTitre,
  agence,
}: {
  children: ReactNode;
  className?: string;
  titre: string;
  sousTitre?: string;
  champMontant?: boolean;
  bienId?: string;
  bienTitre?: string;
  agence?: string;
}) {
  const { user } = useAuth();
  const exigeCompte = useExigeCompte();
  const [open, setOpen] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [nom, setNom] = useState("");
  const [contact, setContact] = useState("");
  const [montant, setMontant] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open && user) {
      setNom((n) => n || user.nom);
      setContact((c) => c || user.email);
    }
  }, [open, user]);

  function fermer() {
    setOpen(false);
    setEnvoye(false);
    setNom("");
    setContact("");
    setMontant("");
    setMessage("");
  }

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    ajouterMessage({
      type: champMontant ? "offre" : "message",
      bienId,
      bienTitre,
      agence,
      montant: champMontant ? montant : undefined,
      nom,
      contact,
      message,
      envoyeur: user?.email,
    });
    if (user?.role === "acheteur" && agence) {
      const conversation = obtenirConversation({
        sujet: bienTitre ?? agence,
        bienId,
        acheteurEmail: user.email,
        acheteurNom: user.nom,
        avec: "agence",
        interlocuteurNom: agence,
      });
      envoyerMessage(conversation.id, user, message);
    }
    setEnvoye(true);
  }

  return (
    <>
      <button type="button" className={className} onClick={() => exigeCompte() && setOpen(true)}>
        {children}
      </button>
      {open && (
        <Modal titre={titre} sousTitre={sousTitre} onClose={fermer}>
          {envoye ? (
            <div className="text-center py-6">
              <p className="text-green font-semibold mb-1">
                <IconeStatut type="ok" />
                Envoyé avec succès
              </p>
              <p className="text-sm text-gray-500">Vous serez recontacté(e) rapidement.</p>
              <button onClick={fermer} className="btn-navy mt-4 w-full">
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={envoyer} className="flex flex-col gap-3">
              <input
                required
                placeholder="Votre nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
              />
              <input
                required
                placeholder="Téléphone ou email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
              />
              {champMontant && (
                <input
                  required
                  type="number"
                  placeholder="Montant proposé (FCFA)"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                />
              )}
              <textarea
                required
                placeholder="Votre message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy resize-none"
              />
              <button type="submit" className="btn-navy w-full">
                Envoyer
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
