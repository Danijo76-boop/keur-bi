import Link from "next/link";
import Image from "next/image";
import { Building2, CalendarClock, MapPin, Plus } from "lucide-react";
import { formatPrix } from "@/lib/mock-data";
import { aPartirDe, type Programme } from "@/lib/programmes";
import { listerProgrammes } from "@/lib/serveur/programmes";
import { log } from "@/lib/serveur/journal";

export const dynamic = "force-dynamic";

const REGIONS = ["Toutes", "Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack"];

// Programmes neufs : immeubles et lotissements vendus sur plan ou en construction, lot par lot.
export default async function NeufPage({ searchParams }: { searchParams: { region?: string } }) {
  const region = REGIONS.includes(searchParams.region ?? "") ? (searchParams.region as string) : "Toutes";
  let programmes: Programme[] = [];
  let indisponible = false;
  try {
    programmes = await listerProgrammes(region === "Toutes" ? undefined : region);
  } catch (e) {
    log.erreur("Programmes neufs : base de données injoignable", e);
    indisponible = true;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Programmes neufs</h1>
          <p className="text-gray-500 text-sm">Appartements, villas et bureaux vendus sur plan ou en construction par des promoteurs</p>
        </div>
        <Link href="/neuf/publier" className="btn-primary text-sm px-3 py-2 flex items-center gap-1"><Plus size={15} /> Publier un programme</Link>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {REGIONS.map((r) => (
          <Link
            key={r}
            href={r === "Toutes" ? "/neuf" : `/neuf?region=${encodeURIComponent(r)}`}
            aria-current={region === r ? "page" : undefined}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border ${region === r ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy"}`}
          >
            {r}
          </Link>
        ))}
      </div>

      {indisponible && <div className="card p-8 text-center text-gray-400">Les programmes ne peuvent pas être affichés pour le moment. Réessayez dans quelques instants.</div>}
      {!indisponible && programmes.length === 0 && <div className="card p-8 text-center text-gray-400">Aucun programme neuf dans cette région pour l&apos;instant.</div>}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {programmes.map((p) => {
          const prix = aPartirDe(p);
          const disponibles = p.lots.filter((l) => l.disponible).length;
          return (
            <Link key={p.id} href={`/neuf/${p.slug}`}>
              <div className="card card-hover group cursor-pointer">
                <div className="relative h-52 overflow-hidden bg-gradient-to-br from-navy/20 to-blue/10">
                  <Image src={p.photo} alt={p.nom} fill sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw" unoptimized={!p.photo.startsWith("http")} className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span className="bg-gold text-navy-dark text-xs font-semibold px-2 py-0.5 rounded-full">Neuf</span>
                    <span className="bg-white/90 text-navy-dark text-xs font-semibold px-2 py-0.5 rounded-full">{p.avancement}</span>
                  </div>
                  <span className="absolute bottom-2.5 left-3 text-white text-xs font-medium flex items-center gap-1"><CalendarClock size={12} /> Livraison {p.livraison}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2 group-hover:text-navy transition-colors mb-1">{p.nom}</h3>
                  <p className="text-xs text-gray-500 mb-3 flex items-center gap-1"><MapPin size={12} className="text-gold shrink-0" /> {p.quartier}, {p.ville}</p>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xs text-gray-400">À partir de</div>
                      <div className="font-display text-navy-dark font-extrabold text-lg leading-none">{prix ? formatPrix(prix) : "Complet"}</div>
                    </div>
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1 flex items-center gap-1 shrink-0">
                      <Building2 size={11} /> {disponibles} lot{disponibles > 1 ? "s" : ""} disponible{disponibles > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 truncate">{p.promoteur}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
