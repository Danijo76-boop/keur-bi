"use client";
import { popup } from "@/lib/popup";
import { useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { formatFCFA } from "@/lib/mock-data";
import { useParametres } from "@/lib/parametres";
import { SERVICES } from "@/lib/revenus";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useStocke } from "@/lib/stockage";
import { majUtilisateur, PlanId, trouverUtilisateur } from "@/lib/utilisateurs";
import BandeauDemo from "@/components/BandeauDemo";

type Plan = { id: PlanId; role: "agence" | "notaire"; nom: string; prix: number; desc: string; cta: string; lien: string; populaire?: boolean; inclus: string[]; exclus?: string[] };

const VENDEURS: Plan[] = [
  { id: "gratuit", role: "agence", nom: "Gratuit", prix: 0, desc: "Pour publier une première annonce et tester la plateforme", cta: "Commencer gratuitement", lien: "/connexion", inclus: ["1 annonce active", "Vérification TF standard (7 jours)", "Réception des offres", "Messagerie acheteurs"], exclus: ["Boost annonce", "TF accéléré 24–48h", "Statistiques visites"] },
  { id: "pro", role: "agence", nom: "Pro", prix: 29000, desc: "Pour vendre plus vite avec plus de visibilité et de services", cta: "Choisir Pro", lien: "/contact?sujet=Plan%20Pro", populaire: true, inclus: ["5 annonces actives", "Vérification TF standard (7 jours)", "Réception des offres", "Messagerie acheteurs", "1 boost annonce/mois inclus", "TF accéléré 24–48h inclus", "Statistiques visites & vues"] },
  { id: "promoteur", role: "agence", nom: "Promoteur", prix: 89000, desc: "Pour les agences et promoteurs avec plusieurs biens à gérer", cta: "Contacter l'équipe", lien: "/contact?sujet=Plan%20Promoteur", inclus: ["Annonces illimitées", "TF accéléré 24h sur tous les biens", "Réception des offres", "Messagerie acheteurs", "Boosts illimités inclus", "Dashboard analytique avancé", "Compte manager dédié"] },
];

const NOTAIRES: Plan[] = [
  { id: "essentiel", role: "notaire", nom: "Essentiel", prix: 50000, desc: "Pour un notaire individuel débutant sur la plateforme", cta: "S'inscrire", lien: "/contact?sujet=Plan%20Notaire%20Essentiel", inclus: ["Fiche notaire dans l'annuaire", "Réception dossiers (5/mois)", "Dashboard suivi actes", "Alertes délais DGID"], exclus: ["Dossiers illimités", "Mise en avant annuaire"] },
  { id: "pro_notaire", role: "notaire", nom: "Pro Notaire", prix: 120000, desc: "Pour une étude active avec plusieurs dossiers simultanés", cta: "Choisir Pro Notaire", lien: "/contact?sujet=Plan%20Pro%20Notaire", populaire: true, inclus: ["Fiche notaire mise en avant", "Dossiers illimités", "Dashboard suivi actes", "Alertes délais DGID", "Mise en avant annuaire", "Reporting mensuel automatique"] },
];

const ACHETEUR = ["Consulter toutes les annonces", "Voir les badges TF", "Soumettre des offres", "Suivre son dossier en temps réel", "Messagerie vendeur & notaire"];

const FAQ = [
  { q: "Quand la commission est-elle prélevée ?", r: "La commission est due uniquement à la signature de l'acte de vente définitif chez le notaire. Si la vente n'aboutit pas (offre refusée, abandon, litige), aucune commission n'est due." },
  { q: "Puis-je changer de plan en cours de mois ?", r: "Oui. Vous pouvez passer à un plan supérieur à tout moment : le montant est proratisé sur le reste du mois. Pour descendre en plan, le changement prend effet au renouvellement suivant." },
  { q: "La vérification TF accélérée est-elle garantie en 24h ?", r: "Votre dossier est transmis en priorité dès réception du paiement, mais le délai dépend aussi de la disponibilité des services de la DGID. Au-delà de 48h ouvrées, le service est remboursé intégralement." },
  { q: "Comment sont perçus les honoraires du notaire ?", r: "Les honoraires du notaire sont distincts de la commission KEUR BI et facturés directement par l'étude. KEUR BI ne prélève aucun pourcentage dessus." },
];

// Module cadastre en pause : les lignes qui promettent une vérification de TF ne sont pas affichées.
const horsCadastre = (x: string) => !x.includes("TF");

function CartePlan({ plan, annuel }: { plan: Plan; annuel: boolean }) {
  const cadastre = useParametres().flags.cadastre;
  const router = useRouter();
  const { user } = useAuth();
  const planActuel = useStocke(() => (user ? trouverUtilisateur(user.email)?.plan : undefined), undefined, [user?.email]);
  const prix = annuel ? Math.round(plan.prix * 0.8) : plan.prix;
  const actuel = planActuel === plan.id || (plan.id === "gratuit" && user?.role === "agence" && !planActuel);
  const autreRole = !!user && user.role !== plan.role;

  function choisir() {
    if (!user) return router.push(`/connexion?mode=inscription&role=${plan.role}`);
    majUtilisateur(user.email, { plan: plan.id });
    popup.succes(`Plan ${plan.nom} activé`, "Démo : aucune facturation.");
  }

  return (
    <div className={`card p-6 flex flex-col ${plan.populaire ? "ring-2 ring-gold" : ""}`}>
      {plan.populaire && <span className="self-start bg-gold text-navy-dark text-xs font-semibold px-2 py-0.5 rounded-full mb-2">⭐ Le plus choisi</span>}
      <h3 className="font-bold text-gray-900 text-lg">{plan.nom}</h3>
      <div className="text-2xl font-extrabold text-navy my-1">{formatFCFA(prix)}<span className="text-sm font-normal text-gray-400"> /mois</span></div>
      <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>
      <ul className="text-sm flex flex-col gap-2 mb-5 flex-1">
        {plan.inclus.filter((x) => cadastre || horsCadastre(x)).map((x) => <li key={x} className="flex gap-2 text-gray-700"><Check size={15} className="text-green-light shrink-0 mt-0.5" />{x}</li>)}
        {plan.exclus?.filter((x) => cadastre || horsCadastre(x)).map((x) => <li key={x} className="flex gap-2 text-gray-400"><Minus size={15} className="shrink-0 mt-0.5" />{x}</li>)}
      </ul>
      {actuel ? (
        <span className="text-sm font-semibold text-green text-center py-2.5">✓ Votre plan actuel</span>
      ) : autreRole ? (
        <span className="text-xs text-gray-400 text-center py-2.5">Réservé aux comptes {plan.role === "agence" ? "Agence" : "Notaire"}</span>
      ) : (
        <button onClick={choisir} className={`${plan.populaire ? "btn-primary" : "btn-navy"} text-sm text-center`}>{plan.cta}</button>
      )}
    </div>
  );
}

export default function TarifsPage() {
  const p = useParametres();
  const [annuel, setAnnuel] = useState(false);

  const paliers = [
    { label: "Bien < 50 M FCFA", taux: p.tauxCommission + 0.5, exemple: 30_000_000 },
    { label: "Bien 50 M – 200 M FCFA", taux: p.tauxCommission, exemple: 90_000_000 },
    { label: "Bien > 200 M FCFA", taux: p.tauxCommission - 0.5, exemple: 300_000_000 },
  ];
  const services = [
    { icone: "⭐", nom: "Boost annonce", desc: "Badge « En vedette » pendant 30 jours", prix: `${formatFCFA(p.prixBoost)} / 30 j`, cta: "Activer", lien: "/tableau-de-bord" },
    { icone: "⚡", nom: "TF accéléré", desc: "Vérification prioritaire en 24–48h au lieu de 7 jours ouvrés", prix: `${formatFCFA(p.prixTFPrioritaire)} / vérif.`, cta: "Commander", lien: "/verification-tf", cadastre: true },
    // Prix repris du catalogue des services, pour ne jamais afficher deux tarifs différents.
    ...SERVICES.filter((s) => s.id === "rapport_tf" || s.id === "photos_pro").map((s) => ({ icone: s.id === "rapport_tf" ? "📄" : "📸", nom: s.titre, desc: s.desc, prix: formatFCFA(s.prix), cta: "Commander", lien: "/services" })),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-navy mb-2">Des tarifs <span className="text-gold">transparents</span>, comme nos biens</h1>
        <p className="text-gray-500">Aucun frais caché. Vous savez exactement ce que vous payez avant de vous engager.</p>
        <div className="inline-flex bg-white border border-gray-200 rounded-lg p-1 mt-4" role="group" aria-label="Périodicité">
          <button aria-pressed={!annuel} onClick={() => setAnnuel(false)} className={`text-sm font-semibold px-4 py-1.5 rounded-md ${!annuel ? "bg-navy text-white" : "text-gray-500"}`}>Mensuel</button>
          <button aria-pressed={annuel} onClick={() => setAnnuel(true)} className={`text-sm font-semibold px-4 py-1.5 rounded-md ${annuel ? "bg-navy text-white" : "text-gray-500"}`}>Annuel −20%</button>
        </div>
      </div>

      <BandeauDemo>Démo : choisir un plan l&apos;active immédiatement et applique son quota d&apos;annonces, sans aucune facturation.</BandeauDemo>
      <h2 className="text-xl font-bold text-navy mb-4">Offres vendeur</h2>
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        {VENDEURS.map((x) => <CartePlan key={x.nom} plan={x} annuel={annuel} />)}
      </div>

      <div className="card p-6 mb-10">
        <h2 className="font-bold text-gray-900 mb-1">📌 Commission sur vente, pour tous les plans</h2>
        <p className="text-sm text-gray-500 mb-4">Due à la signature de l&apos;acte final. Aucune commission si la vente n&apos;aboutit pas.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {paliers.map((x) => (
            <div key={x.label} className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500">{x.label}</div>
              <div className="text-2xl font-extrabold text-navy">{x.taux.toLocaleString("fr-FR")}%</div>
              <div className="text-xs text-gray-500">{formatFCFA(x.exemple)} → commission {formatFCFA((x.exemple * x.taux) / 100)}</div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-xl font-bold text-navy mb-4">Services à la carte</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {services.filter((s) => !("cadastre" in s) || p.flags.cadastre).map((s) => (
          <div key={s.nom} className="card p-5">
            <div className="text-2xl mb-1">{s.icone}</div>
            <h3 className="font-bold text-sm text-gray-900">{s.nom}</h3>
            <p className="text-xs text-gray-500 mb-2">{s.desc}</p>
            <div className="text-sm font-bold text-navy mb-2">{s.prix}</div>
            <Link href={s.lien} className="text-sm text-blue font-medium hover:underline">{s.cta} →</Link>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-navy mb-4">Notaires & acheteurs</h2>
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        {NOTAIRES.map((x) => <CartePlan key={x.nom} plan={x} annuel={annuel} />)}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 text-lg">Acheteur</h3>
          <div className="text-2xl font-extrabold text-navy my-1">Toujours gratuit</div>
          <ul className="text-sm flex flex-col gap-2 my-4">
            {ACHETEUR.map((x) => <li key={x} className="flex gap-2 text-gray-700"><Check size={15} className="text-green-light shrink-0 mt-0.5" />{x}</li>)}
          </ul>
          <p className="text-xs text-gray-500">La commission est à la charge du vendeur. L&apos;acheteur ne paie aucun frais KEUR BI, hors services optionnels. Les frais notariaux et droits restent dus : <Link href="/frais" className="text-blue hover:underline">simuler</Link>.</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-navy mb-4">Questions fréquentes</h2>
      <div className="flex flex-col gap-2 mb-10">
        {FAQ.filter((f) => p.flags.cadastre || horsCadastre(f.q)).map((f) => (
          <details key={f.q} className="card p-4 group">
            <summary className="font-semibold text-sm text-gray-900 cursor-pointer">{f.q}</summary>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{f.r}</p>
          </details>
        ))}
      </div>

      <div className="rounded-2xl p-8 text-white text-center" style={{ background: "linear-gradient(135deg, #1B4F72, #1A5E20)" }}>
        <h2 className="text-2xl font-bold mb-2">Prêt à publier votre premier bien ?</h2>
        <p className="text-white/70 mb-5">Compte gratuit en 2 minutes. Aucune carte bancaire requise.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/publier" className="btn-primary">Publier une annonce</Link>
          <Link href="/annonces" className="bg-white/10 border border-white/30 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-white/20 transition-colors">Voir les annonces</Link>
        </div>
      </div>
    </div>
  );
}
