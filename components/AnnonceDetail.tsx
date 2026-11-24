"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, MapPin, Eye, Phone, MessageCircle, MessageSquare, ChevronRight, Settings2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Bien, estLocation, formatFCFA, formatPrix, prixAffiche } from "@/lib/mock-data";
import { LABELS_VENTE, lireDossiers, statutVente } from "@/lib/dossiers";
import { useStocke } from "@/lib/stockage";
import { useBiens, useMetasAnnonces } from "@/lib/annonces";
import { enregistrerVue } from "@/lib/preferences";
import DemandeVisite from "@/components/DemandeVisite";
import PositionMarche from "@/components/PositionMarche";
import SignalerAnnonce from "@/components/SignalerAnnonce";
import { SimulateurCredit } from "@/components/SimulateursFinancement";
import { useAuth, estCoteVendeur, estPlateforme } from "@/lib/auth";
import { notaireSuggere } from "@/lib/notaires";
import FavoriButton from "@/components/FavoriButton";
import BoutonComparer from "@/components/BoutonComparer";
import ShareButton from "@/components/ShareButton";
import ThumbnailGallery from "@/components/ThumbnailGallery";
import ContactLauncher from "@/components/ContactLauncher";
import TFBadge from "@/components/TFBadge";
import TFCaracteristique from "@/components/TFCaracteristique";
import SuiviTF from "@/components/SuiviTF";
import { useParametres } from "@/lib/parametres";
import EncartSponsorise from "@/components/EncartSponsorise";
import BoutonFaireOffre from "@/components/BoutonFaireOffre";
import SimulationFrais from "@/components/SimulationFrais";
import BadgeDemande from "@/components/BadgeDemande";
import HistoriqueAnnonce from "@/components/HistoriqueAnnonce";
import NoteBien from "@/components/NoteBien";
import CommanderService from "@/components/CommanderService";
import PropertyCard from "@/components/PropertyCard";
import { IconeStatut } from "@/components/Statut";

const CarteLeaflet = dynamic(() => import("@/components/CarteLeaflet"), { ssr: false });
const sansEffet = () => {};

export default function AnnonceDetail({ id, initial }: { id: string; initial?: Bien }) {
  const biens = useBiens(true);
  const metas = useMetasAnnonces();
  const { user, pret } = useAuth();
  const bien = biens.find((b) => b.id === id) ?? initial;
  const dossiers = useStocke(lireDossiers, []);
  const [photoActive, setPhotoActive] = useState(0);
  const cadastre = useParametres().flags.cadastre;

  useEffect(() => {
    enregistrerVue(id);
  }, [id]);

  if (!bien) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-400">
        {pret ? "Cette annonce est introuvable ou a été retirée." : "Chargement…"}
        {pret && (
          <Link href="/annonces" className="block text-blue text-sm mt-2 hover:underline">
            Voir toutes les annonces
          </Link>
        )}
      </div>
    );
  }

  const photos = bien.photos?.length ? bien.photos : [bien.photo];
  const photoAffichee = photos[photoActive] ?? bien.photo;
  const vente = statutVente(bien.id, dossiers);
  const monDossier = dossiers.some((d) => d.bienId === bien.id && d.acheteurEmail === user?.email);
  const location = estLocation(bien);
  // Même type d'abord, puis la même région et le budget le plus proche.
  const similaires = biens
    .filter((b) => b.id !== bien.id && b.type === bien.type && estLocation(b) === location && !metas[b.id]?.depublie)
    .sort((a, b) => Number(b.region === bien.region) - Number(a.region === bien.region) || Math.abs(a.prix - bien.prix) - Math.abs(b.prix - bien.prix))
    .slice(0, 3);
  const notaire = notaireSuggere(bien.region);
  const vendeur = estCoteVendeur(user?.role) || estPlateforme(user?.role) || (!!user && user.email === bien.auteurEmail);
  const peutGerer = !!user && (user.email === bien.auteurEmail || user.role === "admin");

  // Une annonce retirée reste visible par son vendeur, sa modération et les parties d'un dossier ouvert.
  if (pret && metas[bien.id]?.depublie && !vendeur && !monDossier) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-400">
        Cette annonce a été retirée.
        <Link href="/annonces" className="block text-blue text-sm mt-2 hover:underline">
          Voir toutes les annonces
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-1 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-navy">
          Accueil
        </Link>
        <ChevronRight size={14} />
        <Link href="/annonces" className="hover:text-navy">
          Annonces
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-700">{bien.titre}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Colonne gauche */}
        <div className="flex-1 min-w-0">
          {/* Photo principale */}
          <div className="relative h-72 md:h-96 rounded-xl overflow-hidden bg-gray-200 mb-3">
            <Image src={photoAffichee} alt={bien.titre} fill className="object-cover" unoptimized={!photoAffichee.startsWith("http")} />
            <div className="absolute top-3 left-3 flex gap-2">
              <TFBadge
                bien={bien}
                size={12}
                texte="TF Vérifié DGID"
                className="bg-green text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1"
              />
              {bien.is_featured && (
                <span className="bg-gold text-navy-dark text-xs font-semibold px-3 py-1 rounded-full">
                  <IconeStatut type="vedette" taille={12} />
                  En vedette
                </span>
              )}
            </div>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <FavoriButton id={bien.id} size={18} className="bg-white/90 hover:bg-white p-2 rounded-lg shadow-sm" />
              <BoutonComparer id={bien.id} className="bg-white/90 hover:bg-white p-2 rounded-lg shadow-sm" />
              <ShareButton titre={bien.titre} className="bg-white/90 hover:bg-white p-2 rounded-lg shadow-sm" />
            </div>
          </div>

          {/* Miniatures */}
          <ThumbnailGallery photos={photos} actif={photoActive} onChange={setPhotoActive} />

          {/* Titre & info */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="titre-page">{bien.titre}</h1>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-navy">{prixAffiche(bien)}</div>
                {bien.prix_baisser && bien.ancien_prix && <div className="text-sm text-gray-400 line-through">{formatPrix(bien.ancien_prix)}</div>}
              </div>
            </div>
            <p className="text-gray-500 flex items-center gap-1 mb-1">
              <MapPin size={15} /> {bien.quartier}, {bien.ville} — {bien.region}
            </p>
            <p className="text-gray-400 text-sm flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye size={13} /> {bien.nb_vues} vues
              </span>
              <span>Réf : {bien.reference}</span>
              <span className="capitalize">{bien.type}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <BadgeDemande bien={bien} detail />
            {!location && <PositionMarche bien={bien} />}
          </div>

          {/* Caractéristiques */}
          <div className="card p-5 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Caractéristiques</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Type", val: bien.type },
                { label: "Superficie", val: `${bien.superficie.toLocaleString("fr-FR")} m²` },
                ...(bien.nb_pieces ? [{ label: "Pièces", val: String(bien.nb_pieces) }] : []),
                ...(location
                  ? [
                      { label: "Charges", val: bien.charges ? `${formatFCFA(bien.charges)} / mois` : "Comprises" },
                      { label: "Caution", val: bien.caution ? formatFCFA(bien.caution) : "—" },
                      { label: "Meublé", val: bien.meuble ? "Oui" : "Non" },
                    ]
                  : [{ label: "Prix/m²", val: `${Math.round(bien.prix / bien.superficie).toLocaleString("fr-FR")} FCFA` }]),
                { label: "Région", val: bien.region },
                { label: "Ville", val: bien.ville },
                { label: "Quartier", val: bien.quartier },
                ...(location
                  ? []
                  : [
                      { label: "Titre Foncier", val: <TFCaracteristique bien={bien} /> },
                      { label: "N° Titre Foncier", val: bien.tf.numero ?? "En attente" },
                      { label: "Conservation", val: bien.tf.conservation ?? "—" },
                    ]),
                { label: "Référence", val: bien.reference },
                { label: "Statut", val: location ? "À louer" : LABELS_VENTE[vente] },
              ].map((c) => (
                <div key={c.label} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-0.5">{c.label}</div>
                  <div className="font-semibold text-sm text-gray-800">{c.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="card p-5 mb-6">
            <h2 className="font-bold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{bien.description}</p>
          </div>

          <HistoriqueAnnonce bien={bien} />

          {/* Suivi TF */}
          {cadastre && <SuiviTF bien={bien} />}

          {!location && (
            <>
              <SimulationFrais prix={bien.prix} />
              <SimulateurCredit prix={bien.prix} />
            </>
          )}

          {/* Localisation */}
          <div className="card p-5 mb-6">
            <h2 className="font-bold text-gray-900 mb-1">Localisation</h2>
            <p className="text-xs text-gray-400 mb-3">Position approximative : l&apos;adresse exacte est communiquée lors de la visite.</p>
            <div className="h-64 rounded-lg overflow-hidden bg-gray-100">
              <CarteLeaflet biens={[bien]} selection={bien.id} onSelection={sansEffet} />
            </div>
          </div>
        </div>

        {/* Colonne droite — Contact */}
        <aside className="w-full lg:w-80 shrink-0">
          {/* Agence card */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center text-gold font-bold text-lg">{bien.agence[0]}</div>
              <div>
                <div className="font-bold text-sm text-gray-900">{bien.agence}</div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <CheckCircle size={11} className="text-green-light" /> Agence vérifiée
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <ContactLauncher
                titre={`Contacter ${bien.agence}`}
                sousTitre={bien.titre}
                bienId={bien.id}
                bienTitre={bien.titre}
                agence={bien.agence}
                className="btn-navy flex items-center justify-center gap-2 w-full"
              >
                <MessageSquare size={16} /> Envoyer un message
              </ContactLauncher>
              <DemandeVisite bienId={bien.id} bienTitre={bien.titre} />
              {bien.telephone && (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${bien.telephone}`}
                    className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold text-sm px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Phone size={15} /> Appeler
                  </a>
                  <a
                    href={`https://wa.me/${bien.telephone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour, je suis intéressé(e) par votre annonce KEUR BI : ${bien.titre} (réf. ${bien.reference}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold text-sm px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                </div>
              )}
              {peutGerer && (
                <Link
                  href={`/mes-annonces/${bien.id}`}
                  className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Settings2 size={16} /> Gérer cette annonce
                </Link>
              )}
            </div>

            {bien.agence_slug && (
              <Link href={`/agences/${bien.agence_slug}`} className="block text-center text-sm text-blue hover:underline">
                Voir le profil de l&apos;agence →
              </Link>
            )}
            <SignalerAnnonce bienId={bien.id} />
          </div>

          {/* Faire une offre */}
          <div className="card p-5 bg-navy text-white mb-4">
            {location ? (
              <>
                <h3 className="font-bold mb-1">Intéressé(e) ?</h3>
                <p className="text-white/70 text-sm">Ce bien est à louer : contactez l&apos;annonceur ou demandez une visite ci-dessus.</p>
              </>
            ) : vente === "disponible" || monDossier ? (
              <>
                <h3 className="font-bold mb-1">Intéressé(e) ?</h3>
                <p className="text-white/70 text-sm mb-4">Soumettez une offre directement depuis la plateforme. Chaque étape est tracée dans votre dossier.</p>
                <BoutonFaireOffre bien={bien} className="btn-primary w-full text-center">
                  {monDossier ? "Voir mon dossier" : "Faire une offre"}
                </BoutonFaireOffre>
                <p className="text-white/50 text-xs text-center mt-2">Aucun engagement avant acceptation</p>
              </>
            ) : (
              <>
                <h3 className="font-bold mb-1">{vente === "vendu" ? "Ce bien est vendu" : "Ce bien est sous offre"}</h3>
                <p className="text-white/70 text-sm mb-4">Il n&apos;accepte plus de nouvelles offres. Voyez les biens comparables.</p>
                <Link href={`/annonces?type=${bien.type}`} className="btn-primary w-full text-center block">
                  Voir des biens similaires
                </Link>
              </>
            )}
          </div>

          {user && (
            <div className="card p-5 mb-4">
              <h3 className="font-bold text-gray-900 mb-1">Ma note personnelle</h3>
              <p className="text-xs text-gray-400 mb-3">Visible de vous seul.</p>
              <NoteBien id={bien.id} />
            </div>
          )}

          <div className="card p-5 mb-4">
            <h3 className="font-bold text-gray-900 mb-1">{location ? "Louez l'esprit tranquille" : "Achetez l'esprit tranquille"}</h3>
            <p className="text-sm text-gray-500 mb-3">Faites contrôler ce bien par un professionnel avant de vous engager.</p>
            <div className="flex flex-col gap-2">
              {!location && (
                <CommanderService serviceId="rapport_tf" bienId={bien.id} className="text-sm text-left text-blue font-medium hover:underline">
                  Rapport complet du Titre Foncier →
                </CommanderService>
              )}
              <CommanderService serviceId="visite_accompagnee" bienId={bien.id} className="text-sm text-left text-blue font-medium hover:underline">
                Visite accompagnée par un expert →
              </CommanderService>
              {!location && (
                <Link href="/financement" className="text-sm text-blue font-medium hover:underline">
                  Comparer les crédits →
                </Link>
              )}
            </div>
          </div>

          <div className="card p-5 mb-4">
            <h3 className="font-bold text-gray-900 mb-1">Ce bien est-il dans votre budget ?</h3>
            <p className="text-sm text-gray-500 mb-3">Calculez le prix maximum que vous pouvez viser, frais compris.</p>
            <Link href="/budget" className="text-sm text-blue font-medium hover:underline">
              Calculer mon budget →
            </Link>
          </div>

          {/* Notaire suggéré */}
          <div className="card p-5 mb-4">
            <h3 className="font-bold text-gray-900 mb-3">Notaire suggéré</h3>
            <Link href={`/notaires/${notaire.slug}`} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-navy/10 text-navy font-bold text-sm flex items-center justify-center">{notaire.initiales}</div>
              <div>
                <div className="font-semibold text-sm text-gray-900 group-hover:text-navy">{notaire.nom}</div>
                <div className="text-xs text-gray-400">
                  {notaire.ville}
                  {notaire.nbAvis > 0 && ` · ${notaire.note.toLocaleString("fr-FR")}/5`}
                </div>
              </div>
            </Link>
          </div>

          <EncartSponsorise emplacement="fiche" />
        </aside>
      </div>

      {/* Biens similaires */}
      {similaires.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-navy mb-6">Annonces similaires</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {similaires.map((b) => (
              <PropertyCard key={b.id} bien={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
