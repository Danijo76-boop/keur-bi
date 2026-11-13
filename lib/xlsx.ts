// Générateur .xlsx minimal (une feuille, sans compression) : évite une dépendance lourde pour un simple export.
const encodeur = new TextEncoder();

const TABLE_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const octet of data) c = TABLE_CRC[(c ^ octet) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function octets(valeurs: [number, 2 | 4][]): number[] {
  return valeurs.flatMap(([v, taille]) => Array.from({ length: taille }, (_, i) => (v >>> (8 * i)) & 0xff));
}

function zipStocke(fichiers: { nom: string; contenu: string }[]): Uint8Array {
  const locaux: number[] = [];
  const central: number[] = [];
  for (const f of fichiers) {
    const nom = encodeur.encode(f.nom);
    const data = encodeur.encode(f.contenu);
    const crc = crc32(data);
    const commun: [number, 2 | 4][] = [[20, 2], [0x0800, 2], [0, 2], [0, 2], [0x21, 2], [crc, 4], [data.length, 4], [data.length, 4], [nom.length, 2], [0, 2]];
    const decalage = locaux.length;
    locaux.push(...octets([[0x04034b50, 4], ...commun]), ...nom, ...data);
    central.push(...octets([[0x02014b50, 4], [20, 2], ...commun, [0, 2], [0, 2], [0, 2], [0, 4], [decalage, 4]]), ...nom);
  }
  const fin = octets([[0x06054b50, 4], [0, 2], [0, 2], [fichiers.length, 2], [fichiers.length, 2], [central.length, 4], [locaux.length, 4], [0, 2]]);
  return Uint8Array.from([...locaux, ...central, ...fin]);
}

function xml(s: string): string {
  return s
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colonne(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

// Le texte reste en inlineStr : une valeur saisie par un utilisateur ne peut pas devenir une formule.
function cellule(v: string | number, c: number, l: number): string {
  const ref = `${colonne(c)}${l}`;
  if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
}

export function genererXlsx(entetes: string[], lignes: (string | number)[][], feuille = "Rapport"): Uint8Array {
  const toutes = [entetes, ...lignes];
  const lignesXml = toutes.map((l, i) => `<row r="${i + 1}">${l.map((v, c) => cellule(v, c, i + 1)).join("")}</row>`).join("");
  const entete = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zipStocke([
    {
      nom: "[Content_Types].xml",
      contenu: `${entete}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      nom: "_rels/.rels",
      contenu: `${entete}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      nom: "xl/workbook.xml",
      contenu: `${entete}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(feuille)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      nom: "xl/_rels/workbook.xml.rels",
      contenu: `${entete}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      nom: "xl/worksheets/sheet1.xml",
      contenu: `${entete}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${lignesXml}</sheetData></worksheet>`,
    },
  ]);
}
