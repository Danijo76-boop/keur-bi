"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { avisDuDossier, Avis, publierAvis } from "@/lib/moderation";
import { useStocke } from "@/lib/stockage";

function Formulaire({ cible, slug, nomCible, dossierId, auteurEmail, nomComplet }: { cible: Avis["cible"]; slug: string; nomCible: string; dossierId: string; auteurEmail: string; nomComplet: string }) {
  const existant = useStocke(() => avisDuDossier(dossierId, cible), undefined, [dossierId, cible]);
  const [note, setNote] = useState(5);
  const [texte, setTexte] = useState("");

  if (existant) return <p className="text-sm text-green font-semibold">✓ Votre avis sur {nomCible} est publié ({existant.note}/5).</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        publierAvis({ cible, slug, dossierId, auteurEmail, nomComplet, note, texte: texte.trim() });
      }}
      className="flex flex-col gap-2"
    >
      <div className="font-semibold text-sm text-gray-800">{nomCible}</div>
      <div className="flex gap-1" role="radiogroup" aria-label={`Note pour ${nomCible}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={note === n} aria-label={`${n} sur 5`} onClick={() => setNote(n)}>
            <Star size={20} className={n <= note ? "text-gold fill-gold" : "text-gray-300"} />
          </button>
        ))}
      </div>
      <textarea
        required
        rows={2}
        aria-label={`Votre avis sur ${nomCible}`}
        placeholder="Votre expérience…"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy resize-none"
      />
      <button type="submit" className="btn-navy text-sm self-start">Publier mon avis</button>
    </form>
  );
}

export default function LaisserAvis({ dossierId, auteurEmail, nomComplet, notaire, agence }: {
  dossierId: string;
  auteurEmail: string;
  nomComplet: string;
  notaire?: { slug: string; nom: string };
  agence?: { slug: string; nom: string };
}) {
  if (!notaire && !agence) return null;
  return (
    <div className="card p-5">
      <h2 className="font-bold text-gray-900 mb-1">Donnez votre avis</h2>
      <p className="text-xs text-gray-400 mb-3">Seuls les clients ayant signé un acte peuvent noter : les avis restent ainsi vérifiés.</p>
      <div className="flex flex-col gap-5">
        {notaire && <Formulaire cible="notaire" slug={notaire.slug} nomCible={notaire.nom} dossierId={dossierId} auteurEmail={auteurEmail} nomComplet={nomComplet} />}
        {agence && <Formulaire cible="agence" slug={agence.slug} nomCible={agence.nom} dossierId={dossierId} auteurEmail={auteurEmail} nomComplet={nomComplet} />}
      </div>
    </div>
  );
}
