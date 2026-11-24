import { describe, expect, it } from "vitest";
import { motDePasseConforme, REGLES_MOT_DE_PASSE } from "@/lib/auth";
import { motDePasseProvisoire, refusMotDePasse } from "@/lib/serveur/securite";

const EMAIL = "awa.diop@exemple.sn";

describe("règles des mots de passe (serveur)", () => {
  it.each([
    ["court1", /au moins 10 caractères/],
    ["toutenlettresx", /au moins un chiffre/],
    ["1234567890", /au moins une lettre/],
    ["password123", /trop courant/],
    ["aaaaaaaaa1", /trop simple/],
    ["awa.diop2026x", /adresse email/],
  ])("refuse « %s » avec un message clair", (mdp, attendu) => {
    expect(refusMotDePasse(mdp, EMAIL)).toMatch(attendu);
  });

  it("refuse un mot de passe de plus de 72 octets (bcrypt le tronquerait en silence)", () => {
    expect(refusMotDePasse("é".repeat(40) + "1", EMAIL)).toMatch(/trop long/);
  });

  it.each(["Teranga!2026zz", "Ma-maison-a-Dakar-7", "Nouveau-Mdp-2026"])("accepte « %s »", (mdp) => {
    expect(refusMotDePasse(mdp, EMAIL)).toBeNull();
  });
});

describe("règles affichées dans le formulaire (navigateur)", () => {
  it("sont cohérentes avec celles du serveur", () => {
    for (const mdp of ["court1", "toutenlettresx", "1234567890", "awa.diop2026x", "Teranga!2026zz", "Nouveau-Mdp-2026"]) {
      const serveur = refusMotDePasse(mdp, EMAIL) === null;
      // Le formulaire ne connaît pas la liste des mots de passe courants : s'il refuse, le serveur refuse aussi.
      if (!motDePasseConforme(mdp, EMAIL)) expect(serveur).toBe(false);
      if (serveur) expect(motDePasseConforme(mdp, EMAIL)).toBe(true);
    }
  });

  it("affichent 4 règles", () => {
    expect(REGLES_MOT_DE_PASSE.map((r) => r.texte)).toHaveLength(4);
  });
});

describe("mot de passe provisoire (compte créé par un administrateur)", () => {
  it("respecte toujours les règles, et change à chaque fois", () => {
    const tires = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const mdp = motDePasseProvisoire();
      expect(refusMotDePasse(mdp, "admin@keurbi.sn")).toBeNull();
      tires.add(mdp);
    }
    expect(tires.size).toBe(200);
  });
});
