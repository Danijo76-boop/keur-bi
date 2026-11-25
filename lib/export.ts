"use client";
import { telecharger } from "./telechargement";
import { genererXlsx } from "./xlsx";

/* ── Exports du site : PDF et Excel uniquement ──
   Tous les rapports et fichiers téléchargés passent par ici, pour avoir partout la même présentation :
   en-tête KEUR GUI, titre, date de génération, tableaux lisibles, numéros de page.
   La bibliothèque PDF (jspdf) n'est chargée qu'au moment du téléchargement : elle n'alourdit pas les pages. */

export type Cellule = string | number;
export type Tableau = { colonnes: string[]; lignes: Cellule[][] };
export type SectionPDF = {
  titre?: string;
  // Paires « libellé : valeur », présentées sur deux colonnes.
  champs?: { label: string; valeur: Cellule }[];
  paragraphes?: string[];
  tableau?: Tableau;
};
export type DocumentPDF = {
  titre: string;
  sousTitre?: string;
  // Bandeau d'avertissement (ex. « Document de démonstration, sans valeur juridique »).
  avertissement?: string;
  sections: SectionPDF[];
  paysage?: boolean;
};

const NAVY: [number, number, number] = [27, 42, 74];
const OR: [number, number, number] = [240, 165, 0];
const GRIS: [number, number, number] = [110, 118, 132];

// Les polices intégrées aux PDF ne connaissent que l'alphabet latin courant : on remplace les quelques signes
// qu'elles ne savent pas dessiner (espaces fines des nombres français, tirets longs, émojis…).
export function textePDF(v: Cellule | null | undefined): string {
  return String(v ?? "")
    .replace(/[\u00a0\u2009\u202f]/g, " ") // espaces insécables et fines (nombres en français)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00ab\s*/g, '"')
    .replace(/\s*\u00bb/g, '"')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u0153/g, "oe")
    .replace(/\u0152/g, "OE")
    .replace(/\u20ac/g, "EUR")
    .replace(/[\u2192\u27f6\u21d2]/g, "->")
    .replace(/[\u2190\u27f5]/g, "<-")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/\u2260/g, "!=")
    .replace(/\u221e/g, "infini")
    .replace(/[\u2705\u2714]/g, "[OK]")
    .replace(/[\u274c\u2716]/g, "[X]")
    .replace(/[\u2190-\u21ff\u2300-\u2bff\u{1f000}-\u{1faff}\ufe0f]/gu, "") // autres flèches, symboles, émojis
    .replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\u00ff]/g, "") // tout ce que la police ne sait pas dessiner
    .replace(/ {2,}/g, " ")
    .trim();
}

const dateFichier = () => new Date().toISOString().slice(0, 10);
export const nomFichier = (base: string, extension: "pdf" | "xlsx") =>
  `${base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")}_${dateFichier()}.${extension}`;

// Logo du site pour l'en-tête des PDF (lu une fois). Sans lui (hors navigateur, réseau coupé), l'en-tête garde le nom seul.
let logoPDF: Promise<string | null> | undefined;
function lireLogo(): Promise<string | null> {
  logoPDF ??= fetch("/logo.png")
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(
      (blob) =>
        new Promise<string>((ok, ko) => {
          const lecteur = new FileReader();
          lecteur.onload = () => ok(String(lecteur.result));
          lecteur.onerror = () => ko(lecteur.error);
          lecteur.readAsDataURL(blob);
        }),
    )
    .catch(() => null);
  return logoPDF;
}

export async function exporterPDF(base: string, d: DocumentPDF): Promise<string> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: d.paysage ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const largeur = doc.internal.pageSize.getWidth();
  const hauteur = doc.internal.pageSize.getHeight();
  const marge = 14;
  const utile = largeur - 2 * marge;

  // En-tête
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, largeur, 22, "F");
  const logo = await lireLogo();
  if (logo) doc.addImage(logo, "PNG", marge, 4, 14, 14);
  const xNom = logo ? marge + 17 : marge;
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(255, 255, 255);
  doc.text("KEUR", xNom, 14);
  doc.setTextColor(...OR);
  doc.text("GUI", xNom + doc.getTextWidth("KEUR"), 14);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(220, 226, 235);
  doc.text(textePDF(`Généré le ${new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}`), largeur - marge, 14, { align: "right" });

  let y = 34;
  doc
    .setFont("helvetica", "bold")
    .setFontSize(17)
    .setTextColor(...NAVY);
  for (const l of doc.splitTextToSize(textePDF(d.titre), utile)) {
    doc.text(l, marge, y);
    y += 7.5;
  }
  if (d.sousTitre) {
    doc
      .setFont("helvetica", "normal")
      .setFontSize(10)
      .setTextColor(...GRIS);
    for (const l of doc.splitTextToSize(textePDF(d.sousTitre), utile)) {
      doc.text(l, marge, y);
      y += 5;
    }
  }
  y += 2;
  if (d.avertissement) {
    doc.setFillColor(253, 243, 220);
    const lignes = doc.splitTextToSize(textePDF(d.avertissement), utile - 8);
    doc.rect(marge, y, utile, lignes.length * 5 + 5, "F");
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(140, 90, 0);
    doc.text(lignes, marge + 4, y + 6);
    y += lignes.length * 5 + 10;
  }

  const placeLibre = (besoin: number) => {
    if (y + besoin > hauteur - 18) {
      doc.addPage();
      y = 20;
    }
  };

  for (const s of d.sections) {
    if (s.titre) {
      placeLibre(14);
      y += 3;
      doc
        .setFont("helvetica", "bold")
        .setFontSize(12)
        .setTextColor(...NAVY);
      doc.text(textePDF(s.titre), marge, y);
      doc
        .setDrawColor(...OR)
        .setLineWidth(0.6)
        .line(marge, y + 2, marge + 18, y + 2);
      y += 8;
    }
    if (s.champs?.length) {
      autoTable(doc, {
        startY: y,
        margin: { left: marge, right: marge },
        body: s.champs.map((c) => [textePDF(c.label), textePDF(c.valeur)]),
        theme: "plain",
        styles: { fontSize: 10, cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 }, textColor: [40, 44, 52] },
        columnStyles: { 0: { cellWidth: 60, textColor: GRIS }, 1: { fontStyle: "bold" } },
        alternateRowStyles: { fillColor: [247, 248, 250] },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }
    for (const p of s.paragraphes ?? []) {
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(40, 44, 52);
      const lignes = doc.splitTextToSize(textePDF(p), utile);
      placeLibre(lignes.length * 5);
      doc.text(lignes, marge, y);
      y += lignes.length * 5 + 3;
    }
    if (s.tableau) {
      autoTable(doc, {
        startY: y,
        margin: { left: marge, right: marge, top: 20 },
        head: [s.tableau.colonnes.map(textePDF)],
        body: s.tableau.lignes.length
          ? s.tableau.lignes.map((l) => l.map(textePDF))
          : [[{ content: "Aucune donnée", colSpan: s.tableau.colonnes.length, styles: { halign: "center", textColor: GRIS } }]],
        styles: { fontSize: 8.5, cellPadding: 2, overflow: "linebreak", textColor: [40, 44, 52] },
        headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [247, 248, 250] },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }
  }

  // Pied de page sur chaque page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc
      .setFont("helvetica", "normal")
      .setFontSize(8)
      .setTextColor(...GRIS);
    doc.text("KEUR GUI - La plateforme immobiliere de confiance au Senegal", marge, hauteur - 8);
    doc.text(`Page ${i} / ${pages}`, largeur - marge, hauteur - 8, { align: "right" });
  }

  const nom = nomFichier(base, "pdf");
  telecharger(nom, doc.output("arraybuffer"), "application/pdf");
  return nom;
}

export function exporterExcel(base: string, tableau: Tableau, feuille = "Rapport"): string {
  // Excel refuse certains caractères dans les noms de feuille, et plus de 31 caractères.
  const fichier = genererXlsx(tableau.colonnes, tableau.lignes, feuille.replace(/[:\\/?*[\]]/g, " ").slice(0, 31));
  const nom = nomFichier(base, "xlsx");
  telecharger(nom, fichier.buffer as ArrayBuffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return nom;
}
