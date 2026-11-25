import Link from "next/link";

const ETAPES = [
  {
    titre: "Identifier et visiter le terrain",
    desc: "Recherchez sur KEUR GUI parmi les annonces avec TF vérifié. Visitez physiquement, vérifiez l'accessibilité, les réseaux (eau, électricité) et les servitudes éventuelles.",
    tag: "~2 sem.",
  },
  {
    titre: "Vérifier le Titre Foncier (TF)",
    desc: "Consultez la Conservation Foncière ou passez par la vérification KEUR GUI. Confirmez l'identité du propriétaire, l'absence d'hypothèques et l'intégrité du TF.",
    tag: "KEUR GUI",
  },
  {
    titre: "Négocier et signer la promesse de vente",
    desc: "Rédigez une promesse de vente (sous seing privé ou notariée) avec un acompte de 10–30 %. Précisez les conditions suspensives (obtention de crédit, purge d'éventuels droits).",
    tag: "Recommandé",
  },
  {
    titre: "Choisir un notaire",
    desc: "Sélectionnez un notaire agréé. Il est le garant légal de la transaction. Comparez les frais sur notre simulateur.",
    tag: "Simulateur",
    lien: "/frais",
  },
  {
    titre: "Rédiger et signer l'acte authentique",
    desc: "Le notaire rédige l'acte de vente authentique. Acheteur et vendeur signent en sa présence. Le solde du prix est versé à ce stade.",
    tag: "J0",
  },
  {
    titre: "Enregistrement à la DGID",
    desc: "Le notaire dépose l'acte à la Direction Générale des Impôts et des Domaines dans les 3 mois et règle les droits d'enregistrement. KEUR GUI envoie des alertes J-30 et J-7.",
    tag: "Délai 3 mois",
  },
  {
    titre: "Mutation du Titre Foncier",
    desc: "Dépôt de l'acte enregistré à la Conservation Foncière. Le conservateur procède à la mutation du TF au nom de l'acheteur. Délai : 15–30 jours ouvrés.",
    tag: "15–30 j",
  },
  {
    titre: "Réception du nouveau TF",
    desc: "Vous recevez le Titre Foncier mis à jour à votre nom. Vous êtes officiellement propriétaire et le dossier est clôturé sur KEUR GUI.",
    tag: "Fin du parcours",
  },
];

const LEXIQUE = [
  { terme: "TF — Titre Foncier", def: "Document officiel prouvant la propriété d'un terrain, délivré par la Conservation Foncière." },
  { terme: "DGID", def: "Direction Générale des Impôts et des Domaines, qui collecte les droits d'enregistrement." },
  { terme: "Mutation", def: "Transfert officiel du TF d'un nom à un autre à la Conservation Foncière." },
  { terme: "Acte authentique", def: "Acte rédigé et signé devant notaire, seul valable pour la mutation du TF." },
  { terme: "Conservation Foncière", def: "Service public gérant le registre des titres fonciers." },
];

const FAQ = [
  {
    q: "Un terrain sans TF est-il achetable ?",
    r: "C'est déconseillé : un terrain sans Titre Foncier expose à de sérieux risques juridiques. Faites-vous conseiller par un notaire avant toute offre.",
  },
  { q: "Peut-on acheter à distance (diaspora) ?", r: "Oui, via une procuration notariée. KEUR GUI permet de suivre le dossier en ligne à chaque étape." },
  {
    q: "Quelle est la durée totale du processus ?",
    r: "En moyenne 2 à 4 mois entre la signature et l'obtention du nouveau TF, selon la diligence du notaire et les délais de la Conservation.",
  },
];

export default function GuidesPage() {
  return (
    <div>
      <section className="text-white" style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #1B4F72 60%, #2E86AB 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 py-12">
          <span className="text-xs font-bold text-gold tracking-wide">GUIDE COMPLET</span>
          <h1 className="titre-page text-white md:text-4xl mt-2 mb-3">Acheter un terrain au Sénégal en toute sécurité</h1>
          <p className="text-white/70 max-w-2xl">De la recherche à la mutation du Titre Foncier, toutes les étapes expliquées.</p>
          <p className="text-white/50 text-sm mt-3">8 étapes · 12 min de lecture</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-navy mb-5">Les 8 étapes de l&apos;acquisition foncière</h2>
          <ol className="flex flex-col gap-4">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className="card p-5 flex gap-4">
                <span className="w-9 h-9 rounded-full bg-navy text-white font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                    <h3 className="font-bold text-gray-900">{e.titre}</h3>
                    {e.lien ? (
                      <Link href={e.lien} className="text-xs font-semibold text-blue hover:underline">
                        {e.tag} →
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{e.tag}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{e.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Lexique foncier</h2>
            <dl className="flex flex-col gap-3 text-sm">
              {LEXIQUE.map((l) => (
                <div key={l.terme}>
                  <dt className="font-semibold text-gray-800">{l.terme}</dt>
                  <dd className="text-gray-500 text-xs leading-relaxed">{l.def}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">❓ FAQ rapide</h2>
            <div className="flex flex-col gap-2">
              {FAQ.map((f) => (
                <details key={f.q} className="text-sm">
                  <summary className="font-semibold text-gray-800 cursor-pointer">{f.q}</summary>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">{f.r}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="card p-5 bg-navy text-white">
            <h2 className="font-bold mb-3">Commencer votre recherche</h2>
            <Link href="/annonces" className="btn-primary text-sm block text-center">
              Voir les annonces
            </Link>
          </div>
          <p className="text-xs text-gray-400">Ce guide est informatif et ne remplace pas le conseil d&apos;un notaire.</p>
        </aside>
      </div>
    </div>
  );
}
