"use client";
import Link from "next/link";
import { BadgeCheck, FileSignature, Globe2, ShieldCheck, Video, Wallet } from "lucide-react";
import { formatFCFA } from "@/lib/mock-data";
import { SERVICES } from "@/lib/revenus";
import CommanderService from "@/components/CommanderService";

const ETAPES = [
  { icone: Video, titre: "Visitez en vidéo", desc: "Un conseiller se rend sur place et vous fait visiter le bien en direct, à l'heure qui vous convient." },
  { icone: ShieldCheck, titre: "Faites vérifier le titre", desc: "Un notaire partenaire contrôle le Titre Foncier avant que vous ne versiez le moindre franc." },
  { icone: FileSignature, titre: "Signez à distance", desc: "Nous vous aidons à établir une procuration notariée pour signer sans vous déplacer." },
  { icone: Wallet, titre: "Payez en sécurité", desc: "Les fonds sont versés sur le compte séquestre du notaire, jamais directement au vendeur." },
];

const QUESTIONS = [
  { q: "Dois-je venir au Sénégal pour acheter ?", r: "Non. Avec une procuration notariée, une personne de confiance ou le notaire peut signer en votre nom. Vous suivez chaque étape depuis votre dossier en ligne." },
  { q: "Comment être sûr que le terrain existe et appartient bien au vendeur ?", r: "Chaque annonce affiche le statut de vérification de son Titre Foncier. Le Pack Diaspora inclut en plus une visite filmée et un rapport écrit du notaire." },
  { q: "Comment envoyer l'argent ?", r: "Par virement international vers le compte séquestre du notaire. Les fonds ne sont libérés au vendeur qu'à la signature de l'acte." },
];

export default function DiasporaPage() {
  const pack = SERVICES.find((s) => s.id === "pack_diaspora")!;
  return (
    <div>
      <section className="relative overflow-hidden text-white" style={{ background: "radial-gradient(120% 90% at 85% 10%, #2E86AB 0%, #1B4F72 38%, #1B2A4A 78%)" }}>
        <div className="absolute -left-32 -bottom-40 w-[32rem] h-[32rem] rounded-full bg-gold/20 blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6"><Globe2 size={14} className="text-gold" /> Sénégalais de l&apos;extérieur</div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">Achetez au pays,<br /><span className="bg-gradient-to-r from-gold-light to-gold bg-clip-text text-transparent">sans prendre l&apos;avion</span></h1>
          <p className="text-white/75 text-lg max-w-2xl mx-auto mb-8">Paris, New York, Milan ou Montréal : nous sommes vos yeux et vos mains sur place, du premier coup d&apos;œil jusqu&apos;à la remise du titre.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <CommanderService serviceId="pack_diaspora" className="btn-primary">Commander le Pack Diaspora</CommanderService>
            <Link href="/annonces?tf=verifie" className="bg-white/10 border border-white/30 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/20 transition-colors">Voir les biens au titre vérifié</Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <p className="eyebrow block text-center mb-2">Comment ça marche</p>
        <h2 className="section-title text-center mb-10">Quatre étapes, zéro déplacement</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ETAPES.map((e, i) => (
            <li key={e.titre} className="card p-6 relative">
              <div className="font-display absolute right-4 top-2 text-6xl font-extrabold text-navy/[0.06] select-none" aria-hidden>{i + 1}</div>
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-navy to-navy-dark text-gold flex items-center justify-center mb-4"><e.icone size={22} /></span>
              <h3 className="font-bold text-gray-900 mb-1">{e.titre}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{e.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16 grid lg:grid-cols-2 gap-8 items-start">
        <div className="card p-8 ring-2 ring-gold">
          <p className="eyebrow mb-2">L&apos;offre</p>
          <h2 className="text-2xl font-extrabold text-navy-dark mb-1">{pack.titre}</h2>
          <p className="text-gray-500 text-sm mb-5">{pack.desc}</p>
          <ul className="flex flex-col gap-3 mb-6 text-sm">
            {[...pack.inclus, "Rapport écrit du notaire sur le Titre Foncier", "Suivi du dossier en ligne, 24 h sur 24"].map((x) => (
              <li key={x} className="flex gap-2 text-gray-700"><BadgeCheck size={18} className="text-green-light shrink-0" />{x}</li>
            ))}
          </ul>
          <div className="font-display text-3xl font-extrabold text-navy-dark">{formatFCFA(pack.prix)}</div>
          <p className="text-xs text-gray-400 mb-5">Par projet d&apos;achat. Tarif indicatif, hors honoraires du notaire et droits d&apos;enregistrement.</p>
          <CommanderService serviceId="pack_diaspora" className="btn-primary w-full">Commander</CommanderService>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Questions fréquentes</h2>
          <div className="flex flex-col gap-3">
            {QUESTIONS.map((x) => (
              <details key={x.q} className="card p-5 group">
                <summary className="font-semibold text-gray-900 cursor-pointer list-none flex justify-between gap-3">{x.q}<span className="text-gold group-open:rotate-45 transition-transform text-xl leading-none">+</span></summary>
                <p className="text-sm text-gray-600 mt-3 leading-relaxed">{x.r}</p>
              </details>
            ))}
          </div>
          <div className="flex gap-4 flex-wrap mt-6 text-sm">
            <Link href="/financement" className="text-blue font-medium hover:underline">Comparer les crédits →</Link>
            <Link href="/frais" className="text-blue font-medium hover:underline">Simuler les frais →</Link>
            <Link href="/notaires" className="text-blue font-medium hover:underline">Trouver un notaire →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
