"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FileCheck, MapPin, Shield } from "@/components/icones";
import { Inclinaison } from "@/components/Dynamique";
import { Bien, estLocation, prixAffiche } from "@/lib/mock-data";

const DUREE_MS = 5500;

/* ── Vitrine de l'accueil ──
   Fait défiler les annonces en vedette (complétées par les plus récentes) avec un fondu.
   Le défilement s'arrête quand la souris est dessus ou que la personne a demandé à limiter les animations.
   Les étiquettes suivent l'annonce affichée : « Titre Foncier vérifié » n'apparaît que si c'est vrai. */
export default function VitrineAccueil({ biens, depart = 0 }: { biens: Bien[]; depart?: number }) {
  const [actif, setActif] = useState(depart % Math.max(biens.length, 1));
  const [pause, setPause] = useState(false);

  useEffect(() => {
    if (biens.length < 2 || pause || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const minuterie = setInterval(() => setActif((i) => (i + 1) % biens.length), DUREE_MS);
    return () => clearInterval(minuterie);
  }, [biens.length, pause]);

  const bien = biens[actif];
  if (!bien) return null;
  const location = estLocation(bien);

  return (
    <div
      className="entree relative hidden lg:block"
      style={{ "--d": "300ms" } as React.CSSProperties}
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onFocus={() => setPause(true)}
      onBlur={() => setPause(false)}
    >
      <Link href={`/annonces/${bien.id}`} className="block group" aria-label={`${bien.titre}, ${prixAffiche(bien)}`}>
        <Inclinaison className="relative rounded-[2rem]">
          <div className="relative h-[26rem] rounded-[2rem] overflow-hidden ring-1 ring-white/20 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] bg-navy-dark">
            {biens.map((b, i) => (
              <Image
                key={b.id}
                src={b.photo.replace("w=600", "w=1200")}
                alt={i === actif ? b.titre : ""}
                fill
                priority={i === actif}
                sizes="560px"
                unoptimized={!b.photo.startsWith("http")}
                className={`object-cover transition-[opacity,transform] duration-1000 group-hover:scale-105 ${i === actif ? "opacity-100" : "opacity-0"}`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/85 via-transparent to-transparent" />
            <div key={bien.id} className="absolute left-5 right-5 bottom-5 animate-[apparition_0.6s_ease-out]">
              <div className="text-white/70 text-xs mb-1 flex items-center gap-1">
                <MapPin size={12} className="text-gold" /> {bien.quartier}, {bien.ville}
              </div>
              <div className="font-display font-bold text-lg leading-snug">{bien.titre}</div>
              <div className="font-display font-extrabold text-2xl text-gold mt-1">{prixAffiche(bien)}</div>
            </div>
          </div>
        </Inclinaison>

        {!location && bien.is_verified_tf && (
          <div className="flotte absolute -left-8 top-10 bg-white text-gray-800 rounded-2xl px-4 py-3 shadow-flottant flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-green-light/15 flex items-center justify-center">
              <Shield size={20} className="text-green-light" />
            </span>
            <span>
              <span className="block text-sm font-bold text-navy-dark">Titre Foncier vérifié</span>
              <span className="block text-xs text-gray-500">Contrôlé par un notaire</span>
            </span>
          </div>
        )}
        <div className="flotte-decale absolute -right-4 top-1/2 bg-white text-gray-800 rounded-2xl px-4 py-3 shadow-flottant flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
            <FileCheck size={20} className="text-gold" />
          </span>
          <span>
            <span className="block text-sm font-bold text-navy-dark">{location ? "Visite en un clic" : "Dossier 100 % en ligne"}</span>
            <span className="block text-xs text-gray-500">{location ? "Demandez un rendez-vous" : "De l'offre à l'acte"}</span>
          </span>
        </div>
      </Link>

      {biens.length > 1 && (
        <div className="flex justify-center gap-2 mt-4" role="tablist" aria-label="Annonces en vitrine">
          {biens.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={i === actif}
              aria-label={`Afficher ${b.titre}`}
              onClick={() => setActif(i)}
              className={`h-2 rounded-full transition-all ${i === actif ? "w-6 bg-gold" : "w-2 bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
