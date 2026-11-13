/* ── Ce qu'un visiteur non connecté peut voir ──
   La présentation du site et les pages d'information sont ouvertes à tous.
   Tout le reste (annonces, carte, outils, services, annuaires, espace personnel) demande un compte.
   Ce fichier est lu à la fois par le serveur (middleware.ts) et par le navigateur (GardeVisiteur). */

export const PAGES_PUBLIQUES = ["/", "/connexion", "/bienvenue", "/faq", "/guides", "/tarifs", "/contact", "/annonceurs", "/diaspora"];

export function estPagePublique(chemin: string): boolean {
  const propre = chemin.length > 1 ? chemin.replace(/\/+$/, "") : chemin;
  return PAGES_PUBLIQUES.includes(propre) || propre.startsWith("/legal/");
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
