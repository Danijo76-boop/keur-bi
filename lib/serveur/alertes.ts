import "server-only";
import type { Alerte as LigneAlerte, Bien as LigneBien, Utilisateur } from "@prisma/client";
import type { Alerte, CriteresAlerte } from "@/lib/preferences";
import { db } from "./db";
import { adresseSite, echapper, envoyerEmail } from "./email";
import { log } from "./journal";
import { REGIONS_ACCEPTEES } from "./annonces";

const MAX_ALERTES = 20;
const TYPES = ["terrain", "villa", "appartement", "bureau"];

export function versAlerte(a: LigneAlerte, email: string): Alerte {
  return { id: a.id, email, nom: a.nom, criteres: a.criteres as CriteresAlerte, frequence: a.frequence === "Hebdomadaire" ? "Hebdomadaire" : "Quotidien", creeLe: a.creeLe.toISOString() };
}

// Ne garde que des critères connus et bien formés.
export function nettoyerCriteres(c: unknown): CriteresAlerte {
  const x = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
  const nombre = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1e13 ? Math.round(v) : undefined);
  return {
    ...(x.transaction === "location" && { transaction: "location" as const }),
    ...(typeof x.q === "string" && x.q.trim() && { q: x.q.trim().slice(0, 80) }),
    ...(typeof x.type === "string" && TYPES.includes(x.type) && { type: x.type }),
    ...(typeof x.region === "string" && REGIONS_ACCEPTEES.includes(x.region) && { region: x.region }),
    ...(nombre(x.prixMax) && { prixMax: nombre(x.prixMax) }),
    ...(nombre(x.superficieMin) && { superficieMin: nombre(x.superficieMin) }),
    ...(nombre(x.superficieMax) && { superficieMax: nombre(x.superficieMax) }),
    ...(x.tfVerifie === true && { tfVerifie: true }),
  };
}

export async function listerAlertes(compte: Utilisateur): Promise<Alerte[]> {
  const lignes = await db.alerte.findMany({ where: { utilisateurId: compte.id, actif: true }, orderBy: { creeLe: "desc" } });
  return lignes.map((a) => versAlerte(a, compte.email));
}

export async function creerAlerte(compte: Utilisateur, corps: Record<string, unknown>): Promise<{ ok: true; alerte: Alerte } | { ok: false; erreur: string }> {
  if ((await db.alerte.count({ where: { utilisateurId: compte.id, actif: true } })) >= MAX_ALERTES) return { ok: false, erreur: `Vous avez déjà ${MAX_ALERTES} alertes. Supprimez-en une pour en créer une autre.` };
  const nom = typeof corps.nom === "string" && corps.nom.trim() ? corps.nom.trim().slice(0, 120) : "Ma recherche";
  const frequence = corps.frequence === "Hebdomadaire" ? "Hebdomadaire" : "Quotidien";
  // Point de départ : seules les annonces publiées après la création de l'alerte seront envoyées.
  const ligne = await db.alerte.create({ data: { utilisateurId: compte.id, nom, frequence, criteres: nettoyerCriteres(corps.criteres), dernierEnvoi: new Date() } });
  return { ok: true, alerte: versAlerte(ligne, compte.email) };
}

export async function supprimerAlerte(compte: Utilisateur, id: string): Promise<boolean> {
  const r = await db.alerte.deleteMany({ where: { id, utilisateurId: compte.id } });
  return r.count > 0;
}

function correspond(b: LigneBien, c: CriteresAlerte): boolean {
  if ((c.transaction ?? "vente") !== b.transaction) return false;
  if (c.type && b.type !== c.type) return false;
  if (c.region && b.region !== c.region) return false;
  if (c.prixMax && Number(b.prix) > c.prixMax) return false;
  if (c.superficieMin && b.superficie < c.superficieMin) return false;
  if (c.superficieMax && b.superficie > c.superficieMax) return false;
  if (c.tfVerifie && !b.tfVerifie) return false;
  if (c.q && !`${b.titre} ${b.ville} ${b.quartier} ${b.region}`.toLowerCase().includes(c.q.toLowerCase())) return false;
  return true;
}

function urlRecherche(c: CriteresAlerte): string {
  const p = new URLSearchParams();
  if (c.transaction === "location") p.set("transaction", "location");
  if (c.q) p.set("q", c.q);
  if (c.type) p.set("type", c.type);
  if (c.region) p.set("region", c.region);
  if (c.prixMax) p.set("prixMax", String(c.prixMax));
  if (c.superficieMin) p.set("supMin", String(c.superficieMin));
  if (c.superficieMax) p.set("supMax", String(c.superficieMax));
  return `${adresseSite()}/annonces${p.toString() ? `?${p}` : ""}`;
}

const prixTexte = (b: LigneBien) => `${Number(b.prix).toLocaleString("fr-FR")} FCFA${b.transaction === "location" ? " / mois" : ""}`;

function composerEmail(nomPersonne: string, alerte: LigneAlerte, biens: LigneBien[]) {
  const site = adresseSite();
  const c = alerte.criteres as CriteresAlerte;
  const titre = `${biens.length} nouvelle${biens.length > 1 ? "s" : ""} annonce${biens.length > 1 ? "s" : ""} pour « ${alerte.nom} »`;
  const lignes = biens.slice(0, 10);
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f6f8;font-family:Arial,sans-serif;color:#1b2a4a">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <p style="font-size:20px;font-weight:bold;margin:0 0 4px">KEUR BI</p>
  <p style="margin:0 0 20px;color:#555">Bonjour ${echapper(nomPersonne)}, voici ${biens.length > 1 ? "les nouvelles annonces qui correspondent" : "la nouvelle annonce qui correspond"} à votre alerte « ${echapper(alerte.nom)} ».</p>
  ${lignes
    .map(
      (b) => `<a href="${site}/annonces/${encodeURIComponent(b.id)}" style="display:block;text-decoration:none;color:inherit;background:#fff;border-radius:12px;padding:14px 16px;margin-bottom:10px">
    <span style="display:block;font-weight:bold">${echapper(b.titre)}</span>
    <span style="display:block;color:#777;font-size:13px">${echapper(b.quartier)}, ${echapper(b.ville)} · ${b.superficie.toLocaleString("fr-FR")} m²</span>
    <span style="display:block;font-weight:bold;color:#1b4f72;margin-top:6px">${prixTexte(b)}</span>
  </a>`,
    )
    .join("\n  ")}
  ${biens.length > lignes.length ? `<p style="color:#555">… et ${biens.length - lignes.length} autre(s).</p>` : ""}
  <p style="margin:20px 0"><a href="${urlRecherche(c)}" style="background:#e8a33d;color:#1b2a4a;font-weight:bold;text-decoration:none;padding:10px 18px;border-radius:8px">Voir toutes les annonces</a></p>
  <p style="font-size:12px;color:#888">Vous recevez cet email car vous avez créé cette alerte sur KEUR BI. <a href="${site}/notifications" style="color:#888">Gérer ou supprimer mes alertes</a>.</p>
</div></body></html>`;
  const texte = [
    `Bonjour ${nomPersonne},`,
    `Nouvelles annonces pour votre alerte « ${alerte.nom} » :`,
    ...lignes.map((b) => `- ${b.titre} (${b.quartier}, ${b.ville}) : ${prixTexte(b)} — ${site}/annonces/${b.id}`),
    "",
    `Voir toutes les annonces : ${urlRecherche(c)}`,
    `Gérer mes alertes : ${site}/notifications`,
  ].join("\n");
  return { sujet: titre, html, texte };
}

const DELAI_MS = { Quotidien: 20 * 60 * 60_000, Hebdomadaire: 6.5 * 24 * 60 * 60_000 };

// Passe en revue les alertes arrivées à échéance et envoie un email pour celles qui ont de nouvelles annonces.
// Lancé chaque jour par la tâche planifiée de Vercel (voir vercel.json et /api/cron/alertes).
export async function traiterAlertes(): Promise<{ examinees: number; envoyees: number; echecs: number }> {
  const maintenant = Date.now();
  const alertes = await db.alerte.findMany({ where: { actif: true }, include: { utilisateur: { select: { email: true, nom: true, suspendu: true } } } });
  let examinees = 0, envoyees = 0, echecs = 0;
  for (const a of alertes) {
    const depuis = a.dernierEnvoi ?? a.creeLe;
    const delai = DELAI_MS[a.frequence === "Hebdomadaire" ? "Hebdomadaire" : "Quotidien"];
    if (a.utilisateur.suspendu || maintenant - depuis.getTime() < delai) continue;
    examinees++;
    const nouveaux = (await db.bien.findMany({ where: { depublie: false, publieLe: { gt: depuis } }, orderBy: { publieLe: "desc" }, take: 200 })).filter((b) => correspond(b, a.criteres as CriteresAlerte));
    if (nouveaux.length > 0) {
      const email = composerEmail(a.utilisateur.nom, a, nouveaux);
      const r = await envoyerEmail({ a: a.utilisateur.email, ...email });
      if (r.ok) envoyees++;
      else if (r.raison !== "non_configure") {
        // Échec passager : on réessaiera au prochain passage sans perdre d'annonce.
        echecs++;
        continue;
      }
    }
    await db.alerte.update({ where: { id: a.id }, data: { dernierEnvoi: new Date(maintenant) } });
  }
  log.info("Alertes traitées", { examinees, envoyees, echecs });
  return { examinees, envoyees, echecs };
}
