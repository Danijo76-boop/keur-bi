export function telecharger(nom: string, contenu: BlobPart, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}
