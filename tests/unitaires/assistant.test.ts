import { describe, expect, it } from "vitest";
import { BIENS } from "@/lib/mock-data";
import { catalogue } from "@/lib/serveur/assistant";

describe("catalogue de l'assistant", () => {
  it("donne une ligne par annonce, avec le lien vers sa fiche et son prix", () => {
    const texte = catalogue(BIENS);
    const lignes = texte.split("\n").filter((l) => l.startsWith("- "));
    expect(lignes).toHaveLength(BIENS.length);
    expect(texte).toContain(`(/annonces/${BIENS[0].id})`);
    expect(texte).toContain("FCFA");
  });

  it("le dit quand il n'y a aucune annonce", () => {
    expect(catalogue([])).toMatch(/aucune annonce/);
  });
});
