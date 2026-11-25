/* ── Ce qu'un visiteur non connecté peut voir ──
   La présentation du site et les pages d'information sont ouvertes à tous.
   Les annonces (liste et fiche) se consultent aussi sans compte, mais toute action dessus (message, visite, offre,
   appel, favoris, comparateur, signalement, commande de service) demande d'être connecté : voir useExigeCompte.
   Tout le reste (carte, outils, services, annuaires, espace personnel) demande un compte.
   Ce fichier est lu à la fois par le serveur (middleware.ts) et par le navigateur (GardeVisiteur). */

export const PAGES_PUBLIQUES = ["/", "/connexion", "/mot-de-passe-oublie", "/bienvenue", "/faq", "/guides", "/tarifs", "/contact", "/annonceurs", "/diaspora"];

// La liste des annonces et la fiche d'une annonce, mais pas ce qui se trouve sous la fiche (/annonces/x/offre).
const ANNONCE_CONSULTABLE = /^\/annonces(\/[^/]+)?$/;

export function estPagePublique(chemin: string): boolean {
  const propre = chemin.length > 1 ? chemin.replace(/\/+$/, "") : chemin;
  return PAGES_PUBLIQUES.includes(propre) || propre.startsWith("/legal/") || ANNONCE_CONSULTABLE.test(propre);
}

// Adresse de la page de connexion qui ramènera la personne là où elle voulait aller.
export function versConnexion(destination: string): string {
  return `/connexion?suite=${encodeURIComponent(destination)}`;
}

// La destination vient de l'adresse : on n'accepte qu'un chemin interne, jamais un autre site.
export function suiteSure(valeur: string | null | undefined): string | undefined {
  if (!valeur || !valeur.startsWith("/") || valeur.startsWith("//") || valeur.includes("\\") || valeur.startsWith("/connexion")) return undefined;
  return valeur;
}
