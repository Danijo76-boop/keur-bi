import { describe, expect, it } from "vitest";
import { BIENS } from "@/lib/mock-data";
import { correspond, normaliser, suggestions } from "@/lib/recherche";

describe("recherche sans accents", () => {
  it("ignore accents, casse, tirets et ligatures", () => {
    expect(normaliser("Sacré-Cœur")).toBe("sacre coeur");
    expect(correspond("Villa duplex — Sacré-Cœur", "sacre coeur")).toBe(true);
    expect(correspond("Villa duplex — Sacré-Cœur", "SACRÉ")).toBe(true);
  });

  it("demande chaque mot saisi, dans n'importe quel ordre", () => {
    expect(correspond("Villa moderne Mermoz Dakar", "dakar villa")).toBe(true);
    expect(correspond("Villa moderne Mermoz Dakar", "dakar terrain")).toBe(false);
  });
});

describe("suggestions", () => {
  it("attend au moins deux lettres", () => {
    expect(suggestions(BIENS, "")).toEqual([]);
    expect(suggestions(BIENS, "d")).toEqual([]);
  });

  it("propose d'abord les lieux, avec le nombre d'annonces, puis des annonces", () => {
    const liste = suggestions(BIENS, "dak");
    expect(liste[0]).toMatchObject({ genre: "lieu" });
    const dakar = liste.find((s) => s.genre === "lieu" && s.libelle === "Dakar");
    expect(dakar && dakar.genre === "lieu" && dakar.nombre).toBeGreaterThan(1);
    const premiereAnnonce = liste.findIndex((s) => s.genre === "annonce");
    expect(liste.slice(premiereAnnonce).every((s) => s.genre === "annonce")).toBe(true);
  });

  it("trouve un quartier tapé sans accent", () => {
    const quartier = BIENS.find((b) => /[éèêç]/.test(b.quartier))?.quartier;
    if (!quartier) return;
    const saisie = normaliser(quartier).slice(0, 5);
    expect(suggestions(BIENS, saisie).some((s) => s.libelle === quartier)).toBe(true);
  });

  it("ne répète pas un même lieu", () => {
    const libelles = suggestions(BIENS, "da", { lieux: 20, annonces: 0 }).map((s) => `${s.libelle}|${s.detail}`);
    expect(new Set(libelles).size).toBe(libelles.length);
  });
});
