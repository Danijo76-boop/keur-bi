import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/serveur/db";
import { ouvrirDefi, renvoyerCode, verifierCode, type EtapeOTP } from "@/lib/serveur/otp";
import { baseDisponible, creerCompte, nettoyer } from "../outils/base";

/* Codes à usage unique : connexion en deux temps et mot de passe oublié.
   Sans service d'envoi configuré, les tests tournent en « mode démo » : le code est renvoyé dans la réponse. */

const code = (e: EtapeOTP) => {
  if (e.etape !== "code" || !e.codeDemo) throw new Error("code attendu");
  return e.codeDemo;
};
const faux = (vrai: string) => (vrai === "000000" ? "111111" : "000000");

describe.skipIf(!baseDisponible)("connexion en deux temps", () => {
  afterAll(nettoyer);

  it("compte sans numéro : demande le numéro, envoie le code, puis enregistre le numéro vérifié", async () => {
    const compte = await creerCompte();
    const d = await ouvrirDefi(compte, "connexion");
    expect(d.ok && d.valeur.etape).toBe("numero");
    if (!d.ok) return;

    const envoi = await renvoyerCode(d.valeur.defi, "connexion", "+221771112233");
    expect(envoi.ok && envoi.valeur).toMatchObject({ etape: "code", canal: "whatsapp", destination: "+221 77 *** ** 33" });
    if (!envoi.ok) return;

    const ok = await verifierCode(d.valeur.defi, "connexion", code(envoi.valeur));
    expect(ok.ok).toBe(true);
    expect((await db.utilisateur.findUniqueOrThrow({ where: { id: compte.id } })).whatsapp).toBe("+221771112233");

    // Un code ne sert qu'une fois.
    const encore = await verifierCode(d.valeur.defi, "connexion", code(envoi.valeur));
    expect(encore).toMatchObject({ ok: false, status: 410 });
  });

  it("compte avec numéro vérifié : le code part directement, et un autre numéro saisi est ignoré", async () => {
    const compte = await creerCompte({ whatsapp: "+221770000001" });
    const d = await ouvrirDefi(compte, "connexion");
    expect(d.ok && d.valeur).toMatchObject({ etape: "code", destination: "+221 77 *** ** 01" });
    if (!d.ok) return;
    await db.defiOTP.updateMany({ where: { utilisateurId: compte.id }, data: { envoyeLe: new Date(0) } });
    const detour = await renvoyerCode(d.valeur.defi, "connexion", "+221709999999");
    expect(detour.ok && detour.valeur).toMatchObject({ destination: "+221 77 *** ** 01" });
  });

  it("mauvais code : essais restants affichés, puis annulation au 5e", async () => {
    const compte = await creerCompte({ whatsapp: "+221770000002" });
    const d = await ouvrirDefi(compte, "connexion");
    if (!d.ok) throw new Error(d.erreur);
    const mauvais = faux(code(d.valeur));
    const messages: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await verifierCode(d.valeur.defi, "connexion", mauvais);
      if (!r.ok) messages.push(r.erreur);
    }
    expect(messages[0]).toMatch(/Il vous reste 4 essais/);
    expect(messages[3]).toMatch(/Il vous reste 1 essai /);
    expect(messages[4]).toMatch(/annulée/);
    // Après annulation, même le bon code ne passe plus.
    expect((await verifierCode(d.valeur.defi, "connexion", code(d.valeur))).ok).toBe(false);
  });

  it("refuse un code mal formé sans consommer d'essai", async () => {
    const compte = await creerCompte({ whatsapp: "+221770000003" });
    const d = await ouvrirDefi(compte, "connexion");
    if (!d.ok) throw new Error(d.erreur);
    expect(await verifierCode(d.valeur.defi, "connexion", "12ab")).toMatchObject({ ok: false, erreur: "Le code compte 6 chiffres." });
    expect((await verifierCode(d.valeur.defi, "connexion", code(d.valeur))).ok).toBe(true);
  });

  it("un code reçu par email ne rend pas le numéro « vérifié »", async () => {
    const compte = await creerCompte();
    const d = await ouvrirDefi(compte, "connexion", "+221770000004");
    if (!d.ok) throw new Error(d.erreur);
    await db.defiOTP.updateMany({ where: { utilisateurId: compte.id }, data: { envoyeLe: new Date(0) } });
    const parEmail = await renvoyerCode(d.valeur.defi, "connexion", null, "email");
    if (!parEmail.ok) throw new Error(parEmail.erreur);
    expect(parEmail.valeur).toMatchObject({ canal: "email" });
    expect((await verifierCode(d.valeur.defi, "connexion", code(parEmail.valeur))).ok).toBe(true);
    expect((await db.utilisateur.findUniqueOrThrow({ where: { id: compte.id } })).whatsapp).toBeNull();
  });
});

describe.skipIf(!baseDisponible)("mot de passe oublié", () => {
  afterAll(nettoyer);

  it("compte sans numéro vérifié : le code part par email, jamais vers un numéro saisi", async () => {
    const compte = await creerCompte();
    const d = await ouvrirDefi(compte, "reinitialisation");
    expect(d.ok && d.valeur).toMatchObject({ etape: "code", canal: "email" });
    if (!d.ok) return;
    await db.defiOTP.updateMany({ where: { utilisateurId: compte.id }, data: { envoyeLe: new Date(0) } });
    // Même en demandant WhatsApp avec un numéro saisi, le code repart vers l'email du compte.
    const tentative = await renvoyerCode(d.valeur.defi, "reinitialisation", "+221709999999", "whatsapp");
    expect(tentative.ok && tentative.valeur).toMatchObject({ canal: "email" });
    const defi = await db.defiOTP.findFirstOrThrow({ where: { utilisateurId: compte.id, but: "reinitialisation" } });
    expect(defi.numero).toBeNull();
  });

  it("un code de connexion ne permet pas de réinitialiser le mot de passe, et inversement", async () => {
    const compte = await creerCompte({ whatsapp: "+221770000005" });
    const connexion = await ouvrirDefi(compte, "connexion");
    const reinit = await ouvrirDefi(compte, "reinitialisation");
    if (!connexion.ok || !reinit.ok) throw new Error("défi non ouvert");
    expect(await verifierCode(connexion.valeur.defi, "reinitialisation", code(connexion.valeur))).toMatchObject({ ok: false, status: 410 });
    expect(await verifierCode(reinit.valeur.defi, "connexion", code(reinit.valeur))).toMatchObject({ ok: false, status: 410 });
    expect((await verifierCode(reinit.valeur.defi, "reinitialisation", code(reinit.valeur))).ok).toBe(true);
  });

  it("un compte suspendu ne peut pas finir la vérification", async () => {
    const compte = await creerCompte({ whatsapp: "+221770000006" });
    const d = await ouvrirDefi(compte, "reinitialisation");
    if (!d.ok) throw new Error(d.erreur);
    await db.utilisateur.update({ where: { id: compte.id }, data: { suspendu: true } });
    expect(await verifierCode(d.valeur.defi, "reinitialisation", code(d.valeur))).toMatchObject({ ok: false, status: 410 });
  });
});

describe.skipIf(!baseDisponible)("envoi réel simulé : WhatsApp, puis SMS, puis email", () => {
  afterAll(nettoyer);
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function simuler(whatsappOk: boolean) {
    const appels: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("graph.facebook.com")) {
        appels.push("whatsapp");
        return new Response("{}", { status: whatsappOk ? 200 : 400 });
      }
      if (url.includes("twilio.com")) {
        appels.push("sms");
        return new Response("{}", { status: 201 });
      }
      if (url.includes("resend.com")) {
        appels.push("email");
        return new Response("{}", { status: 200 });
      }
      throw new Error(`adresse inattendue : ${url}`);
    });
    return appels;
  }

  it("WhatsApp refusé (numéro sans WhatsApp) : le code part par SMS", async () => {
    vi.stubEnv("WHATSAPP_TOKEN", "t");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "1");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC1");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "x");
    vi.stubEnv("TWILIO_FROM", "KEURBI");
    const appels = simuler(false);
    const compte = await creerCompte({ whatsapp: "+33612345678" });
    const d = await ouvrirDefi(compte, "connexion");
    expect(appels).toEqual(["whatsapp", "sms"]);
    expect(d.ok && d.valeur).toMatchObject({ canal: "sms" });
    expect(d.ok && d.valeur.etape === "code" && d.valeur.codeDemo).toBeFalsy();
  });

  it("seul l'email est configuré : le code part par email sans demander de numéro", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const appels = simuler(true);
    const compte = await creerCompte();
    const d = await ouvrirDefi(compte, "connexion");
    expect(appels).toEqual(["email"]);
    expect(d.ok && d.valeur).toMatchObject({ etape: "code", canal: "email" });
  });
});
