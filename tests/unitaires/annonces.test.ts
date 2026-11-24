import { describe, expect, it } from "vitest";
import { peutPublier, quotaAnnonces } from "@/lib/serveur/annonces";

describe("droit de publier", () => {
  it.each([
    ["vendeur", true],
    ["agence", true],
    ["agent", true],
    ["admin", true],
    ["acheteur", false],
    ["notaire", false],
    ["moderateur", false],
  ] as const)("%s : %s", (role, attendu) => expect(peutPublier(role)).toBe(attendu));
});

describe("nombre d'annonces actives autorisées", () => {
  it("vendeur particulier : 2", () => expect(quotaAnnonces({ role: "vendeur", plan: null })).toBe(2));
  it("agence sans abonnement : 1", () => expect(quotaAnnonces({ role: "agence", plan: null })).toBe(1));
  it("agence Pro : 5", () => expect(quotaAnnonces({ role: "agence", plan: "pro" })).toBe(5));
  it("agence Promoteur : sans limite", () => expect(quotaAnnonces({ role: "agence", plan: "promoteur" })).toBe(Infinity));
  it("agent : sans limite propre", () => expect(quotaAnnonces({ role: "agent", plan: null })).toBe(Infinity));
});
