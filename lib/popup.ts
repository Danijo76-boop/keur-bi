// Fenêtres pop-up de l'application : confirmations, erreurs et demandes de validation.
// Les appels partent de n'importe où (pages ou bibliothèques) ; l'affichage est assuré par <PopupHost /> dans le layout.

export type TypePopup = "succes" | "erreur" | "info" | "confirmation";

export type DemandePopup = {
  id: string;
  type: TypePopup;
  titre: string;
  message?: string;
  libelleOk?: string;
  danger?: boolean;
  repondre?: (valeur: boolean) => void;
};

export const EVENEMENT_POPUP = "keurbi:popup";

function afficher(p: Omit<DemandePopup, "id">) {
  if (typeof window === "undefined") return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.dispatchEvent(new CustomEvent<DemandePopup>(EVENEMENT_POPUP, { detail: { ...p, id } }));
}

export const popup = {
  succes: (titre: string, message?: string) => afficher({ type: "succes", titre, message }),
  erreur: (titre: string, message?: string) => afficher({ type: "erreur", titre, message }),
  info: (titre: string, message?: string) => afficher({ type: "info", titre, message }),
  // Remplace window.confirm : résout à true si la personne valide.
  confirmer: (titre: string, message?: string, options: { libelleOk?: string; danger?: boolean } = {}) =>
    new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      afficher({ type: "confirmation", titre, message, ...options, repondre: resolve });
    }),
};
