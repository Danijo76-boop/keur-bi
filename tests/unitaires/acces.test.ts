import { describe, expect, it } from "vitest";
import { estPagePublique, suiteSure, versConnexion } from "@/lib/acces";

describe("pages ouvertes aux visiteurs", () => {
  it("laisse consulter la liste et la fiche des annonces", () => {
    expect(estPagePublique("/annonces")).toBe(true);
    expect(estPagePublique("/annonces/")).toBe(true);
    expect(estPagePublique("/annonces/b1")).toBe(true);
    expect(estPagePublique("/carte")).toBe(true);
  });

  it("garde réservées les actions et l'espace personnel", () => {
    expect(estPagePublique("/annonces/b1/offre")).toBe(false);
    expect(estPagePublique("/favoris")).toBe(false);
    expect(estPagePublique("/dossiers/d1")).toBe(false);
    expect(estPagePublique("/annoncesx")).toBe(false);
  });

  it("ramène sur l'annonce après connexion", () => {
    const adresse = versConnexion("/annonces/b1");
    expect(adresse).toBe("/connexion?suite=%2Fannonces%2Fb1");
    expect(suiteSure(new URLSearchParams(adresse.split("?")[1]).get("suite"))).toBe("/annonces/b1");
  });
});
