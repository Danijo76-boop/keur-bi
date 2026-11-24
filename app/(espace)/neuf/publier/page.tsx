"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { AVANCEMENTS, type Programme } from "@/lib/programmes";
import { envoyerPhoto, envoyerPhotosVerifiees, reduirePhoto } from "@/lib/photos";
import { avecReference } from "@/lib/rapport-erreurs";
import { popup } from "@/lib/popup";
import { IconeStatut } from "@/components/Statut";

const REGIONS = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack"];
const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal bg-white";
const libelle = "text-sm font-semibold text-gray-700";

type Lot = { type: string; libelle: string; superficie: string; nbPieces: string; prix: string; disponible: boolean };
const lotVide = (): Lot => ({ type: "appartement", libelle: "", superficie: "", nbPieces: "", prix: "", disponible: true });

// Publication d'un programme neuf, réservée aux agences et promoteurs (le serveur le vérifie aussi).
export default function PublierProgrammePage() {
  const { user } = useAuth();
  const [nom, setNom] = useState("");
  const [promoteur, setPromoteur] = useState("");
  const [region, setRegion] = useState("Dakar");
  const [ville, setVille] = useState("");
  const [quartier, setQuartier] = useState("");
  const [livraison, setLivraison] = useState("");
  const [avancement, setAvancement] = useState(AVANCEMENTS[0]);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [verification, setVerification] = useState(false);
  const [lots, setLots] = useState<Lot[]>([lotVide()]);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [publie, setPublie] = useState<Programme>();

  if (user && user.role !== "agence" && user.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="titre-page mb-2">Publier un programme neuf</h1>
        <p className="text-gray-500 text-sm">La publication de programmes neufs est réservée aux comptes Agence (promoteurs).</p>
      </div>
    );
  }

  if (publie) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="card p-8 text-center">
          <p className="text-green font-semibold text-lg mb-1">
            <IconeStatut type="ok" />
            Programme publié
          </p>
          <p className="text-sm text-gray-500 mb-5">
            {publie.nom} · {publie.lots.length} lot(s). Il est visible dans la rubrique Programmes neufs.
          </p>
          <Link href={`/neuf/${publie.slug}`} className="btn-navy text-sm">
            Voir le programme
          </Link>
        </div>
      </div>
    );
  }

  const majLot = (i: number, patch: Partial<Lot>) => setLots((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function ajouterPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!fichiers.length) return;
    setErreur("");
    setVerification(true);
    try {
      const nouvelles = await Promise.all(fichiers.slice(0, 8 - photos.length).map((f) => reduirePhoto(f)));
      // Chaque photo est vérifiée par le serveur (contenu choquant, données personnelles) dès son ajout.
      const { adresses, message } = await envoyerPhotosVerifiees(nouvelles);
      setPhotos((p) => [...p, ...adresses].slice(0, 8));
      setErreur(message);
    } catch {
      setErreur("Une image n'a pas pu être lue.");
    } finally {
      setVerification(false);
    }
  }

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    if (envoi) return;
    if (!nom.trim() || !ville.trim() || !quartier.trim() || !livraison.trim() || description.trim().length < 20)
      return setErreur("Merci de remplir les champs obligatoires (*). La description doit faire au moins 20 caractères.");
    if (photos.length === 0) return setErreur("Ajoutez au moins une photo.");
    if (lots.some((l) => !l.libelle.trim() || !(Number(l.superficie) > 0) || !(Number(l.prix) > 0)))
      return setErreur("Chaque lot doit avoir un libellé, une superficie et un prix.");
    setErreur("");
    setEnvoi(true);
    try {
      const adresses = [];
      for (const p of photos) adresses.push(p.startsWith("data:") ? await envoyerPhoto(p) : p);
      const r = await fetch("/api/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          promoteur: promoteur.trim(),
          region,
          ville: ville.trim(),
          quartier: quartier.trim(),
          livraison: livraison.trim(),
          avancement,
          description: description.trim(),
          photos: adresses,
          lots: lots.map((l) => ({
            type: l.type,
            libelle: l.libelle.trim(),
            superficie: Number(l.superficie),
            nbPieces: Number(l.nbPieces) || undefined,
            prix: Number(l.prix),
            disponible: l.disponible,
          })),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(avecReference(d.erreur ?? "La publication n'a pas abouti.", r));
      popup.succes("Programme publié", nom.trim());
      setPublie(d.programme);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "La publication n'a pas abouti.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="titre-page mb-1">Publier un programme neuf</h1>
      <p className="text-gray-500 text-sm mb-6">Présentez votre programme et la liste de ses lots avec leurs prix.</p>

      <form onSubmit={publier} className="card p-6 flex flex-col gap-4">
        <h2 className="font-bold text-gray-900">Le programme</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className={libelle}>
            Nom du programme *<input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Résidence Les Filaos" className={champ} />
          </label>
          <label className={libelle}>
            Promoteur
            <input value={promoteur} onChange={(e) => setPromoteur(e.target.value)} placeholder={user?.nom} className={champ} />
          </label>
          <label className={libelle}>
            Région *
            <select value={region} onChange={(e) => setRegion(e.target.value)} className={champ}>
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className={libelle}>
            Ville *<input value={ville} onChange={(e) => setVille(e.target.value)} className={champ} />
          </label>
          <label className={libelle}>
            Quartier *<input value={quartier} onChange={(e) => setQuartier(e.target.value)} className={champ} />
          </label>
          <label className={libelle}>
            Livraison prévue *<input value={livraison} onChange={(e) => setLivraison(e.target.value)} placeholder="ex. 2e trimestre 2027" className={champ} />
          </label>
          <label className={libelle}>
            Avancement des travaux
            <select value={avancement} onChange={(e) => setAvancement(e.target.value)} className={champ}>
              {AVANCEMENTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>
        <label className={libelle}>
          Description *<textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${champ} resize-none`} />
        </label>

        <div>
          <span className={libelle}>Photos * (8 au maximum, la première sert de couverture)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            aria-label="Ajouter des photos"
            onChange={ajouterPhotos}
            disabled={verification || photos.length >= 8}
            className="text-sm block mt-2"
          />
          {verification && (
            <p className="text-sm text-gray-500 mt-1" role="status">
              Vérification des photos en cours…
            </p>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {photos.map((src, i) => (
                <div key={i} className="relative h-20 rounded-lg overflow-hidden">
                  <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    aria-label={`Retirer la photo ${i + 1}`}
                    onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 bg-white/90 rounded-full w-6 h-6 text-xs font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <h2 className="font-bold text-gray-900 mt-2">Les lots</h2>
        {lots.map((l, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 grid sm:grid-cols-6 gap-3 items-end">
            <label className={`${libelle} sm:col-span-2`}>
              Libellé *<input value={l.libelle} onChange={(e) => majLot(i, { libelle: e.target.value })} placeholder="ex. F3 — 2e étage" className={champ} />
            </label>
            <label className={libelle}>
              Type
              <select value={l.type} onChange={(e) => majLot(i, { type: e.target.value })} className={champ}>
                <option value="appartement">Appartement</option>
                <option value="villa">Villa</option>
                <option value="bureau">Bureau</option>
                <option value="terrain">Terrain</option>
              </select>
            </label>
            <label className={libelle}>
              m² *<input type="number" min={1} value={l.superficie} onChange={(e) => majLot(i, { superficie: e.target.value })} className={champ} />
            </label>
            <label className={libelle}>
              Prix (FCFA) *<input type="number" min={1} value={l.prix} onChange={(e) => majLot(i, { prix: e.target.value })} className={champ} />
            </label>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" className="accent-navy" checked={l.disponible} onChange={(e) => majLot(i, { disponible: e.target.checked })} /> Dispo
              </label>
              {lots.length > 1 && (
                <button type="button" onClick={() => setLots(lots.filter((_, j) => j !== i))} className="text-xs text-red hover:underline">
                  Retirer
                </button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setLots([...lots, lotVide()])} className="text-sm text-blue font-medium hover:underline self-start">
          + Ajouter un lot
        </button>

        {erreur && (
          <p role="alert" className="text-red text-xs">
            {erreur}
          </p>
        )}
        <button type="submit" disabled={envoi} className="btn-primary text-sm self-end disabled:opacity-60">
          {envoi ? "Publication…" : "Publier le programme"}
        </button>
      </form>
    </div>
  );
}
