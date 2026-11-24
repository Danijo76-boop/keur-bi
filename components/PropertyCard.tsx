import Link from "next/link";
import Image from "next/image";
import { Eye, MapPin, Maximize2, TrendingDown } from "@/components/icones";
import { Bien, estLocation, formatPrix, prixAffiche } from "@/lib/mock-data";
import clsx from "clsx";
import FavoriButton from "@/components/FavoriButton";
import BoutonComparer from "@/components/BoutonComparer";
import BadgeVente from "@/components/BadgeVente";
import TFBadge from "@/components/TFBadge";
import BadgeDemande from "@/components/BadgeDemande";
import { IconeStatut } from "@/components/Statut";

export default function PropertyCard({ bien, className }: { bien: Bien; className?: string }) {
  return (
    <Link href={`/annonces/${bien.id}`}>
      <div className={clsx("card card-hover group cursor-pointer", className)}>
        {/* Photo */}
        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-navy/20 to-blue/10">
          <Image
            src={bien.photo}
            alt={bien.titre}
            fill
            sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
            unoptimized={!bien.photo.startsWith("http")}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
          {/* Badges overlay */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {estLocation(bien) ? (
              <span className="bg-blue text-white text-xs font-semibold px-2 py-0.5 rounded-full">À louer{bien.meuble ? " · meublé" : ""}</span>
            ) : (
              <>
                <TFBadge bien={bien} />
                <BadgeVente bienId={bien.id} />
              </>
            )}
            <BadgeDemande bien={bien} />
            {bien.is_featured && (
              <span className="bg-gold text-navy-dark text-xs font-semibold px-2 py-0.5 rounded-full">
                <IconeStatut type="vedette" taille={12} />
                En vedette
              </span>
            )}
            {bien.prix_baisser && (
              <span className="bg-red text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingDown size={11} /> Prix baissé
              </span>
            )}
          </div>
          {/* Vue count */}
          <div className="absolute bottom-2.5 right-3 text-white text-xs font-medium flex items-center gap-1">
            <Eye size={12} /> {bien.nb_vues}
          </div>
          <span className="absolute bottom-2.5 left-3 text-white text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/30 px-2 py-0.5 rounded-full">
            {bien.type}
          </span>
          {/* Favori */}
          <FavoriButton
            id={bien.id}
            className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow-sm"
          />
          <BoutonComparer
            id={bien.id}
            className="absolute top-11 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow-sm"
          />
        </div>

        {/* Contenu */}
        <div className="p-4">
          <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2 group-hover:text-navy transition-colors mb-1">{bien.titre}</h3>

          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
            <MapPin size={12} className="text-gold shrink-0" /> {bien.quartier}, {bien.ville}
          </p>

          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-display text-navy-dark font-extrabold text-lg leading-none">{prixAffiche(bien)}</div>
              {bien.prix_baisser && bien.ancien_prix && <div className="text-xs text-gray-400 line-through mt-1">{formatPrix(bien.ancien_prix)}</div>}
            </div>
            <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1 flex items-center gap-1 shrink-0">
              <Maximize2 size={11} /> {bien.superficie.toLocaleString("fr-FR")} m²
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 truncate">{bien.agence}</div>
        </div>
      </div>
    </Link>
  );
}
