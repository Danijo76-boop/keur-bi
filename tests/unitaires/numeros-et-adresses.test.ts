import { describe, expect, it } from "vitest";
import { emailValide, normaliserEmail } from "@/lib/serveur/auth";
import { photoAcceptee } from "@/lib/serveur/fichiers";
import { masquerEmail } from "@/lib/serveur/otp";
import { masquerNumero, normaliserNumero } from "@/lib/serveur/whatsapp";
import { decrireAppareil } from "@/lib/serveur/alertes-securite";

describe("numéros WhatsApp", () => {
  it.each([
    ["77 123 45 67", "+221771234567"],
    ["771234567", "+221771234567"],
    ["+221 77-123-45-67", "+221771234567"],
    ["00221771234567", "+221771234567"],
    ["221771234567", "+221771234567"],
    ["33 812 34 56", "+221338123456"],
    ["+33 6 12 34 56 78", "+33612345678"],
    ["0033612345678", "+33612345678"],
  ])("« %s » devient %s", (saisie, attendu) => {
    expect(normaliserNumero(saisie)).toBe(attendu);
  });

  it.each(["123", "abc", "+0123456789", "77 12", ""])("refuse « %s »", (saisie) => {
    expect(normaliserNumero(saisie)).toBeNull();
  });

  it("masque le numéro sans le rendre méconnaissable", () => {
    expect(masquerNumero("+221771234567")).toBe("+221 77 *** ** 67");
  });
});

describe("adresses email", () => {
  it("normalise et valide", () => {
    expect(normaliserEmail("  Awa.Diop@Exemple.SN ")).toBe("awa.diop@exemple.sn");
    expect(emailValide("awa@exemple.sn")).toBe(true);
    expect(emailValide("awa@exemple")).toBe(false);
    expect(emailValide("a b@exemple.sn")).toBe(false);
  });

  it("masque l'adresse affichée à l'écran", () => {
    expect(masquerEmail("daniel@exemple.sn")).toBe("d•••••@exemple.sn");
  });
});

describe("adresses de photos acceptées dans une annonce", () => {
  it.each(["/api/fichiers/abc123", "https://images.unsplash.com/photo-1?w=600"])("accepte %s", (url) => expect(photoAcceptee(url)).toBe(true));

  it.each(["https://pirate.example/photo.jpg", "javascript:alert(1)", "/api/fichiers/../../etc/passwd", "x".repeat(400), 42])("refuse %s", (url) =>
    expect(photoAcceptee(url)).toBe(false),
  );
});

describe("description de l'appareil dans les alertes de connexion", () => {
  it.each([
    ["Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36", "Chrome sur Android"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1", "Safari sur iPhone"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0", "Edge sur Windows"],
    ["", "un navigateur sur un appareil inconnu"],
  ])("%s", (ua, attendu) => expect(decrireAppareil(ua)).toBe(attendu));
});
