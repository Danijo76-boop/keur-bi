import { type Bien, prixAffiche } from "./mock-data";

/* ── Recherche et suggestions ──
   La comparaison ignore les accents, la casse, les tirets et la ponctuation :
   « sacre coeur » trouve « Sacré-Cœur », « ngor » trouve « Ngor ». */

export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Vrai si chaque mot saisi se retrouve dans le texte (dans n'importe quel ordre).
export function correspond(texte: string, saisie: string): boolean {
  const cible = normaliser(texte);
  return normaliser(saisie)
    .split(" ")
    .filter(Boolean)
    .every((mot) => cible.includes(mot));
}

export const texteRecherche = (b: Bien) => `${b.titre} ${b.ville} ${b.quartier} ${b.region} ${b.agence} ${b.type} ${b.reference}`;

export type Suggestion =
  { genre: "lieu"; libelle: string; detail: string; valeur: string; nombre: number } | { genre: "annonce"; libelle: string; detail: string; id: string };

const commencePar = (texte: string, saisie: string) =>
  normaliser(texte)
    .split(" ")
    .some((mot) => mot.startsWith(normaliser(saisie).split(" ")[0]));

// Lieux d'abord (quartiers, villes, régions, avec le nombre d'annonces), puis quelques annonces.
export function suggestions(biens: Bien[], saisie: string, { lieux = 5, annonces = 3 } = {}): Suggestion[] {
  if (normaliser(saisie).length < 2) return [];

  const comptes = new Map<string, { libelle: string; detail: string; valeur: string; nombre: number; rang: number }>();
  const ajouter = (cle: string, libelle: string, detail: string, rang: number) => {
    if (!correspond(libelle, saisie)) return;
    const existant = comptes.get(cle);
    if (existant) existant.nombre++;
    else comptes.set(cle, { libelle, detail, valeur: libelle, nombre: 1, rang });
  };
  for (const b of biens) {
    ajouter(
      `q:${b.quartier}|${b.ville}`,
      b.quartier,
      [b.ville, b.region].filter((x, i, t) => x !== b.quartier && t.indexOf(x) === i).join(", ") || "Quartier",
      0,
    );
    if (b.ville !== b.quartier) ajouter(`v:${b.ville}`, b.ville, b.region === b.ville ? "Ville" : `Ville · ${b.region}`, 1);
    if (b.region !== b.ville) ajouter(`r:${b.region}`, b.region, "Région", 2);
  }
  const lieuxTrouves = [...comptes.values()]
    .sort(
      (a, b) =>
        Number(commencePar(b.libelle, saisie)) - Number(commencePar(a.libelle, saisie)) ||
        a.rang - b.rang ||
        b.nombre - a.nombre ||
        a.libelle.localeCompare(b.libelle, "fr"),
    )
    .slice(0, lieux)
    .map(({ libelle, detail, valeur, nombre }): Suggestion => ({ genre: "lieu", libelle, detail, valeur, nombre }));

  const annoncesTrouvees = biens
    .filter((b) => correspond(texteRecherche(b), saisie))
    .sort((a, b) => Number(correspond(b.titre, saisie)) - Number(correspond(a.titre, saisie)) || Number(b.is_featured) - Number(a.is_featured))
    .slice(0, annonces)
    .map((b): Suggestion => ({ genre: "annonce", libelle: b.titre, detail: `${b.quartier}, ${b.ville} · ${prixAffiche(b)}`, id: b.id }));

  return [...lieuxTrouves, ...annoncesTrouvees];
}
