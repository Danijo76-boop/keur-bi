"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "@/components/icones";
import { useAuth } from "@/lib/auth";
import { useBiens } from "@/lib/annonces";
import { lireDossiers, obtenirOuCreerDossier, statutVente } from "@/lib/dossiers";
import { formatPrix } from "@/lib/mock-data";
import { NOTAIRES } from "@/lib/notaires";
import { usePeut } from "@/lib/permissions";
import { useStocke } from "@/lib/stockage";
import { lireUtilisateurs } from "@/lib/utilisateurs";

const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal bg-white";
const lib = "text-sm font-semibold text-gray-700";

// Ouverture d'un dossier par le notaire, pour une vente conclue hors plateforme ou initiée à l'étude.
export default function OuvrirDossier() {
  const router = useRouter();
  const { user } = useAuth();
  const autorise = usePeut(user?.role, "dossier_creer");
  const biens = useBiens();
  const dossiers = useStocke(lireDossiers, []);
  const utilisateurs = useStocke(lireUtilisateurs, []);
  const [ouvert, setOuvert] = useState(false);
  const [bienId, setBienId] = useState("");
  const [acheteur, setAcheteur] = useState("");
  const notaireConnecte = NOTAIRES.find((n) => n.nom === user?.nom);
  const [notaireSlug, setNotaireSlug] = useState("");

  if (!user || !autorise) return null;

  const disponibles = biens.filter((b) => statutVente(b.id, dossiers) === "disponible");
  const acheteurs = utilisateurs.filter((u) => u.role === "acheteur" && !u.suspendu);
  const slug = notaireConnecte?.slug ?? notaireSlug;
  const existant = dossiers.find((d) => d.bienId === bienId && d.acheteurEmail === acheteur);

  function creer(e: React.FormEvent) {
    e.preventDefault();
    const bien = biens.find((b) => b.id === bienId);
    const client = acheteurs.find((u) => u.email === acheteur);
    if (!bien || !client) return;
    const dossier = obtenirOuCreerDossier(bien, client.email, client.nom, slug || undefined);
    router.push(`/dossiers/${dossier.id}`);
  }

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} className="btn-navy text-sm flex items-center gap-2">
        <FolderPlus size={15} /> Ouvrir un dossier
      </button>
    );
  }

  return (
    <form onSubmit={creer} className="card p-5 flex flex-col gap-3 w-full">
      <h3 className="font-bold text-gray-900">Ouvrir un dossier de vente</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <label className={lib}>
          Bien
          <select required value={bienId} onChange={(e) => setBienId(e.target.value)} className={champ}>
            <option value="">Choisir…</option>
            {disponibles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.reference} · {b.titre} · {formatPrix(b.prix)}
              </option>
            ))}
          </select>
        </label>
        <label className={lib}>
          Acheteur
          <select required value={acheteur} onChange={(e) => setAcheteur(e.target.value)} className={champ}>
            <option value="">Choisir…</option>
            {acheteurs.map((u) => (
              <option key={u.email} value={u.email}>
                {u.nom}
                {u.statutKYC !== "verifie" ? " (KYC non vérifié)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className={lib}>
          Notaire instrumentaire
          {notaireConnecte ? (
            <input disabled value={notaireConnecte.nom} className={`${champ} bg-gray-50 text-gray-500`} />
          ) : (
            <select value={notaireSlug} onChange={(e) => setNotaireSlug(e.target.value)} className={champ}>
              <option value="">À désigner plus tard</option>
              {NOTAIRES.map((n) => (
                <option key={n.slug} value={n.slug}>
                  {n.nom}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>
      <p className="text-xs text-gray-500">
        {existant
          ? "Un dossier existe déjà pour ce bien et cet acheteur : il sera rouvert."
          : "Seuls les biens disponibles (sans offre acceptée) sont proposés. Le dossier démarre à l'étape « Brouillon »."}
      </p>
      <div className="flex gap-2">
        <button type="submit" className="btn-navy text-sm">
          {existant ? "Ouvrir le dossier existant" : "Créer le dossier"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
          Annuler
        </button>
      </div>
    </form>
  );
}
