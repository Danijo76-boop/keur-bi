import { describe, expect, it } from "vitest";
import { estProfilDemandable, PROFILS, verifierInfosProfil } from "@/lib/profils";

describe("champs obligatoires par profil à l'inscription", () => {
  it("un acheteur n'a rien de plus à remplir", () => {
    expect(verifierInfosProfil("acheteur", {}).erreurs).toEqual({});
  });

  it("une agence doit fournir nom, NINEA, RCCM et adresse valides", () => {
    const vide = verifierInfosProfil("agence", {});
    expect(Object.keys(vide.erreurs).sort()).toEqual(["adresse", "ninea", "nomAgence", "rccm"]);
    const faux = verifierInfosProfil("agence", { nomAgence: "Foncier Plus", ninea: "abc", rccm: "12345", adresse: "Point E, Dakar" });
    expect(Object.keys(faux.erreurs).sort()).toEqual(["ninea", "rccm"]);
    const bon = verifierInfosProfil("agence", { nomAgence: " Foncier Plus ", ninea: "005123456 2G3", rccm: "SN-DKR-2020-B-12345", adresse: "Point E, Dakar" });
    expect(bon.erreurs).toEqual({});
    expect(bon.infos.nomAgence).toBe("Foncier Plus");
  });

  it("chaque profil professionnel a au moins un champ obligatoire", () => {
    for (const p of ["vendeur", "agence", "agent", "notaire", "clerc"] as const) expect(PROFILS[p].champs.length).toBeGreaterThan(0);
  });

  it("refuse les profils réservés à l'équipe", () => {
    expect(estProfilDemandable("admin")).toBe(false);
    expect(estProfilDemandable("moderateur")).toBe(false);
    expect(estProfilDemandable("agence")).toBe(true);
  });
});
