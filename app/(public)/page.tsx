import Link from "next/link";
import Image from "next/image";
import { Shield, FileCheck, TrendingUp, ArrowRight, CheckCircle, Star, MapPin, Home, Wallet, Calculator, Landmark, BadgeCheck, Globe2 } from "lucide-react";
import { BIENS, REGIONS, formatPrix } from "@/lib/mock-data";
import { ChiffresCles, NbAnnoncesRegion } from "@/components/ChiffresAccueil";
import PropertyCard from "@/components/PropertyCard";
import HeroSearch from "@/components/HeroSearch";
import SectionPersonnalisee from "@/components/SectionPersonnalisee";

export default function HomePage() {
  const featured = BIENS.filter(b => b.is_featured).slice(0, 3);
  const vedette = featured.find((b) => b.type === "villa") ?? featured[0];

  return (
    <div>
      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "radial-gradient(120% 90% at 85% 10%, #2E86AB 0%, #1B4F72 38%, #1B2A4A 78%)" }}
      >
        {/* Trame et halo décoratifs */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "28px 28px" }}
        />
        <div className="absolute -left-32 -bottom-40 w-[32rem] h-[32rem] rounded-full bg-gold/20 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-36 md:pt-20 text-white grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6 backdrop-blur-sm">
              <CheckCircle size={14} className="text-green-light" />
              <span>Titres Fonciers vérifiés · Transactions sécurisées</span>
            </div>
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold mb-5 leading-[1.08]">
              L&apos;immobilier au Sénégal,<br />
              <span className="bg-gradient-to-r from-gold-light to-gold bg-clip-text text-transparent">en toute confiance</span>
            </h1>
            <p className="text-white/75 text-lg mb-8 max-w-xl leading-relaxed">
              Achetez et vendez des terrains, villas et appartements avec des Titres Fonciers vérifiés par nos notaires partenaires.
            </p>

            {/* Search bar */}
            <div className="max-w-xl"><HeroSearch /></div>
            <div className="flex flex-wrap items-center gap-2 mt-5 text-sm max-w-xl">
              <span className="text-white/60">Zones :</span>
              {REGIONS.map((r) => (
                <Link key={r.nom} href={`/annonces?region=${r.nom}`} className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-3 py-1 transition-colors">{r.nom}</Link>
              ))}
              <Link href="/bienvenue" className="text-gold font-semibold hover:underline ml-auto">Nouveau ? Commencer →</Link>
            </div>
          </div>

          {/* Visuel : un bien en vedette, avec ses garanties */}
          {vedette && (
            <Link href={`/annonces/${vedette.id}`} className="relative hidden lg:block group">
              <div className="relative h-[26rem] rounded-[2rem] overflow-hidden ring-1 ring-white/20 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
                <Image src={vedette.photo.replace("w=600", "w=1200")} alt={vedette.titre} fill priority sizes="560px" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/85 via-transparent to-transparent" />
                <div className="absolute left-5 right-5 bottom-5">
                  <div className="text-white/70 text-xs mb-1 flex items-center gap-1"><MapPin size={12} className="text-gold" /> {vedette.quartier}, {vedette.ville}</div>
                  <div className="font-display font-bold text-lg leading-snug">{vedette.titre}</div>
                  <div className="font-display font-extrabold text-2xl text-gold mt-1">{formatPrix(vedette.prix)}</div>
                </div>
              </div>
              <div className="absolute -left-8 top-10 bg-white text-gray-800 rounded-2xl px-4 py-3 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.45)] flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-green-light/15 flex items-center justify-center"><Shield size={20} className="text-green-light" /></span>
                <span>
                  <span className="block text-sm font-bold text-navy-dark">Titre Foncier vérifié</span>
                  <span className="block text-xs text-gray-500">Contrôlé par un notaire</span>
                </span>
              </div>
              <div className="absolute -right-4 top-1/2 bg-white text-gray-800 rounded-2xl px-4 py-3 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.45)] flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center"><FileCheck size={20} className="text-gold" /></span>
                <span>
                  <span className="block text-sm font-bold text-navy-dark">Dossier 100 % en ligne</span>
                  <span className="block text-xs text-gray-500">De l&apos;offre à l&apos;acte</span>
                </span>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Chiffres clés, à cheval sur le hero */}
      <div className="relative max-w-7xl mx-auto px-4 -mt-20">
        <div className="card grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
          <ChiffresCles />
        </div>
      </div>

      {/* ── POURQUOI KEUR BI ── */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <p className="eyebrow block text-center mb-2">Nos garanties</p>
        <h2 className="section-title mb-2 text-center">Pourquoi choisir KEUR BI ?</h2>
        <p className="text-gray-500 text-center mb-10">La seule plateforme avec vérification TF en temps réel</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Shield className="text-green-light" size={28} />,
              titre: "Titres Fonciers vérifiés",
              desc: "Chaque bien est contrôlé par nos notaires partenaires. Achetez sans mauvaise surprise.",
            },
            {
              icon: <FileCheck className="text-blue" size={28} />,
              titre: "Dossier 100% numérique",
              desc: "Gérez toute la transaction en ligne : offre, compromis, acte notarié, paiement séquestre.",
            },
            {
              icon: <TrendingUp className="text-gold" size={28} />,
              titre: "Statistiques du marché",
              desc: "Accédez aux prix médians par quartier, tendances et comparatifs pour mieux décider.",
            },
          ].map(f => (
            <div key={f.titre} className="card card-hover p-7 flex flex-col gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy/10 to-blue/5 flex items-center justify-center">{f.icon}</div>
              <h3 className="font-bold text-gray-900 text-lg">{f.titre}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ANNONCES EN VEDETTE ── */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <p className="eyebrow mb-2">Sélection</p>
            <h2 className="section-title">Annonces en vedette</h2>
            <p className="text-gray-500 text-sm mt-1">Sélectionnées par nos experts</p>
          </div>
          <Link href="/annonces" className="flex items-center gap-1 text-sm text-navy font-semibold border border-navy/20 rounded-full px-4 py-2 hover:bg-navy hover:text-white transition-colors shrink-0">
            Voir tout <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {featured.map(b => <PropertyCard key={b.id} bien={b} />)}
        </div>
      </section>

      <SectionPersonnalisee conteneur="max-w-7xl mx-auto px-4 pb-16" />

      {/* ── OUTILS ── */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <p className="eyebrow block text-center mb-2">Outils et services</p>
        <h2 className="section-title mb-2 text-center">Décidez avec les bons chiffres</h2>
        <p className="text-gray-500 text-center mb-10">Estimez, budgétez et comparez avant de vous engager</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { href: "/estimer", icone: <Home size={22} />, titre: "Estimer mon bien", desc: "La valeur de votre terrain ou villa, d'après les annonces comparables." },
            { href: "/budget", icone: <Wallet size={22} />, titre: "Calculer mon budget", desc: "Le prix maximum à viser selon vos revenus et votre apport." },
            { href: "/frais", icone: <Calculator size={22} />, titre: "Simuler les frais", desc: "Notaire, droits d'enregistrement et crédit, poste par poste." },
            { href: "/statistiques", icone: <TrendingUp size={22} />, titre: "Suivre le marché", desc: "Prix médians par région et par type de bien." },
            { href: "/quartiers", icone: <MapPin size={22} />, titre: "Guide des quartiers", desc: "Prix au m², annonces et titres vérifiés, quartier par quartier." },
            { href: "/financement", icone: <Landmark size={22} />, titre: "Comparer les crédits", desc: "Les mensualités de plusieurs banques, et un rappel sans engagement." },
            { href: "/services", icone: <BadgeCheck size={22} />, titre: "Services d'experts", desc: "Rapport de titre, visite accompagnée, photos pro, bornage." },
            { href: "/diaspora", icone: <Globe2 size={22} />, titre: "Acheter depuis l'étranger", desc: "Visite vidéo, procuration et conseiller dédié pour la diaspora." },
          ].map((o) => (
            <Link key={o.href} href={o.href} className="card card-hover p-6 group flex flex-col">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-navy to-navy-dark text-gold flex items-center justify-center mb-4">{o.icone}</span>
              <h3 className="font-bold text-gray-900 mb-1">{o.titre}</h3>
              <p className="text-gray-500 text-sm leading-relaxed flex-1">{o.desc}</p>
              <span className="text-sm text-navy font-semibold mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">Ouvrir <ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <p className="eyebrow block text-center mb-2">Le parcours</p>
        <h2 className="section-title mb-2 text-center">Comment ça marche ?</h2>
        <p className="text-gray-500 text-center mb-10">En 4 étapes simples, de la recherche à la remise des clés</p>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { titre: "Parcourez les annonces", desc: "Filtrez par région, superficie, prix et type. Chaque annonce affiche le badge TF de son statut de vérification." },
            { titre: "Vérifiez le Titre Foncier", desc: "Le résultat de la vérification apparaît directement sur la fiche : vérifié, en cours, non vérifié ou invalide." },
            { titre: "Soumettez une offre", desc: "Faites votre proposition en ligne. Le vendeur peut accepter, refuser ou contre-proposer. Tout est tracé." },
            { titre: "Signez avec un notaire", desc: "Un notaire partenaire prend en charge le compromis, l'acte de vente et l'enregistrement. Vous suivez tout en ligne." },
          ].map((e, i) => (
            <li key={e.titre} className="card p-6 relative">
              <div className="font-display absolute right-4 top-2 text-6xl font-extrabold text-navy/[0.06] select-none" aria-hidden>{i + 1}</div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy to-navy-dark text-gold font-bold flex items-center justify-center mb-4">{i + 1}</div>
              <h3 className="font-bold text-gray-900 mb-1">{e.titre}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{e.desc}</p>
            </li>
          ))}
        </ol>
        <p className="text-center mt-6 text-sm">
          <Link href="/guides" className="text-blue font-medium hover:underline">Lire le guide d&apos;achat complet →</Link>
        </p>
      </section>

      {/* ── BADGE TF ── */}
      <section className="relative overflow-hidden bg-navy-dark text-white py-20">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-blue/30 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="eyebrow mb-2">Sécurité</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Le badge TF, votre bouclier</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Le Titre Foncier est le document qui sécurise une propriété. Avant toute offre, le badge affiché sur chaque annonce vous indique où en est sa vérification : authenticité du titre, hypothèques, concordance du propriétaire et litiges en cours.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3">
            {[
              { icone: "✅", titre: "TF Vérifié", desc: "Titre authentifié, aucun litige ni hypothèque" },
              { icone: "⏳", titre: "En vérification", desc: "Dossier soumis, réponse sous 3 à 7 jours ouvrés" },
              { icone: "○", titre: "Non vérifié", desc: "Document non encore soumis : renseignez-vous avant toute offre" },
              { icone: "❌", titre: "Invalide", desc: "Anomalie détectée : hypothèque, litige ou non-concordance" },
            ].map((b) => (
              <li key={b.titre} className="bg-white/[0.06] border border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <div className="font-semibold text-sm mb-1">{b.icone} {b.titre}</div>
                <p className="text-white/60 text-xs leading-relaxed">{b.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── RÉGIONS ── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="eyebrow block text-center mb-2">Destinations</p>
          <h2 className="section-title mb-2 text-center">Explorer par région</h2>
          <p className="text-gray-500 text-center mb-10">Trouvez votre terrain ou villa partout au Sénégal</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {REGIONS.map(r => (
              <Link key={r.nom} href={`/annonces?region=${r.nom}`}>
                <div className="relative h-56 rounded-2xl overflow-hidden group cursor-pointer card-hover bg-gradient-to-br from-navy to-navy-dark shadow-[0_8px_24px_-12px_rgba(27,42,74,0.3)]">
                  <Image src={r.img} alt={r.nom} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/90 via-navy-dark/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-lg">{r.nom}</div>
                      <div className="text-xs text-white/75"><NbAnnoncesRegion region={r.nom} /></div>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-white/15 border border-white/30 flex items-center justify-center group-hover:bg-gold group-hover:border-gold group-hover:text-navy-dark transition-colors"><ArrowRight size={15} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA AGENCES ── */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div
          className="relative overflow-hidden rounded-[2rem] p-10 md:p-16 text-white text-center shadow-[0_30px_60px_-30px_rgba(27,42,74,0.6)]"
          style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #1B4F72 55%, #2E86AB 100%)" }}
        >
          <div className="absolute -right-16 -bottom-24 w-80 h-80 rounded-full bg-gold/25 blur-3xl" />
          <h2 className="relative text-2xl md:text-4xl font-extrabold mb-3">Vous êtes une agence ou un vendeur ?</h2>
          <p className="relative text-white/75 mb-8 max-w-lg mx-auto">
            Publiez vos annonces, gérez vos dossiers et bénéficiez d&apos;une visibilité maximale sur toute la plateforme.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/publier" className="btn-primary">Publier une annonce</Link>
            <Link href="/tarifs" className="bg-white/10 border border-white/30 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/20 transition-colors">
              Voir les tarifs agence
            </Link>
          </div>
        </div>
      </section>

      {/* ── AVIS ── */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <p className="eyebrow block text-center mb-2">Témoignages</p>
          <h2 className="section-title text-center mb-10">Ils nous font confiance</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { nom: "Moussa Diop", role: "Acheteur — Dakar", note: 5, avis: "J'ai acheté un terrain aux Almadies. La vérification du TF m'a évité une arnaque. Tout s'est passé en ligne, super service !" },
              { nom: "Fatou Sy", role: "Vendeuse — Thiès", note: 5, avis: "Ma villa était vendue en 3 semaines. Le système de séquestre est rassurant pour les deux parties." },
              { nom: "Ibrahima Ndiaye", role: "Notaire partenaire", note: 5, avis: "La plateforme facilite vraiment mon travail. Les dossiers arrivent complets, les signatures électroniques sont fiables." },
            ].map(a => (
              <div key={a.nom} className="card p-6 flex flex-col">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(a.note)].map((_, i) => <Star key={i} size={15} className="text-gold fill-gold" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5 flex-1">&ldquo;{a.avis}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-navy to-blue text-white font-bold text-sm flex items-center justify-center">{a.nom[0]}</span>
                  <span>
                    <span className="block font-semibold text-sm text-gray-900">{a.nom}</span>
                    <span className="block text-xs text-gray-400">{a.role}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
