"use client";

// Formats et poids acceptés pour une photo choisie. Le serveur refait toutes ces vérifications sur le contenu réel.
export const FORMATS_PHOTO = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPT_PHOTOS = FORMATS_PHOTO.join(",");
export const TAILLE_MAX_PHOTO = 5_000_000; // 5 Mo

// Écarte d'emblée les fichiers qui ne sont pas des JPG, PNG ou WebP de 5 Mo au plus, avec un message clair.
export function trierPhotos(fichiers: File[]): { retenues: File[]; message: string } {
  const formats = fichiers.filter((f) => !FORMATS_PHOTO.includes(f.type));
  const lourdes = fichiers.filter((f) => FORMATS_PHOTO.includes(f.type) && f.size > TAILLE_MAX_PHOTO);
  const message = [
    formats.length ? `${formats.map((f) => f.name).join(", ")} : format non accepté (JPG, PNG ou WebP uniquement).` : "",
    lourdes.length ? `${lourdes.map((f) => f.name).join(", ")} : trop lourd (5 Mo au maximum).` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return { retenues: fichiers.filter((f) => !formats.includes(f) && !lourdes.includes(f)), message };
}

// Redimensionne une photo dans le navigateur avant l'envoi : des photos légères se chargent vite
// et restent sous la limite acceptée par le serveur.
export async function reduirePhoto(f: File, largeurMax = 1000): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(f);
  });
  const img = document.createElement("img");
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = source;
  });
  const echelle = Math.min(1, largeurMax / img.width);
  const c = document.createElement("canvas");
  c.width = img.width * echelle;
  c.height = img.height * echelle;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.75);
}

// Envoie une photo au serveur et renvoie son adresse.
export async function envoyerPhoto(dataUrl: string): Promise<string> {
  const r = await fetch("/api/fichiers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) throw new Error(d.erreur ?? "Envoi de la photo impossible.");
  return d.url as string;
}

// Envoie des photos dès leur ajout : le serveur vérifie leur contenu (nudité, violence, données personnelles…)
// avant de les garder. Renvoie les adresses des photos acceptées et un message pour celles refusées.
export async function envoyerPhotosVerifiees(dataUrls: string[]): Promise<{ adresses: string[]; message: string }> {
  const resultats = await Promise.allSettled(dataUrls.map(envoyerPhoto));
  const adresses: string[] = [];
  const refus: string[] = [];
  resultats.forEach((r, i) => {
    if (r.status === "fulfilled") adresses.push(r.value);
    else
      refus.push(
        dataUrls.length > 1
          ? `Photo ${i + 1} : ${r.reason instanceof Error ? r.reason.message : "envoi impossible."}`
          : r.reason instanceof Error
            ? r.reason.message
            : "Envoi impossible.",
      );
  });
  return { adresses, message: refus.join(" ") };
}
