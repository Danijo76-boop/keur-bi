export type Notaire = {
  slug: string;
  nom: string;
  initiales: string;
  etude: string;
  ville: string;
  region: string;
  adresse: string;
  telephone: string;
  agreeDepuis: number;
  note: number;
  nbAvis: number;
  dossiers: number;
  satisfaction: number;
  delaiTF: string;
  specialites: string[];
  presentation: string;
  tarifs: { label: string; val: string }[];
  avis: { auteur: string; date: string; texte: string }[];
  // Jours de la semaine (1 = lundi) et heures de consultation.
  creneaux: { jour: number; heures: string[] }[];
};

const TARIFS = [
  { label: "Vérification TF", val: "150 000 FCFA" },
  { label: "Acte de vente", val: "selon barème" },
  { label: "Consultation (1h)", val: "50 000 FCFA" },
];

export const NOTAIRES: Notaire[] = [
  {
    slug: "amadou-diallo",
    nom: "Me. Amadou Diallo",
    initiales: "AD",
    etude: "Étude Diallo",
    ville: "Dakar-Plateau",
    region: "Dakar",
    adresse: "22 Av. Léopold Sédar Senghor, Dakar",
    telephone: "+221 33 823 44 10",
    agreeDepuis: 2009,
    note: 4.9,
    nbAvis: 127,
    dossiers: 148,
    satisfaction: 98,
    delaiTF: "48h",
    specialites: ["Droit foncier", "Mutations immobilières", "Successions", "Baux commerciaux", "Vérification TF"],
    presentation:
      "Notaire spécialisé dans le droit foncier et les transactions immobilières. Son étude, au cœur du Plateau de Dakar, accompagne acheteurs et vendeurs de la vérification du Titre Foncier à l'enregistrement auprès de la DGID.",
    tarifs: TARIFS,
    avis: [
      { auteur: "Daniel B.", date: "Octobre 2026", texte: "Très professionnel, délai de vérification TF respecté, communication claire à chaque étape." },
      { auteur: "Aminata M.", date: "Août 2026", texte: "D'une grande aide pour sécuriser notre achat. Un problème sur le TF a été détecté avant la signature." },
    ],
    creneaux: [
      { jour: 1, heures: ["09:00", "15:00"] },
      { jour: 4, heures: ["10:00", "14:00", "16:00"] },
      { jour: 5, heures: ["09:00", "11:00"] },
    ],
  },
  {
    slug: "fatou-ndiaye",
    nom: "Me. Fatou Ndiaye",
    initiales: "FN",
    etude: "Étude Ndiaye",
    ville: "Almadies",
    region: "Dakar",
    adresse: "Route des Almadies, Dakar",
    telephone: "+221 33 820 11 22",
    agreeDepuis: 2014,
    note: 4.7,
    nbAvis: 89,
    dossiers: 96,
    satisfaction: 95,
    delaiTF: "72h",
    specialites: ["Résidentiel", "Commercial", "Copropriété", "Vérification TF"],
    presentation:
      "Étude spécialisée dans les transactions résidentielles et commerciales de la presqu'île, avec un accompagnement dédié aux acheteurs de la diaspora via procuration notariée.",
    tarifs: TARIFS,
    avis: [{ auteur: "Mamadou B.", date: "Septembre 2026", texte: "Suivi à distance impeccable, tout a été expliqué clairement." }],
    creneaux: [
      { jour: 2, heures: ["09:30", "11:30", "15:00"] },
      { jour: 3, heures: ["10:00", "16:00"] },
    ],
  },
  {
    slug: "cheikh-ndiaye",
    nom: "Me. Cheikh Ndiaye",
    initiales: "CN",
    etude: "Étude Plateau",
    ville: "Thiès",
    region: "Thiès",
    adresse: "Avenue Lamine Guèye, Thiès",
    telephone: "+221 33 951 22 33",
    agreeDepuis: 2011,
    note: 4.8,
    nbAvis: 64,
    dossiers: 81,
    satisfaction: 96,
    delaiTF: "72h",
    specialites: ["Terrains agricoles", "Mutations immobilières", "Lotissements"],
    presentation:
      "Étude de référence pour les terrains de Thiès et de la Petite-Côte, habituée aux parcelles agricoles et aux opérations de lotissement.",
    tarifs: TARIFS,
    avis: [{ auteur: "Fatou S.", date: "Juillet 2026", texte: "Dossier traité rapidement, très bonne connaissance de la Conservation de Thiès." }],
    creneaux: [
      { jour: 1, heures: ["10:00", "14:30"] },
      { jour: 4, heures: ["09:00", "11:00"] },
    ],
  },
];

export function notaireParSlug(slug?: string): Notaire | undefined {
  return NOTAIRES.find((n) => n.slug === slug);
}

export function notaireSuggere(region: string): Notaire {
  return NOTAIRES.find((n) => n.region === region) ?? NOTAIRES[0];
}

export function prochainsCreneaux(n: Notaire, depuis: Date, nb = 6): Date[] {
  const resultats: Date[] = [];
  const jour = new Date(depuis);
  jour.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 21 && resultats.length < nb; i++) {
    jour.setDate(jour.getDate() + 1);
    const c = n.creneaux.find((x) => x.jour === jour.getDay());
    for (const h of c?.heures ?? []) {
      const [hh, mm] = h.split(":").map(Number);
      const d = new Date(jour);
      d.setHours(hh, mm);
      if (resultats.length < nb) resultats.push(d);
    }
  }
  return resultats;
}
