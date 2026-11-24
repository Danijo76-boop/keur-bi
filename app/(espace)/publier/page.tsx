"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Circle } from "lucide-react";
import { User, estCoteVendeur } from "@/lib/auth";
import { Bien, formatFCFA } from "@/lib/mock-data";
import { publierAnnonce, tousLesBiens } from "@/lib/annonces";
import { useParametres } from "@/lib/parametres";
import { usePeut } from "@/lib/permissions";
import { useStocke } from "@/lib/stockage";
import { soumettreDemandeTF } from "@/lib/tf";
import { envoyerPhotosVerifiees } from "@/lib/photos";
import { QUOTA_ANNONCES, QUOTA_PARTICULIER, trouverUtilisateur } from "@/lib/utilisateurs";
import BandeauDemo from "@/components/BandeauDemo";
import PositionMarche from "@/components/PositionMarche";
import Protege from "@/components/Protege";
import { IconeStatut } from "@/components/Statut";

const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal";
const libelle = "text-sm font-semibold text-gray-700";
const ETAPES = ["Informations", "Titre Foncier", "Photos & documents", "Vérification & publication"];
const REGIONS = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack"];
const CONSERVATIONS = ["Dakar-Plateau", "Pikine", "Rufisque", "Thiès", "Thiès-Mbour", "Saint-Louis", "Ziguinchor", "Kaolack"];
const PHOTOS_DEFAUT: Record<string, string> = {
  terrain: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80",
  villa: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80",
  appartement: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
  bureau: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
};
const MIN_PHOTOS = 3;
const TAILLE_MAX_PHOTO = 1_500_000;

function lireFichier(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

// Redimensionne avant l'envoi : des photos légères se chargent vite et restent sous la limite du serveur.
async function reduirePhoto(f: File): Promise<string> {
  const source = await lireFichier(f);
  const img = document.createElement("img");
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = source;
  });
  const echelle = Math.min(1, 800 / img.width);
  const c = document.createElement("canvas");
  c.width = img.width * echelle;
  c.height = img.height * echelle;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

function Assistant({ user }: { user: User }) {
  const autorise = usePeut(user.role, "annonce_publier");
  const p = useParametres();
  const profil = useStocke(() => trouverUtilisateur(user.email), undefined, [user.email]);

  // Le quota porte sur les annonces en ligne ; le serveur le revérifie à la publication.
  const nbPubliees = useStocke(() => tousLesBiens(true).filter((b) => b.auteurEmail === user.email && !b.depublie).length, 0, [user.email]);
  const plan = profil?.plan ?? "gratuit";
  // Particulier : quota fixe. Agence : selon son abonnement. Agent : pas de limite propre, c'est l'agence qui paie.
  const quota = user.role === "vendeur" ? QUOTA_PARTICULIER : user.role === "agent" ? Infinity : (QUOTA_ANNONCES[plan] ?? 1);

  const [etape, setEtape] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [transaction, setTransaction] = useState<"vente" | "location">("vente");
  const [charges, setCharges] = useState("");
  const [caution, setCaution] = useState("");
  const [nbPieces, setNbPieces] = useState("");
  const [meuble, setMeuble] = useState(false);
  // Lien « Publier une location » : le formulaire s'ouvre directement sur la location.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("transaction") === "location") setTransaction("location");
  }, []);
  const [titre, setTitre] = useState("");
  const [type, setType] = useState<Bien["type"]>("terrain");
  const [region, setRegion] = useState("Dakar");
  const [ville, setVille] = useState("");
  const [quartier, setQuartier] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [prix, setPrix] = useState("");
  const [description, setDescription] = useState("");
  const [telephone, setTelephone] = useState("");
  const [numeroTF, setNumeroTF] = useState("");
  const [conservation, setConservation] = useState(CONSERVATIONS[0]);
  const [dateTF, setDateTF] = useState("");
  const [proprietaire, setProprietaire] = useState("");
  const [superficieTF, setSuperficieTF] = useState("");
  const [fichierTF, setFichierTF] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [verification, setVerification] = useState(false);
  const [prioritaire, setPrioritaire] = useState(false);
  const [erreur, setErreur] = useState("");
  const [publiee, setPubliee] = useState<Bien | null>(null);

  const etape1 = titre.trim() && ville.trim() && quartier.trim() && Number(superficie) > 0 && Number(prix) > 0 && description.trim();
  // Le Titre Foncier est exigé pour vendre ; pour une location il reste facultatif.
  const etape2 = transaction === "location" || (numeroTF.trim() && proprietaire.trim() && Number(superficieTF) > 0 && fichierTF);
  const etape3 = photos.length >= MIN_PHOTOS;
  const validite = [etape1, etape2, etape3];

  function suivant() {
    if (!validite[etape]) {
      setErreur(etape === 2 ? `Ajoutez au moins ${MIN_PHOTOS} photos.` : "Merci de remplir les champs obligatoires (*).");
      return;
    }
    setErreur("");
    setEtape(etape + 1);
  }

  async function ajouterPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!fichiers.length) return;
    setErreur("");
    setVerification(true);
    try {
      const nouvelles = await Promise.all(fichiers.slice(0, 8 - photos.length).map(reduirePhoto));
      const retenues = nouvelles.filter((n) => n.length < TAILLE_MAX_PHOTO);
      // Chaque photo est vérifiée par le serveur (contenu choquant, données personnelles) dès son ajout.
      const { adresses, message } = await envoyerPhotosVerifiees(retenues);
      setPhotos((a) => [...a, ...adresses].slice(0, 8));
      setErreur([retenues.length < nouvelles.length ? "Certaines photos sont trop lourdes et ont été ignorées." : "", message].filter(Boolean).join(" "));
    } catch {
      setErreur("Une image n'a pas pu être lue.");
    } finally {
      setVerification(false);
    }
  }

  async function publier() {
    if (envoi) return;
    setErreur("");
    setEnvoi(true);
    try {
      const annonce = await publierAnnonce({
        titre: titre.trim(),
        type,
        superficie: Number(superficie),
        prix: Number(prix),
        region,
        ville: ville.trim(),
        quartier: quartier.trim(),
        description: description.trim(),
        agence: user.nom,
        telephone: telephone.trim() || profil?.telephone || "",
        photos,
        transaction,
        ...(transaction === "location" && { charges: Number(charges) || 0, caution: Number(caution) || 0, meuble }),
        nb_pieces: Number(nbPieces) || undefined,
        proprietaire: proprietaire.trim(),
        tf: {
          numero: numeroTF.trim(),
          conservation: numeroTF.trim() ? conservation : null,
          date_etablissement: dateTF || null,
          superficie_cadastrale: Number(superficieTF),
        },
      });
      // Module cadastre en pause : l'annonce est publiée avec son titre déclaré, sans demande de vérification.
      if (p.flags.cadastre && transaction === "vente")
        soumettreDemandeTF({
          bienId: annonce.id,
          numero: numeroTF.trim(),
          region,
          proprietaire: proprietaire.trim(),
          fichier: fichierTF,
          prioritaire,
          demandeur: user.nom,
        });
      setPubliee(annonce);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La publication n'a pas abouti.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!autorise) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="titre-page mb-2">Publier une annonce</h1>
        <p className="text-gray-500 text-sm">La publication est réservée aux vendeurs : particulier, agence ou agent.</p>
      </div>
    );
  }

  if (!publiee && estCoteVendeur(user.role) && nbPubliees >= quota) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="titre-page mb-2">Quota d&apos;annonces atteint</h1>
        <p className="text-gray-500 text-sm mb-4">
          {user.role === "vendeur"
            ? `Un compte particulier permet ${quota} annonces actives. Pour en publier davantage, passez à un compte Agence.`
            : `Votre plan permet ${quota} annonce${quota > 1 ? "s" : ""} active${quota > 1 ? "s" : ""}. Passez à un plan supérieur pour en publier davantage.`}
        </p>
        <Link href="/tarifs" className="btn-navy text-sm inline-block">
          Voir les abonnements
        </Link>
      </div>
    );
  }

  if (publiee) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="card p-8 text-center">
          <p className="text-green font-semibold text-lg mb-1">
            <IconeStatut type="ok" />
            Annonce enregistrée
          </p>
          <p className="text-sm text-gray-500 mb-5">
            Référence {publiee.reference}.{" "}
            {p.flags.cadastre ? "Elle affiche le badge « En vérification » jusqu'à la décision du notaire." : "Elle est en ligne et visible des membres."}
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Link href={`/mes-annonces/${publiee.id}`} className="btn-navy text-sm">
              Gérer l&apos;annonce
            </Link>
            <Link href={`/annonces/${publiee.id}`} className="border border-gray-200 rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-gray-50">
              Voir l&apos;annonce
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const prixNombre = Number(prix) || 0;
  const surface = Number(superficie) || 0;
  const checklist = [
    { label: "Informations du bien", ok: !!etape1 },
    { label: "Titre Foncier", ok: !!etape2 },
    { label: `Photos (min. ${MIN_PHOTOS})`, ok: etape3 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="titre-page mb-4">Publier une annonce</h1>
      <ol className="flex gap-2 flex-wrap mb-6">
        {ETAPES.map((e, i) => (
          <li
            key={e}
            aria-current={i === etape ? "step" : undefined}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${i < etape ? "bg-green/10 text-green" : i === etape ? "bg-navy text-white" : "bg-gray-100 text-gray-400"}`}
          >
            {i + 1} · {e}
          </li>
        ))}
      </ol>

      {profil?.statutKYC === "non_soumis" && (
        <BandeauDemo>
          Pièces normalement exigées d&apos;un vendeur : {p.docsVendeur}.{" "}
          <Link href="/kyc" className="underline font-semibold">
            Vérifier mon identité
          </Link>
        </BandeauDemo>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 flex flex-col gap-4">
          {etape === 0 && (
            <>
              <h2 className="font-bold text-gray-900">Informations du bien</h2>
              <label className={libelle}>
                Type d&apos;annonce *
                <select value={transaction} onChange={(e) => setTransaction(e.target.value as "vente" | "location")} className={champ}>
                  <option value="vente">À vendre</option>
                  <option value="location">À louer</option>
                </select>
              </label>
              <label className={libelle}>
                Titre *<input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="ex. Terrain résidentiel — Almadies" className={champ} />
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className={libelle}>
                  Type de bien *
                  <select value={type} onChange={(e) => setType(e.target.value as Bien["type"])} className={champ}>
                    <option value="terrain">Terrain</option>
                    <option value="villa">Villa</option>
                    <option value="appartement">Appartement</option>
                    <option value="bureau">Bureau</option>
                  </select>
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
                  Superficie (m²) *<input type="number" min={1} value={superficie} onChange={(e) => setSuperficie(e.target.value)} className={champ} />
                </label>
                <label className={libelle}>
                  {transaction === "location" ? "Loyer mensuel (FCFA) *" : "Prix (FCFA) *"}
                  <input type="number" min={1} value={prix} onChange={(e) => setPrix(e.target.value)} className={champ} />
                </label>
                <label className={libelle}>
                  Nombre de pièces
                  <input type="number" min={1} max={50} value={nbPieces} onChange={(e) => setNbPieces(e.target.value)} className={champ} />
                </label>
                {transaction === "location" && (
                  <>
                    <label className={libelle}>
                      Charges mensuelles (FCFA)
                      <input type="number" min={0} value={charges} onChange={(e) => setCharges(e.target.value)} className={champ} />
                    </label>
                    <label className={libelle}>
                      Caution (FCFA)
                      <input type="number" min={0} value={caution} onChange={(e) => setCaution(e.target.value)} className={champ} />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer sm:col-span-2">
                      <input type="checkbox" className="accent-navy" checked={meuble} onChange={(e) => setMeuble(e.target.checked)} /> Logement meublé
                    </label>
                  </>
                )}
              </div>
              <PositionMarche bien={{ type, region, prix: Number(prix) || 0, superficie: Number(superficie) || 0, transaction }} />
              <label className={libelle}>
                Téléphone de contact
                <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} className={champ} />
              </label>
              <label className={libelle}>
                Description *<textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${champ} resize-none`} />
              </label>
            </>
          )}

          {etape === 1 && (
            <>
              <div>
                <h2 className="font-bold text-gray-900">Titre Foncier{transaction === "location" ? " (facultatif pour une location)" : ""}</h2>
                <p className="text-sm text-gray-500">Un notaire partenaire vérifiera votre TF avant validation.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className={libelle}>
                  Numéro TF *<input value={numeroTF} onChange={(e) => setNumeroTF(e.target.value)} placeholder="ex. 12 847" className={champ} />
                </label>
                <label className={libelle}>
                  Conservation foncière *
                  <select value={conservation} onChange={(e) => setConservation(e.target.value)} className={champ}>
                    {CONSERVATIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className={libelle}>
                  Date d&apos;établissement
                  <input type="date" value={dateTF} onChange={(e) => setDateTF(e.target.value)} className={champ} />
                </label>
                <label className={libelle}>
                  Superficie cadastrale (m²) *
                  <input type="number" min={1} value={superficieTF} onChange={(e) => setSuperficieTF(e.target.value)} className={champ} />
                </label>
              </div>
              <label className={libelle}>
                Propriétaire actuel (nom sur le TF) *<input value={proprietaire} onChange={(e) => setProprietaire(e.target.value)} className={champ} />
              </label>
              <label className={libelle}>
                Copie du Titre Foncier * (PDF, JPG ou PNG)
                <input type="file" accept=".pdf,image/*" onChange={(e) => setFichierTF(e.target.files?.[0]?.name ?? "")} className={champ} />
                {fichierTF && <span className="text-xs font-normal text-green">✓ {fichierTF}</span>}
              </label>
            </>
          )}

          {etape === 2 && (
            <>
              <div>
                <h2 className="font-bold text-gray-900">Photos</h2>
                <p className="text-sm text-gray-500">Au moins {MIN_PHOTOS} photos, la première sert de couverture.</p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                aria-label="Ajouter des photos"
                onChange={ajouterPhotos}
                disabled={verification || photos.length >= 8}
                className="text-sm"
              />
              {verification && (
                <p className="text-sm text-gray-500" role="status">
                  Vérification des photos en cours…
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((src, i) => (
                  <div key={i} className="relative h-24 rounded-lg overflow-hidden bg-gray-100">
                    <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" unoptimized />
                    <button
                      type="button"
                      aria-label={`Retirer la photo ${i + 1}`}
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPhotos([PHOTOS_DEFAUT[type], PHOTOS_DEFAUT[type], PHOTOS_DEFAUT[type]])}
                className="text-sm text-blue font-medium hover:underline self-start"
              >
                Utiliser des photos d&apos;exemple (démo)
              </button>
            </>
          )}

          {etape === 3 && (
            <>
              <h2 className="font-bold text-gray-900">Vérification & publication</h2>
              <dl className="text-sm grid sm:grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-gray-400">Bien</dt>
                  <dd className="font-semibold">{titre}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Zone</dt>
                  <dd className="font-semibold">
                    {quartier}, {ville}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Surface</dt>
                  <dd className="font-semibold">{surface.toLocaleString("fr-FR")} m²</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">{transaction === "location" ? "Loyer" : "Prix"}</dt>
                  <dd className="font-semibold">
                    {formatFCFA(prixNombre)}
                    {transaction === "location" ? " / mois" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">TF</dt>
                  <dd className="font-semibold">
                    {numeroTF} · {conservation}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Photos</dt>
                  <dd className="font-semibold">{photos.length}</dd>
                </div>
              </dl>
              {p.flags.cadastre && p.flags.tfPrioritaire && (
                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 rounded-lg p-3">
                  <input type="checkbox" className="accent-navy mt-0.5" checked={prioritaire} onChange={(e) => setPrioritaire(e.target.checked)} />
                  Vérification prioritaire (+{formatFCFA(p.prixTFPrioritaire)}, facturation non active dans la démo)
                </label>
              )}
              <p className="text-sm text-gray-500">Votre annonce apparaîtra avec le badge « En vérification » jusqu&apos;à la décision du notaire.</p>
            </>
          )}

          {erreur && <p className="text-red text-xs">{erreur}</p>}
          <div className="flex justify-between gap-3 flex-wrap">
            <button
              type="button"
              disabled={etape === 0}
              onClick={() => {
                setErreur("");
                setEtape(etape - 1);
              }}
              className="border border-gray-200 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              ← Étape précédente
            </button>
            {etape < ETAPES.length - 1 ? (
              <button type="button" onClick={suivant} className="btn-navy text-sm">
                Étape suivante →
              </button>
            ) : (
              <button type="button" onClick={publier} className="btn-primary text-sm">
                Publier l&apos;annonce
              </button>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card">
            <div className="relative h-36 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              {photos[0] ? (
                <Image src={photos[0]} alt="Aperçu" fill className="object-cover" unoptimized={!photos[0].startsWith("http")} />
              ) : (
                "Photos à ajouter"
              )}
              <span className="absolute top-2 left-2 bg-gold text-navy-dark text-xs font-semibold px-2 py-0.5 rounded-full">En vérification</span>
            </div>
            <div className="p-4">
              <div className="font-semibold text-sm text-gray-900">{titre || "Titre de l'annonce"}</div>
              <div className="text-xs text-gray-400 mb-2">
                {quartier || "Quartier"}, {ville || "Ville"} · {surface.toLocaleString("fr-FR")} m²
              </div>
              <div className="font-bold text-navy">{formatFCFA(prixNombre)}</div>
              {surface > 0 && prixNombre > 0 && <div className="text-xs text-gray-400">{formatFCFA(prixNombre / surface)} / m²</div>}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3">Checklist de publication</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {checklist.map((c) => (
                <li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-green" : "text-gray-500"}`}>
                  {c.ok ? <CheckCircle size={15} /> : <Circle size={15} />} {c.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5 text-sm text-gray-600">
            <h3 className="font-bold text-gray-900 mb-1">Besoin d&apos;aide ?</h3>
            Notre équipe vous accompagne pour préparer votre dossier de vente.{" "}
            <Link href="/contact" className="text-blue hover:underline">
              Contacter le support
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function PublierPage() {
  return <Protege>{(user) => <Assistant user={user} />}</Protege>;
}
