import { afterAll, describe, expect, it } from "vitest";
import { creerAnnonce } from "@/lib/serveur/annonces";
import { baseDisponible, creerCompte, nettoyer } from "../outils/base";

const PHOTO = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600";
const annonce = (champs: Record<string, unknown> = {}) => ({
  titre: "Villa de test avec jardin",
  type: "villa",
  superficie: 250,
  prix: 95_000_000,
  region: "Dakar",
  ville: "Dakar",
  quartier: "Ouakam",
  description: "Belle villa de test, proche de la mer.",
  telephone: "+221701112233",
  photos: [PHOTO, PHOTO, PHOTO],
  transaction: "vente",
  proprietaire: "Compte de test",
  tf: { numero: "", conservation: null, date_etablissement: null, superficie_cadastrale: 250 },
  ...champs,
});

describe.skipIf(!baseDisponible)("publication d'une annonce", () => {
  afterAll(nettoyer);

  it("un acheteur ne peut pas publier", async () => {
    const r = await creerAnnonce(await creerCompte({ role: "acheteur" }), annonce());
    expect(r).toMatchObject({ ok: false, status: 403 });
  });

  it.each([
    [{ titre: "Abc" }, /titre/],
    [{ type: "chateau" }, /Type de bien/],
    [{ prix: -5 }, /Prix invalide/],
    [{ region: "Paris" }, /Région/],
    [{ photos: [PHOTO] }, /entre 3 et 8 photos/],
    [{ photos: ["https://pirate.example/a.jpg", PHOTO, PHOTO] }, /photo/],
  ])("refuse une annonce invalide (%o)", async (champs, attendu) => {
    const r = await creerAnnonce(await creerCompte({ role: "vendeur" }), annonce(champs));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(attendu);
  });

  it("vendeur particulier : 2 annonces actives au maximum", async () => {
    const vendeur = await creerCompte({ role: "vendeur" });
    expect((await creerAnnonce(vendeur, annonce())).ok).toBe(true);
    expect((await creerAnnonce(vendeur, annonce())).ok).toBe(true);
    const troisieme = await creerAnnonce(vendeur, annonce());
    expect(troisieme).toMatchObject({ ok: false, status: 403 });
    if (!troisieme.ok) expect(troisieme.erreur).toMatch(/2 annonce\(s\) active\(s\)/);
  });

  it("une annonce valide reçoit une référence unique", async () => {
    const r = await creerAnnonce(await creerCompte({ role: "vendeur" }), annonce());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.annonce.reference).toMatch(/^KB-\d{4}-/);
  });
});
