"use client";
import { useState } from "react";
import Link from "next/link";
import { Camera, Check, ClipboardCheck, Compass, FileSearch, Globe2, Ruler } from "lucide-react";
import { formatFCFA } from "@/lib/mock-data";
import { Service, SERVICES } from "@/lib/revenus";
import CommanderService from "@/components/CommanderService";

const ICONES: Record<string, typeof Camera> = {
  rapport_tf: FileSearch,
  visite_accompagnee: Compass,
  bornage: Ruler,
  photos_pro: Camera,
  estimation_certifiee: ClipboardCheck,
  pack_diaspora: Globe2,
};
const PUBLICS: (Service["pour"] | "Tous les services")[] = ["Tous les services", "Acheteur", "Vendeur"];

export default function ServicesPage() {
  const [filtre, setFiltre] = useState<(typeof PUBLICS)[number]>("Tous les services");
  const visibles = SERVICES.filter((s) => filtre === "Tous les services" || s.pour === filtre || s.pour === "Tous");

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <p className="eyebrow mb-2">Services à la carte</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-navy-dark mb-2">Des experts à chaque étape</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">Commandez uniquement ce dont vous avez besoin, sans abonnement. Un conseiller vous rappelle pour organiser la prestation.</p>
      </div>

      <div className="flex justify-center gap-2 flex-wrap mb-8" role="group" aria-label="Filtrer les services">
        {PUBLICS.map((p) => (
          <button key={p} aria-pressed={filtre === p} onClick={() => setFiltre(p)} className={`text-sm font-medium px-4 py-2 rounded-full border transition-colors ${filtre === p ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:border-navy"}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibles.map((s) => {
          const Icone = ICONES[s.id] ?? ClipboardCheck;
          return (
            <div key={s.id} className={`card p-6 flex flex-col ${s.id === "pack_diaspora" ? "ring-2 ring-gold" : ""}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-navy to-navy-dark text-gold flex items-center justify-center"><Icone size={22} /></span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-navy/10 text-navy">{s.pour === "Tous" ? "Acheteur et vendeur" : s.pour}</span>
              </div>
              <h2 className="font-bold text-gray-900 text-lg leading-snug">{s.titre}</h2>
              <p className="text-sm text-gray-500 mt-1 mb-4">{s.desc}</p>
              <ul className="text-sm flex flex-col gap-2 mb-5 flex-1">
                {s.inclus.map((x) => <li key={x} className="flex gap-2 text-gray-700"><Check size={15} className="text-green-light shrink-0 mt-0.5" />{x}</li>)}
              </ul>
              <div className="font-display text-2xl font-extrabold text-navy-dark mb-3">{formatFCFA(s.prix)}</div>
              <CommanderService serviceId={s.id} className={s.id === "pack_diaspora" ? "btn-primary w-full" : "btn-navy w-full"}>Commander</CommanderService>
              {s.id === "pack_diaspora" && <Link href="/diaspora" className="text-sm text-blue font-medium hover:underline text-center mt-3">En savoir plus →</Link>}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center mt-8">Tarifs indicatifs, hors frais de déplacement en dehors de la région de Dakar. Les prestations sont réalisées par des professionnels partenaires.</p>
    </div>
  );
}
