import { describe, expect, it } from "vitest";
import { formatReel, nomFichier, photoAcceptee } from "@/lib/serveur/fichiers";

// Petites images réelles de 4 × 4 pixels.
const JPG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAEAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCOiiivmj7A/9k=",
  "base64",
);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGM8kWLEAANMDEgANwcARfYBZhhDpbAAAAAASUVORK5CYII=", "base64");
const WEBP = Buffer.from("UklGRjoAAABXRUJQVlA4IC4AAADwAQCdASoEAAQAAUAmJaACdLoB+AAEyAAA/q4X/zYEDND6YP/SbPE2eJs+OYAA", "base64");

describe("format réel des images envoyées", () => {
  it("reconnaît JPG, PNG et WebP d'après leur contenu", () => {
    expect(formatReel(JPG)?.type).toBe("image/jpeg");
    expect(formatReel(PNG)?.type).toBe("image/png");
    expect(formatReel(WEBP)?.type).toBe("image/webp");
  });

  it("refuse un fichier déguisé ou tronqué", () => {
    expect(formatReel(Buffer.from("<svg onload=alert(1)>…</svg>"))).toBeUndefined();
    expect(formatReel(Buffer.from("%PDF-1.7 faux document renommé en photo.jpg"))).toBeUndefined();
    expect(formatReel(Buffer.from("GIF89a" + "x".repeat(40)))).toBeUndefined();
    expect(formatReel(JPG.subarray(0, JPG.length - 10))).toBeUndefined(); // JPEG sans sa fin
    expect(formatReel(PNG.subarray(0, PNG.length - 12))).toBeUndefined(); // PNG sans bloc IEND
    expect(formatReel(WEBP.subarray(0, WEBP.length - 8))).toBeUndefined(); // WebP dont la taille ne correspond pas
  });
});

describe("nom donné au fichier enregistré", () => {
  it("est aléatoire, avec l'extension du format réel, et accepté comme adresse de photo", () => {
    const a = nomFichier("jpg");
    expect(a).toMatch(/^[0-9a-f]{32}\.jpg$/);
    expect(nomFichier("jpg")).not.toBe(a);
    expect(photoAcceptee(`/api/fichiers/${a}`)).toBe(true);
    expect(photoAcceptee("/api/fichiers/../../etc/passwd")).toBe(false);
    expect(photoAcceptee("https://exemple.com/photo.jpg")).toBe(false);
  });
});
