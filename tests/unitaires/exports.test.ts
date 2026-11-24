import { describe, expect, it } from "vitest";
import { nomFichier, textePDF } from "@/lib/export";
import { genererXlsx } from "@/lib/xlsx";

describe("texte des PDF", () => {
  it.each([
    ["1 234 567 FCFA", "1 234 567 FCFA"],
    ["Sacré-Cœur — Dakar…", "Sacré-Coeur - Dakar..."],
    ["Acheteur → Agence « Teranga »", 'Acheteur -> Agence "Teranga"'],
    ["✅ Vérifié ❌ Invalide", "[OK] Vérifié [X] Invalide"],
    ["Villa 🏡 neuve", "Villa neuve"],
    [null, ""],
    [42, "42"],
  ])("« %s » devient « %s »", (entree, attendu) => {
    expect(textePDF(entree as string)).toBe(attendu);
  });

  it("garde les accents français", () => {
    expect(textePDF("Thiès, Ziguinchor, élevé, à, ç, ô")).toBe("Thiès, Ziguinchor, élevé, à, ç, ô");
  });
});

describe("noms des fichiers téléchargés", () => {
  it("sans accent ni caractère spécial, avec la date", () => {
    expect(nomFichier("Rapport : Annonces publiées", "pdf")).toMatch(/^Rapport_Annonces_publiees_\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(nomFichier("Journal d'activité", "xlsx")).toMatch(/^Journal_d_activite_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});

describe("fichiers Excel", () => {
  const contenu = (o: Uint8Array) => Buffer.from(o).toString("utf8");

  it("produit une archive .xlsx avec la feuille et ses données", () => {
    const f = genererXlsx(
      ["Référence", "Prix (FCFA)"],
      [
        ["KB-1", 175000000],
        ["KB-2", 45000000],
      ],
      "Annonces",
    );
    expect(Buffer.from(f.subarray(0, 2)).toString()).toBe("PK");
    const xml = contenu(f);
    expect(xml).toContain("xl/worksheets/sheet1.xml");
    expect(xml).toContain('name="Annonces"');
    expect(xml).toContain("Référence");
    // Les nombres restent des nombres (pas du texte) : on peut les additionner dans Excel.
    expect(xml).toMatch(/<c r="B2"[^>]*><v>175000000<\/v><\/c>/);
  });

  it("n'exécute jamais une valeur qui ressemble à une formule", () => {
    const xml = contenu(genererXlsx(["Action"], [["=SOMME(A1:A9)"], ['=HYPERLINK("http://pirate")']]));
    expect(xml).not.toContain("<f>");
    expect(xml).toContain('t="inlineStr"');
    expect(xml).toContain("=SOMME(A1:A9)");
  });

  it("échappe les caractères spéciaux du XML", () => {
    const xml = contenu(genererXlsx(["Texte"], [["<script>&\"'"]]));
    expect(xml).toContain("&lt;script&gt;&amp;");
    expect(xml).not.toContain("<script>");
  });
});
