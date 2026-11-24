"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBiens } from "@/lib/annonces";
import { User } from "@/lib/auth";
import { ajouterOffre, lireDossiers, obtenirOuCreerDossier, choisirNotaire, statutVente } from "@/lib/dossiers";
import { formatFCFA } from "@/lib/mock-data";
import { NOTAIRES, notaireSuggere } from "@/lib/notaires";
import { calculerFrais, useParametres } from "@/lib/parametres";
import { usePeut } from "@/lib/permissions";
import { useStocke } from "@/lib/stockage";
import { scoreConfiance, trouverUtilisateur } from "@/lib/utilisateurs";
import { useVerificationTF } from "@/lib/tf";
import Protege from "@/components/Protege";
import TFBadge from "@/components/TFBadge";
import { Bien } from "@/lib/mock-data";

const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy";

function Formulaire({ bien, user }: { bien: Bien; user: User }) {
  const router = useRouter();
  const p = useParametres();
  const { statut } = useVerificationTF(bien);
  const autorise = usePeut(user.role, "offre_soumettre");
  const profil = useStocke(() => trouverUtilisateur(user.email), undefined, [user.email]);
  const transactions = useStocke(() => lireDossiers().filter((d) => d.acheteurEmail === user.email && d.statut === "mute").length, 0, [user.email]);
  const score = scoreConfiance(profil, transactions);
  const vente = useStocke(() => statutVente(bien.id, lireDossiers()), "disponible", [bien.id]);

  const [montant, setMontant] = useState(String(bien.prix));
  const [acompte, setAcompte] = useState("");
  const [financement, setFinancement] = useState("Fonds propres (virement)");
  const [validite, setValidite] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [conditions, setConditions] = useState("");
  const [notaire, setNotaire] = useState(notaireSuggere(bien.region).slug);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    setAcompte((a) => a || String(p.acompteMin));
  }, [p.acompteMin]);

  const prix = Number(montant) || 0;
  const validiteRetenue = validite ?? p.validiteOffre;
  const decote = bien.prix > 0 ? ((bien.prix - prix) / bien.prix) * 100 : 0;
  const frais = calculerFrais(prix, p);

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (prix <= 0) return setErreur("Indiquez un montant valide.");
    if (Number(acompte) < p.acompteMin) return setErreur(`L'acompte minimum est de ${p.acompteMin} %.`);
    const n = NOTAIRES.find((x) => x.slug === notaire)!;
    const dossier = obtenirOuCreerDossier(bien, user.email, user.nom, notaire);
    choisirNotaire(dossier.id, n.slug, n.nom);
    ajouterOffre(dossier.id, {
      auteur: "acheteur",
      montant: prix,
      acompte: `${acompte}%`,
      financement,
      validiteJours: validiteRetenue,
      conditions: conditions || undefined,
      message: message || undefined,
      statut: "en_attente",
    });
    router.push(`/dossiers/${dossier.id}`);
  }

  if (!autorise) {
    return <div className="card p-8 text-center text-gray-500">Votre rôle ne permet pas de soumettre une offre d&apos;achat.</div>;
  }
  if (bien.transaction === "location") {
    return (
      <div className="card p-8 text-center text-gray-500">Ce bien est à louer : contactez l&apos;annonceur ou demandez une visite depuis son annonce.</div>
    );
  }
  if (vente !== "disponible") {
    return (
      <div className="card p-8 text-center text-gray-500">
        Ce bien est {vente === "vendu" ? "vendu" : "sous offre"} : il n&apos;accepte plus de nouvelles offres.
      </div>
    );
  }
  if (statut === "invalide") {
    return (
      <div className="card p-8 text-center text-gray-500">
        Le Titre Foncier de ce bien est invalide : les offres sont suspendues jusqu&apos;à régularisation.
      </div>
    );
  }
  if (score < p.scoreMin) {
    return (
      <div className="card p-8 text-center">
        <h2 className="font-bold text-gray-900 mb-2">Complétez votre profil pour faire une offre</h2>
        <p className="text-sm text-gray-500 mb-4">
          Votre score de confiance est de {score}/100, le minimum requis est de {p.scoreMin}/100. Ajoutez votre téléphone et soumettez votre dossier
          d&apos;identité.
        </p>
        <Link href="/kyc" className="btn-navy inline-block text-sm">
          Vérifier mon identité
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={soumettre} className="lg:col-span-2 card p-6 flex flex-col gap-4">
        <h2 className="font-bold text-gray-900">Votre offre d&apos;achat</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm font-semibold text-gray-700">
            Prix proposé (FCFA) *
            <input type="number" required min={1} value={montant} onChange={(e) => setMontant(e.target.value)} className={`${champ} mt-1 font-normal`} />
            <span className={`text-xs font-normal ${decote > p.decoteMax ? "text-red" : "text-gray-400"}`}>
              Prix affiché : {formatFCFA(bien.prix)} ({decote > 0 ? `-${decote.toFixed(1)}%` : "au prix"})
              {decote > p.decoteMax && " · décote élevée, le vendeur sera averti"}
            </span>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Acompte proposé (%)
            <input
              type="number"
              min={p.acompteMin}
              max={100}
              value={acompte}
              onChange={(e) => setAcompte(e.target.value)}
              className={`${champ} mt-1 font-normal`}
            />
            <span className="text-xs font-normal text-gray-400">Minimum {p.acompteMin} %, recommandé 10–30 %</span>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Mode de financement
            <select value={financement} onChange={(e) => setFinancement(e.target.value)} className={`${champ} mt-1 font-normal`}>
              <option>Fonds propres (virement)</option>
              <option>Crédit bancaire (pré-accord)</option>
            </select>
          </label>
          <div className="text-sm font-semibold text-gray-700">
            Validité de l&apos;offre
            <div className="flex gap-2 mt-1">
              {[7, 15, 30].map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setValidite(j)}
                  className={`flex-1 text-sm font-medium px-2 py-2 rounded-lg border ${validiteRetenue === j ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200"}`}
                >
                  {j} jours
                </button>
              ))}
            </div>
          </div>
        </div>
        <label className="text-sm font-semibold text-gray-700">
          Message au vendeur
          <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={`${champ} mt-1 font-normal resize-none`} />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Conditions suspensives (optionnel)
          <input
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="ex : obtention crédit, résultat expertise…"
            className={`${champ} mt-1 font-normal`}
          />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Notaire pour la transaction
          <select value={notaire} onChange={(e) => setNotaire(e.target.value)} className={`${champ} mt-1 font-normal`}>
            {NOTAIRES.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.nom} · {n.ville}
                {n.nbAvis > 0 ? ` · ⭐ ${n.note.toLocaleString("fr-FR")}` : ""}
              </option>
            ))}
          </select>
        </label>
        {erreur && <p className="text-red text-xs">{erreur}</p>}
        <div className="flex justify-between gap-3 flex-wrap">
          <Link href={`/annonces/${bien.id}`} className="border border-gray-200 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-50">
            Annuler
          </Link>
          <button type="submit" className="btn-primary text-sm">
            Soumettre l&apos;offre au vendeur →
          </button>
        </div>
      </form>

      <aside className="flex flex-col gap-4">
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-1">{bien.titre}</h3>
          <p className="text-xs text-gray-400 mb-2">
            TF {bien.tf.numero ?? "en attente"} · {bien.ville} · {bien.superficie} m²
          </p>
          <div className="flex mb-3">
            <TFBadge bien={bien} />
          </div>
          <dl className="text-sm flex flex-col gap-2">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Prix affiché</dt>
              <dd className="font-semibold text-right">{formatFCFA(bien.prix)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Votre offre</dt>
              <dd className="font-semibold text-right">{formatFCFA(prix)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Frais estimés</dt>
              <dd className="font-semibold text-right">{formatFCFA(frais.totalFrais)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-gray-100 pt-2">
              <dt className="font-bold text-navy">Total acquisition</dt>
              <dd className="font-bold text-navy text-right">{formatFCFA(frais.totalAcquisition)}</dd>
            </div>
          </dl>
        </div>
        <div className="card p-5 text-sm text-gray-600">
          <h3 className="font-bold text-gray-900 mb-1">Comment ça marche</h3>
          Votre offre est transmise au vendeur. Il dispose de la durée de validité pour accepter, refuser ou contre-proposer. En cas d&apos;accord, le notaire
          choisi rédige la promesse de vente.
        </div>
      </aside>
    </div>
  );
}

export default function OffrePage() {
  const { id } = useParams<{ id: string }>();
  const biens = useBiens();
  const bien = biens.find((b) => b.id === id);

  return (
    <Protege>
      {(user) => (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-navy mb-6">Faire une offre</h1>
          {bien ? <Formulaire bien={bien} user={user} /> : <div className="card p-8 text-center text-gray-400">Annonce introuvable.</div>}
        </div>
      )}
    </Protege>
  );
}
