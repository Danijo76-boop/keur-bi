import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarClock, HardHat, MapPin } from "lucide-react";
import { formatFCFA } from "@/lib/mock-data";
import { aPartirDe } from "@/lib/programmes";
import { trouverProgramme } from "@/lib/serveur/programmes";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { terrain: "Terrain", villa: "Villa", appartement: "Appartement", bureau: "Bureau" };

export default async function ProgrammePage({ params }: { params: { slug: string } }) {
  const p = await trouverProgramme(params.slug);
  if (!p) notFound();
  const prix = aPartirDe(p);
  const sujet = encodeURIComponent(`Programme neuf : ${p.nom}`);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/neuf" className="text-sm text-blue hover:underline">← Tous les programmes neufs</Link>

      <div className="grid lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2">
          <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-navy/20 to-blue/10 mb-3">
            <Image src={p.photo} alt={p.nom} fill sizes="(min-width: 1024px) 66vw, 100vw" unoptimized={!p.photo.startsWith("http")} className="object-cover" priority />
          </div>
          {p.photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mb-6">
              {p.photos.slice(1, 5).map((src, i) => (
                <div key={i} className="relative h-20 rounded-lg overflow-hidden">
                  <Image src={src} alt="" fill sizes="200px" unoptimized={!src.startsWith("http")} className="object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{p.nom}</h1>
              {prix && (
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-400">À partir de</div>
                  <div className="text-2xl font-bold text-navy">{formatFCFA(prix)}</div>
                </div>
              )}
            </div>
            <p className="text-gray-500 flex items-center gap-1 mb-1"><MapPin size={15} /> {p.quartier}, {p.ville} — {p.region}</p>
            <p className="text-gray-400 text-sm flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><CalendarClock size={13} /> Livraison {p.livraison}</span>
              <span className="flex items-center gap-1"><HardHat size={13} /> {p.avancement}</span>
              <span>Promoteur : {p.promoteur}</span>
            </p>
          </div>

          <div className="card p-5 mb-6">
            <h2 className="font-bold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{p.description}</p>
          </div>

          <div className="card overflow-x-auto mb-6">
            <div className="p-5 pb-2">
              <h2 className="font-bold text-gray-900">Lots du programme</h2>
              <p className="text-xs text-gray-400">{p.lots.filter((l) => l.disponible).length} disponible(s) sur {p.lots.length}</p>
            </div>
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th scope="col" className="p-3 font-semibold">Lot</th>
                  <th scope="col" className="p-3 font-semibold">Type</th>
                  <th scope="col" className="p-3 font-semibold text-right">Surface</th>
                  <th scope="col" className="p-3 font-semibold text-right">Pièces</th>
                  <th scope="col" className="p-3 font-semibold text-right">Prix</th>
                  <th scope="col" className="p-3 font-semibold text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {p.lots.map((l) => (
                  <tr key={l.id} className={`border-b border-gray-50 last:border-0 ${l.disponible ? "" : "text-gray-400"}`}>
                    <th scope="row" className="p-3 text-left font-semibold text-gray-800">{l.libelle}</th>
                    <td className="p-3">{TYPES[l.type] ?? l.type}</td>
                    <td className="p-3 text-right whitespace-nowrap">{l.superficie.toLocaleString("fr-FR")} m²</td>
                    <td className="p-3 text-right">{l.nbPieces ?? "—"}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{formatFCFA(l.prix)}</td>
                    <td className="p-3 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${l.disponible ? "bg-green/10 text-green" : "bg-gray-100 text-gray-500"}`}>{l.disponible ? "Disponible" : "Réservé"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside>
          <div className="card p-5 bg-navy text-white mb-4 lg:sticky lg:top-24">
            <h3 className="font-bold mb-1">Ce programme vous intéresse ?</h3>
            <p className="text-white/70 text-sm mb-4">Demandez la grille complète des prix, le calendrier de paiement et une visite du chantier.</p>
            <Link href={`/contact?sujet=${sujet}`} className="btn-primary w-full text-center block">Être rappelé(e)</Link>
            <Link href="/financement" className="block text-center text-sm text-white/80 hover:text-white mt-3">Simuler mon financement →</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
