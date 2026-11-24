import { popup } from "./popup";
export type MessageEnvoye = {
  id: string;
  type: "message" | "offre";
  bienId?: string;
  bienTitre?: string;
  agence?: string;
  montant?: string;
  nom: string;
  contact: string;
  message: string;
  envoyeur?: string;
  date: string;
};

const STORAGE_KEY = "keurbi_messages";

export function lireMessages(): MessageEnvoye[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function ajouterMessage(m: Omit<MessageEnvoye, "id" | "date">): MessageEnvoye {
  popup.succes(m.type === "offre" ? "Offre envoyée" : "Message envoyé", "Vous serez recontacté(e) rapidement.");
  const nouveau: MessageEnvoye = {
    ...m,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([nouveau, ...lireMessages()]));
  return nouveau;
}
