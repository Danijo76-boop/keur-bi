"use client";
import { lire, ecrire, nouvelId } from "./stockage";
import { estCoteVendeur, estNotariat, User } from "./auth";

export type MessageChat = {
  id: string;
  auteurEmail: string;
  auteurNom: string;
  texte: string;
  fichier?: string;
  date: string;
};

export type Conversation = {
  id: string;
  sujet: string;
  bienId?: string;
  dossierId?: string;
  acheteurEmail: string;
  acheteurNom: string;
  avec: "agence" | "notaire";
  interlocuteurNom: string;
  messages: MessageChat[];
  luPar: Record<string, string>;
};

const CLE = "keurbi_conversations";

export function lireConversations(): Conversation[] {
  return lire<Conversation[]>(CLE, []);
}

// Démo : sans vrais comptes, chaque agence ou notaire voit toutes les conversations de son rôle.
export function conversationsDe(user: User): Conversation[] {
  return lireConversations().filter((c) => {
    if (estCoteVendeur(user.role)) return c.avec === "agence";
    if (estNotariat(user.role)) return c.avec === "notaire";
    return c.acheteurEmail === user.email;
  });
}

export function obtenirConversation(c: Omit<Conversation, "id" | "messages" | "luPar">): Conversation {
  const toutes = lireConversations();
  const existante = toutes.find(
    (x) => x.acheteurEmail === c.acheteurEmail && x.avec === c.avec && x.interlocuteurNom === c.interlocuteurNom && x.bienId === c.bienId,
  );
  if (existante) return existante;
  const nouvelle: Conversation = { ...c, id: nouvelId(), messages: [], luPar: {} };
  ecrire(CLE, [nouvelle, ...toutes]);
  return nouvelle;
}

export function envoyerMessage(conversationId: string, auteur: User, texte: string, fichier?: string) {
  const maintenant = new Date().toISOString();
  ecrire(
    CLE,
    lireConversations().map((c) =>
      c.id === conversationId
        ? {
            ...c,
            messages: [...c.messages, { id: nouvelId(), auteurEmail: auteur.email, auteurNom: auteur.nom, texte, fichier, date: maintenant }],
            luPar: { ...c.luPar, [auteur.email]: maintenant },
          }
        : c,
    ),
  );
}

export function marquerLue(conversationId: string, email: string) {
  const toutes = lireConversations();
  const cible = toutes.find((c) => c.id === conversationId);
  if (!cible || nonLus(cible, email) === 0) return;
  ecrire(
    CLE,
    toutes.map((c) => (c.id === conversationId ? { ...c, luPar: { ...c.luPar, [email]: new Date().toISOString() } } : c)),
  );
}

export function nonLus(c: Conversation, email: string): number {
  const lu = c.luPar[email];
  return c.messages.filter((m) => m.auteurEmail !== email && (!lu || m.date > lu)).length;
}
