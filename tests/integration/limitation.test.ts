import { afterAll, describe, expect, it } from "vitest";
import { compterEssai, essaiConnexionParAdresse, essaisRestants, freiner, limiteAtteinte, minutesAvantDeblocage, oublierEssais } from "@/lib/serveur/securite";
import { baseDisponible, nettoyer } from "../outils/base";

describe.skipIf(!baseDisponible)("limitation des essais en série (connexions, envois…)", () => {
  afterAll(nettoyer);
  const limite = { max: 3, fenetreMs: 15 * 60_000 };

  it("bloque au-delà du maximum, indique les essais restants et la durée du blocage", async () => {
    const cle = `test:connexion-${Date.now()}`;
    expect(await essaisRestants(cle, limite)).toBe(3);
    await compterEssai(cle, limite);
    await compterEssai(cle, limite);
    expect(await essaisRestants(cle, limite)).toBe(1);
    expect(await limiteAtteinte(cle, limite)).toBe(false);
    await compterEssai(cle, limite);
    expect(await limiteAtteinte(cle, limite)).toBe(true);
    expect(await minutesAvantDeblocage(cle, limite)).toBeGreaterThanOrEqual(14);
    expect(await minutesAvantDeblocage(cle, limite)).toBeLessThanOrEqual(15);
  });

  it("une connexion réussie remet le compteur à zéro", async () => {
    const cle = `test:remise-${Date.now()}`;
    await compterEssai(cle, limite);
    await compterEssai(cle, limite);
    await oublierEssais(cle);
    expect(await essaisRestants(cle, limite)).toBe(3);
  });

  it("freiner() compte et refuse en une fois", async () => {
    const cle = `test:freiner-${Date.now()}`;
    expect([await freiner(cle, limite), await freiner(cle, limite), await freiner(cle, limite), await freiner(cle, limite)]).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it("connexion : 5 essais par minute et par adresse IP, puis 15 minutes de blocage", async () => {
    const ip = `test-ip-${Date.now()}`;
    for (let i = 0; i < 5; i++) expect(await essaiConnexionParAdresse(ip)).toBe(0);
    expect(await essaiConnexionParAdresse(ip)).toBe(15); // 6e essai de la minute : bloqué
    expect(await essaiConnexionParAdresse(ip)).toBeGreaterThanOrEqual(14); // et le reste, même plus tard dans la minute
    expect(await essaiConnexionParAdresse(`${ip}-autre`)).toBe(0); // une autre adresse n'est pas touchée
    expect(await essaiConnexionParAdresse(undefined)).toBe(0); // sans adresse (local) : pas de limite par IP
  });
});
