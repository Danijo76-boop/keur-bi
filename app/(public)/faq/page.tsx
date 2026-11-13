"use client";
import Link from "next/link";
import { useParametres } from "@/lib/parametres";

const SECTIONS = [
  {
    titre: "Titre Foncier",
    questions: [
      { q: "Que signifient les badges TF ?", r: "Vérifié : titre authentifié, sans litige ni hypothèque. En vérification : dossier soumis, réponse sous 3 à 7 jours ouvrés. Non vérifié : document non encore soumis. Invalide : anomalie détectée (hypothèque, litige ou non-concordance du propriétaire)." },
      { q: "Un terrain sans TF est-il achetable ?", r: "C'est déconseillé : un terrain sans Titre Foncier expose à de sérieux risques juridiques. Faites-vous conseiller par un notaire avant toute offre." },
      { cadastre: true, q: "La vérification TF accélérée est-elle garantie en 24h ?", r: "Le dossier est transmis en priorité dès réception du paiement, mais le délai dépend aussi des services de la DGID. Au-delà de 48h ouvrées, le service est remboursé." },
    ],
  },
  {
    titre: "Acheter",
    questions: [
      { q: "Combien coûte KEUR BI pour un acheteur ?", r: "Consulter les annonces et soumettre des offres est gratuit. Les frais de notaire et les droits restent dus : le simulateur de frais vous donne une estimation." },
      { q: "Peut-on acheter à distance (diaspora) ?", r: "Oui, via une procuration notariée. Le dossier se suit en ligne à chaque étape." },
      { q: "Combien de temps dure une acquisition ?", r: "En moyenne 2 à 4 mois entre la signature et l'obtention du nouveau TF, selon la diligence du notaire et les délais de la Conservation." },
      { q: "Pourquoi vérifier mon identité ?", r: "La vérification protège acheteurs et vendeurs. Un score de confiance minimum est demandé pour soumettre une offre." },
    ],
  },
  {
    titre: "Vendre",
    questions: [
      { q: "Quand la commission est-elle due ?", r: "Uniquement à la signature de l'acte de vente définitif. Si la vente n'aboutit pas, aucune commission n'est due." },
      { q: "Puis-je changer de plan en cours de mois ?", r: "Oui. Le passage à un plan supérieur est proratisé. Une baisse de plan prend effet au renouvellement suivant." },
    ],
  },
];

export default function FaqPage() {
  // Module cadastre en pause : les questions qui ne concernent que lui sont masquées.
  const cadastre = useParametres().flags.cadastre;
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-navy mb-1">Questions fréquentes</h1>
      <p className="text-gray-500 text-sm mb-6">Tout ce qu&apos;il faut savoir avant de vous lancer</p>
      {SECTIONS.map((s) => (
        <section key={s.titre} className="mb-6">
          <h2 className="font-bold text-gray-900 mb-2">{s.titre}</h2>
          <div className="flex flex-col gap-2">
            {s.questions.filter((f) => cadastre || !("cadastre" in f)).map((f) => (
              <details key={f.q} className="card p-4">
                <summary className="font-semibold text-sm text-gray-900 cursor-pointer">{f.q}</summary>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{f.r}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <p className="text-sm text-gray-500">
        Une autre question ? <Link href="/contact" className="text-blue hover:underline">Contactez-nous</Link> ou lisez le <Link href="/guides" className="text-blue hover:underline">guide d&apos;achat</Link>.
      </p>
    </div>
  );
}
