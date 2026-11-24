import "server-only";
import { db } from "./db";
import { verifierImage } from "./moderation-image";

/* ── Stockage des fichiers envoyés ──
   Pour l'instant dans la base. Le jour où les fichiers partent vers un stockage dédié
   (Supabase Storage, S3…), seules les deux fonctions ci-dessous changent. */

export const TAILLE_MAX_IMAGE = 2_000_000; // octets
const PREFIXE_URL = "/api/fichiers/";

// Signatures de début de fichier : on vérifie le contenu réel, pas seulement le type annoncé.
const SIGNATURES: { type: string; test: (o: Buffer) => boolean }[] = [
  { type: "image/jpeg", test: (o) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff },
  { type: "image/png", test: (o) => o.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/webp", test: (o) => o.subarray(0, 4).toString("ascii") === "RIFF" && o.subarray(8, 12).toString("ascii") === "WEBP" },
];

export type ResultatImage = { ok: true; url: string } | { ok: false; erreur: string; motifs?: string[] };

// Reçoit une image encodée (« data:image/jpeg;base64,… ») et renvoie l'adresse où elle sera servie.
export async function enregistrerImage(dataUrl: string, auteurId: string): Promise<ResultatImage> {
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { ok: false, erreur: "Image illisible." };
  const donnees = Buffer.from(m[2], "base64");
  if (donnees.length === 0 || donnees.length > TAILLE_MAX_IMAGE) return { ok: false, erreur: "Image trop lourde (2 Mo au maximum)." };
  const type = SIGNATURES.find((s) => s.test(donnees))?.type;
  if (!type) return { ok: false, erreur: "Format d'image non accepté (JPEG, PNG ou WebP)." };
  // Contenu sexuel, violent, choquant ou données personnelles : refusé avant tout enregistrement.
  const verdict = await verifierImage(donnees, type);
  if (!verdict.ok) return { ok: false, erreur: verdict.erreur, motifs: verdict.motifs };
  const fichier = await db.fichier.create({ data: { type, taille: donnees.length, donnees, auteurId }, select: { id: true } });
  return { ok: true, url: PREFIXE_URL + fichier.id };
}

export async function lireFichier(id: string): Promise<{ type: string; donnees: Uint8Array } | null> {
  return db.fichier.findUnique({ where: { id }, select: { type: true, donnees: true } });
}

// Une photo d'annonce doit venir de notre stockage ou de la banque d'images d'exemple, jamais d'une adresse quelconque.
export function photoAcceptee(url: unknown): url is string {
  return typeof url === "string" && url.length < 300 && (/^\/api\/fichiers\/[a-z0-9]+$/.test(url) || url.startsWith("https://images.unsplash.com/"));
}
