import "server-only";
import { randomBytes } from "crypto";
import { db } from "./db";
import { verifierImage } from "./moderation-image";

/* ── Stockage des fichiers envoyés ──
   Pour l'instant dans la base. Le jour où les fichiers partent vers un stockage dédié
   (Supabase Storage, S3…), seules les deux fonctions ci-dessous changent. */

export const TAILLE_MAX_IMAGE = 5_000_000; // 5 Mo
const PREFIXE_URL = "/api/fichiers/";

// Seuls trois formats sont acceptés. Le type est reconnu d'après le contenu réel du fichier (son début et sa fin),
// jamais d'après le type annoncé par le navigateur ni le nom du fichier : un script ou un PDF renommé en .jpg est refusé.
const FORMATS: { type: string; extension: string; test: (o: Buffer) => boolean }[] = [
  {
    type: "image/jpeg",
    extension: "jpg",
    // Commence par FF D8 FF et se termine par le marqueur de fin d'image FF D9 (des octets de remplissage peuvent suivre).
    test: (o) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff && o.subarray(-64).includes(Buffer.from([0xff, 0xd9])),
  },
  {
    type: "image/png",
    extension: "png",
    // Signature PNG, premier bloc IHDR, et bloc de fin IEND.
    test: (o) =>
      o.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) &&
      o.subarray(12, 16).toString("ascii") === "IHDR" &&
      o.subarray(-12).includes(Buffer.from("IEND", "ascii")),
  },
  {
    type: "image/webp",
    extension: "webp",
    // En-tête RIFF…WEBP dont la taille annoncée correspond à la taille réelle du fichier.
    test: (o) =>
      o.subarray(0, 4).toString("ascii") === "RIFF" && o.subarray(8, 12).toString("ascii") === "WEBP" && Math.abs(o.readUInt32LE(4) + 8 - o.length) <= 1,
  },
];

export function formatReel(donnees: Buffer): { type: string; extension: string } | undefined {
  if (donnees.length < 16) return undefined;
  return FORMATS.find((f) => f.test(donnees));
}

// Nom donné par le serveur : 32 caractères aléatoires et l'extension du format réel. Le nom d'origine n'est jamais gardé.
export const nomFichier = (extension: string) => `${randomBytes(16).toString("hex")}.${extension}`;

export type ResultatImage = { ok: true; url: string } | { ok: false; erreur: string; motifs?: string[] };

// Reçoit une image encodée (« data:image/jpeg;base64,… ») et renvoie l'adresse où elle sera servie.
export async function enregistrerImage(dataUrl: string, auteurId: string): Promise<ResultatImage> {
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { ok: false, erreur: "Image illisible." };
  const donnees = Buffer.from(m[2], "base64");
  if (donnees.length === 0) return { ok: false, erreur: "Image vide." };
  if (donnees.length > TAILLE_MAX_IMAGE) return { ok: false, erreur: "Image trop lourde (5 Mo au maximum)." };
  const format = formatReel(donnees);
  if (!format) return { ok: false, erreur: "Format non accepté : JPG, PNG ou WebP uniquement." };
  // Le type annoncé doit correspondre au contenu réel (un PNG annoncé comme JPEG est suspect).
  if (m[1] !== format.type && !(m[1] === "image/jpg" && format.type === "image/jpeg"))
    return { ok: false, erreur: "Le contenu du fichier ne correspond pas à son format." };
  const type = format.type;
  // Contenu sexuel, violent, choquant ou données personnelles : refusé avant tout enregistrement.
  const verdict = await verifierImage(donnees, type);
  if (!verdict.ok) return { ok: false, erreur: verdict.erreur, motifs: verdict.motifs };
  const fichier = await db.fichier.create({
    data: { id: nomFichier(format.extension), type, taille: donnees.length, donnees, auteurId },
    select: { id: true },
  });
  return { ok: true, url: PREFIXE_URL + fichier.id };
}

export async function lireFichier(id: string): Promise<{ type: string; donnees: Uint8Array } | null> {
  return db.fichier.findUnique({ where: { id }, select: { type: true, donnees: true } });
}

// Une photo d'annonce doit venir de notre stockage ou de la banque d'images d'exemple, jamais d'une adresse quelconque.
export function photoAcceptee(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.length < 300 &&
    (/^\/api\/fichiers\/[a-z0-9]+(\.(jpg|png|webp))?$/.test(url) || url.startsWith("https://images.unsplash.com/"))
  );
}
