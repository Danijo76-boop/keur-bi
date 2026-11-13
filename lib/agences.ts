export type Agence = {
  slug: string;
  nom: string;
  initiales: string;
  description: string;
  fondee: number;
  telephone: string;
  email: string;
  adresse: string;
  horaires: string;
  badges: string[];
  ventes: number;
  note: number;
  nbAvis: number;
  agents: { initiales: string; nom: string; role: string; ventes: number; note: number }[];
  avis: { auteur: string; date: string; note: number; texte: string }[];
};

export const AGENCES: Agence[] = [
  {
    slug: "foncier-plus",
    nom: "Foncier Plus Immobilier",
    initiales: "FP",
    description: "Agence spécialisée dans les terrains et villas au Sénégal. Elle accompagne ses clients de la recherche jusqu'à la signature, avec une vérification systématique du Titre Foncier.",
    fondee: 2018,
    telephone: "+221 77 123 45 67",
    email: "contact@foncierplus.example.sn",
    adresse: "14 Av. Pompidou, Plateau, Dakar",
    horaires: "Lun–Ven 8h–18h · Sam 9h–13h",
    badges: ["Agence vérifiée", "Top Vendeur 2026"],
    ventes: 187,
    note: 4.7,
    nbAvis: 47,
    agents: [
      { initiales: "KD", nom: "Khadim Diallo", role: "Directeur commercial", ventes: 48, note: 4.9 },
      { initiales: "AF", nom: "Aminata Fall", role: "Négociatrice senior", ventes: 35, note: 4.8 },
      { initiales: "OS", nom: "Omar Sow", role: "Expert foncier", ventes: 29, note: 4.7 },
    ],
    avis: [
      { auteur: "Mamadou B.", date: "Oct. 2026", note: 5, texte: "TF vérifié avant même la visite, tout était transparent. Transaction rapide et sécurisée." },
      { auteur: "Fatou N.", date: "Sep. 2026", note: 4, texte: "Très professionnel, délais respectés. Je recommande pour l'achat foncier." },
    ],
  },
  {
    slug: "sene-immo",
    nom: "SénéImmo",
    initiales: "SI",
    description: "Agence présente à Dakar, sur la Petite-Côte et à Saint-Louis, tournée vers les terrains d'investissement et les locaux professionnels.",
    fondee: 2015,
    telephone: "+221 78 234 56 78",
    email: "contact@seneimmo.example.sn",
    adresse: "Point E, Dakar",
    horaires: "Lun–Ven 9h–18h",
    badges: ["Agence vérifiée"],
    ventes: 96,
    note: 4.4,
    nbAvis: 28,
    agents: [
      { initiales: "MS", nom: "Mariama Seck", role: "Responsable ventes", ventes: 41, note: 4.6 },
      { initiales: "BN", nom: "Babacar Niang", role: "Agent commercial", ventes: 22, note: 4.3 },
    ],
    avis: [{ auteur: "Ousmane D.", date: "Août 2026", note: 4, texte: "Bon suivi du dossier, équipe disponible." }],
  },
  {
    slug: "immo-senegal",
    nom: "Immo Sénégal",
    initiales: "IS",
    description: "Réseau d'agents à Dakar et Thiès, spécialisé dans les appartements et les terrains viabilisés de centre-ville.",
    fondee: 2020,
    telephone: "+221 76 345 67 89",
    email: "contact@immosenegal.example.sn",
    adresse: "Avenue Lamine Guèye, Thiès",
    horaires: "Lun–Sam 9h–17h",
    badges: ["Agence vérifiée"],
    ventes: 54,
    note: 4.2,
    nbAvis: 16,
    agents: [{ initiales: "AK", nom: "Awa Kane", role: "Gérante", ventes: 30, note: 4.5 }],
    avis: [{ auteur: "Ibrahima T.", date: "Juin 2026", note: 4, texte: "Réactifs et clairs sur les frais." }],
  },
];

export function agenceParSlug(slug: string): Agence | undefined {
  return AGENCES.find((a) => a.slug === slug);
}
