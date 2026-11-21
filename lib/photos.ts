"use client";

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
