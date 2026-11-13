export type Bien = {
  id: string;
  reference: string;
  titre: string;
  type: "terrain" | "villa" | "appartement" | "bureau";
  superficie: number;
  prix: number;
  region: string;
  ville: string;
  quartier: string;
  is_verified_tf: boolean;
  is_featured: boolean;
  prix_baisser: boolean;
  ancien_prix?: number;
  nb_vues: number;
  photo: string;
  agence: string;
  agence_slug: string;
  telephone: string;
  description: string;
  tf: {
    numero: string | null;
    conservation: string | null;
    date_etablissement: string | null;
    superficie_cadastrale: number | null;
  };
  lat?: number;
  lng?: number;
  photos?: string[];
  auteurEmail?: string;
  proprietaire?: string;
  publieLe?: string;
  // État de gestion, renseigné par le serveur : seuls l'auteur et la modération reçoivent les annonces retirées.
  depublie?: boolean;
  boostJusquau?: string;
  historiquePrix?: { date: string; prix: number }[];
};

export const COORDONNEES: Record<string, [number, number]> = {
  "1": [14.7447, -17.5131],
  "2": [14.71, -17.475],
  "3": [14.4475, -16.9942],
  "4": [14.6708, -17.4381],
  "5": [16.023, -16.479],
  "6": [14.72, -17.465],
  "7": [14.791, -16.9256],
  "8": [14.695, -17.46],
};

export const CENTRES_REGIONS: Record<string, [number, number]> = {
  Dakar: [14.7167, -17.4677],
  "Thiès": [14.791, -16.9256],
  "Saint-Louis": [16.0179, -16.4896],
  Ziguinchor: [12.5681, -16.2719],
  Kaolack: [14.1652, -16.0726],
};

export const BIENS: Bien[] = [
  {
    id: "1", reference: "KB-2026-0001",
    titre: "Terrain résidentiel — Almadies",
    type: "terrain", superficie: 400, prix: 45000000,
    region: "Dakar", ville: "Dakar", quartier: "Almadies",
    is_verified_tf: true, is_featured: true, prix_baisser: false,
    nb_vues: 312,
    photo: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80",
    agence: "Foncier Plus Immobilier", agence_slug: "foncier-plus", telephone: "+221 77 123 45 67",
    description: "Beau terrain plat en zone résidentielle des Almadies. Titre Foncier vérifié, viabilisé eau + électricité. Idéal villa individuelle.",
    tf: { numero: "12 847", conservation: "Dakar-Plateau", date_etablissement: "2018-03-12", superficie_cadastrale: 398 },
  },
  {
    id: "2", reference: "KB-2026-0002",
    titre: "Villa moderne — Mermoz",
    type: "villa", superficie: 250, prix: 120000000,
    region: "Dakar", ville: "Dakar", quartier: "Mermoz",
    is_verified_tf: true, is_featured: true, prix_baisser: true, ancien_prix: 135000000,
    nb_vues: 489,
    photo: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80",
    agence: "Foncier Plus Immobilier", agence_slug: "foncier-plus", telephone: "+221 77 123 45 67",
    description: "Villa R+1 avec piscine, 4 chambres, 2 salons, cuisine américaine. Gardiennage 24h. Titre Foncier propre, aucune hypothèque.",
    tf: { numero: "8 923", conservation: "Dakar-Plateau", date_etablissement: "2015-06-20", superficie_cadastrale: 248 },
  },
  {
    id: "3", reference: "KB-2026-0003",
    titre: "Terrain agricole — Saly Portudal",
    type: "terrain", superficie: 2500, prix: 18000000,
    region: "Thiès", ville: "Mbour", quartier: "Saly Portudal",
    is_verified_tf: true, is_featured: false, prix_baisser: false,
    nb_vues: 178,
    photo: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80",
    agence: "SénéImmo", agence_slug: "sene-immo", telephone: "+221 78 234 56 78",
    description: "Grand terrain proche de la mer, zone touristique. Idéal résidence ou investissement locatif.",
    tf: { numero: "15 230", conservation: "Thiès-Mbour", date_etablissement: "2012-11-05", superficie_cadastrale: 2480 },
  },
  {
    id: "4", reference: "KB-2026-0004",
    titre: "Appartement 3P — Plateau",
    type: "appartement", superficie: 95, prix: 35000000,
    region: "Dakar", ville: "Dakar", quartier: "Plateau",
    is_verified_tf: false, is_featured: false, prix_baisser: false,
    nb_vues: 203,
    photo: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
    agence: "Immo Sénégal", agence_slug: "immo-senegal", telephone: "+221 76 345 67 89",
    description: "Appartement 3 pièces en plein cœur du Plateau. Vue mer partielle, parking inclus. Bien géré en copropriété.",
    tf: { numero: null, conservation: null, date_etablissement: null, superficie_cadastrale: null },
  },
  {
    id: "5", reference: "KB-2026-0005",
    titre: "Terrain nu — Saint-Louis",
    type: "terrain", superficie: 600, prix: 8500000,
    region: "Saint-Louis", ville: "Saint-Louis", quartier: "Sor",
    is_verified_tf: true, is_featured: false, prix_baisser: true, ancien_prix: 10000000,
    nb_vues: 95,
    photo: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80",
    agence: "SénéImmo", agence_slug: "sene-immo", telephone: "+221 78 234 56 78",
    description: "Terrain en zone tranquille de Sor. Accès bitumé. TF vérifié DGID. Vendeur pressé.",
    tf: { numero: "4 410", conservation: "Saint-Louis", date_etablissement: "2010-02-18", superficie_cadastrale: 600 },
  },
  {
    id: "6", reference: "KB-2026-0006",
    titre: "Villa duplex — Sacré-Cœur",
    type: "villa", superficie: 320, prix: 175000000,
    region: "Dakar", ville: "Dakar", quartier: "Sacré-Cœur",
    is_verified_tf: true, is_featured: true, prix_baisser: false,
    nb_vues: 671,
    photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80",
    agence: "Foncier Plus Immobilier", agence_slug: "foncier-plus", telephone: "+221 77 123 45 67",
    description: "Somptueuse villa duplex 5 chambres, 3 salles de bain, 2 salons. Domotique, groupe électrogène, 2 parkings couverts.",
    tf: { numero: "19 087", conservation: "Dakar-Plateau", date_etablissement: "2019-09-01", superficie_cadastrale: 318 },
  },
  {
    id: "7", reference: "KB-2026-0007",
    titre: "Terrain — Thiès Ville",
    type: "terrain", superficie: 300, prix: 6000000,
    region: "Thiès", ville: "Thiès", quartier: "Centre",
    is_verified_tf: true, is_featured: false, prix_baisser: false,
    nb_vues: 112,
    photo: "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=600&q=80",
    agence: "Immo Sénégal", agence_slug: "immo-senegal", telephone: "+221 76 345 67 89",
    description: "Terrain 300m² viabilisé en centre-ville de Thiès. Idéal construction R+2.",
    tf: { numero: "6 754", conservation: "Thiès", date_etablissement: "2016-04-22", superficie_cadastrale: 300 },
  },
  {
    id: "8", reference: "KB-2026-0008",
    titre: "Bureau aménagé — Point E",
    type: "bureau", superficie: 80, prix: 28000000,
    region: "Dakar", ville: "Dakar", quartier: "Point E",
    is_verified_tf: false, is_featured: false, prix_baisser: false,
    nb_vues: 88,
    photo: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
    agence: "SénéImmo", agence_slug: "sene-immo", telephone: "+221 78 234 56 78",
    description: "Plateau de bureaux entièrement aménagé, climatisé, fibre optique. 2 parkings réservés. Idéal entreprise.",
    tf: { numero: null, conservation: null, date_etablissement: null, superficie_cadastrale: null },
  },
];

export const REGIONS = [
  { nom: "Dakar",      img: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=80" },
  { nom: "Thiès",      img: "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=400&q=80" },
  { nom: "Saint-Louis",img: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&q=80" },
  { nom: "Ziguinchor", img: "https://images.unsplash.com/photo-1535530992830-e25d07cfa780?w=400&q=80" },
];

export function formatPrix(fcfa: number): string {
  if (fcfa >= 1_000_000) return `${(fcfa / 1_000_000).toFixed(0)} M FCFA`;
  if (fcfa >= 1_000) return `${(fcfa / 1_000).toFixed(0)} K FCFA`;
  return `${fcfa} FCFA`;
}

// Montant exact, pour les frais et paiements où l'arrondi de formatPrix serait trompeur.
export function formatFCFA(fcfa: number): string {
  return `${String(Math.round(fcfa)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}
