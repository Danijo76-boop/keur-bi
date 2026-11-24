"use client";
import Link from "next/link";
import { Heart, MessageSquare, FileText, CalendarDays, ShieldCheck, TriangleAlert } from "@/components/icones";
import { formatPrix } from "@/lib/mock-data";
import { User } from "@/lib/auth";
import { useBiens } from "@/lib/annonces";
import { lireMessages } from "@/lib/messages";
import { lireDossiers, LABELS_ETAPE, joursRestantsDGID, prixRetenu, referenceDossier } from "@/lib/dossiers";
import { useParametres } from "@/lib/parametres";
import { lireFavoris } from "@/lib/preferences";
import { useStocke } from "@/lib/stockage";
import { trouverUtilisateur } from "@/lib/utilisateurs";
import PropertyCard from "@/components/PropertyCard";
import ListeVisites from "@/components/ListeVisites";
import SectionPersonnalisee from "@/components/SectionPersonnalisee";
import ParcoursContrat from "@/components/ParcoursContrat";
import { IconeStatut } from "@/components/Statut";

export default function TableauAcheteur({ user }: { user: User }) {
  const biens = useBiens(true);
  const p = useParametres();
  const favoris = useStocke(lireFavoris, []);
  const messages = useStocke(() => lireMessages().filter((m) => m.envoyeur === user.email), [], [user.email]);
  const dossiers = useStocke(() => lireDossiers().filter((d) => d.acheteurEmail === user.email), [], [user.email]);
  const profil = useStocke(() => trouverUtilisateur(user.email), undefined, [user.email]);

  const biensFavoris = biens.filter((b) => favoris.includes(b.id));
  const engage = dossiers.reduce((s, d) => {
    const b = biens.find((x) => x.id === d.bienId);
    return s + (b && d.offres.some((o) => o.statut === "acceptee") ? prixRetenu(d, b) : 0);
  }, 0);
  const alertesDGID = dossiers.filter((d) => {
    const j = joursRestantsDGID(d);
    return j !== null && j <= p.alerteDGID1;
  });

  const tuiles = [
    { label: "Dossiers actifs", val: dossiers.length },
    { label: "Montant engagé", val: engage ? formatPrix(engage) : "—" },
    { label: "Favoris", val: biensFavoris.length },
    { label: "Alertes délais", val: alertesDGID.length },
  ];

  return (
    <div className="flex flex-col gap-8">
      {alertesDGID.map((d) => {
        const j = joursRestantsDGID(d)!;
        return (
          <Link key={d.id} href={`/dossiers/${d.id}`} className="flex items-start gap-3 bg-red/10 text-red rounded-xl px-4 py-3 text-sm font-semibold">
            <TriangleAlert size={18} className="shrink-0" />
            {j >= 0 ? `Délai DGID J-${j}` : "Délai DGID dépassé"} sur le dossier {referenceDossier(d)}. Pénalité de +{p.penaliteRetard}% après le{" "}
            {new Date(d.dateLimiteDGID!).toLocaleDateString("fr-FR")}.
          </Link>
        );
      })}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tuiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="text-2xl font-extrabold text-navy">{t.val}</div>
            <div className="text-xs text-gray-500">{t.label}</div>
          </div>
        ))}
      </div>

      {(!profil || profil.statutKYC === "non_soumis" || profil.statutKYC === "rejete") && (
        <Link href="/kyc" className="card p-4 flex items-center gap-3 border-l-4 border-gold hover:shadow-md transition-shadow">
          <ShieldCheck size={20} className="text-gold shrink-0" />
          <span className="text-sm">
            <strong className="block text-gray-900">Vérifiez votre identité</strong>
            <span className="text-gray-500">Nécessaire pour soumettre des offres sur la plateforme.</span>
          </span>
        </Link>
      )}

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-navy" /> Mes dossiers ({dossiers.length})
        </h2>
        {dossiers.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Aucun dossier en cours. Faites une offre depuis une annonce pour en ouvrir un.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {dossiers.map((d) => {
              const bien = biens.find((b) => b.id === d.bienId);
              if (!bien) return null;
              const joursDGID = joursRestantsDGID(d);
              return (
                <Link key={d.id} href={`/dossiers/${d.id}`} className="card p-4 block hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="font-semibold text-sm text-gray-900">{bien.titre}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy/10 text-navy shrink-0">{LABELS_ETAPE[d.statut]}</span>
                  </div>
                  <ParcoursContrat statut={d.statut} />
                  {joursDGID !== null && joursDGID <= p.alerteDGID2 && (
                    <p className="text-xs font-semibold text-red mt-2">
                      <IconeStatut type="attention" herite />
                      {joursDGID >= 0 ? `J-${joursDGID} avant le délai DGID` : `Délai DGID dépassé`}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <ListeVisites user={user} />

      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Heart size={18} className="text-red" /> Mes favoris ({biensFavoris.length})
          </h2>
          {biensFavoris.length > 0 && (
            <Link href="/favoris" className="text-sm text-blue font-medium hover:underline">
              Tout voir →
            </Link>
          )}
        </div>
        {biensFavoris.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Aucun favori pour le moment.</div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {biensFavoris.slice(0, 3).map((b) => (
              <PropertyCard key={b.id} bien={b} />
            ))}
          </div>
        )}
      </section>

      <SectionPersonnalisee />

      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue" /> Mes messages envoyés ({messages.length})
          </h2>
          <div className="flex gap-3 text-sm font-medium">
            <Link href="/messages" className="text-blue hover:underline">
              Messagerie →
            </Link>
            <Link href="/calendrier" className="text-blue hover:underline flex items-center gap-1">
              <CalendarDays size={14} /> Calendrier
            </Link>
          </div>
        </div>
        {messages.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Aucun message envoyé pour le moment.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.slice(0, 5).map((m) => (
              <div key={m.id} className="card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-gray-900 block mb-1">{m.bienTitre ?? m.agence}</span>
                  <p className="text-sm text-gray-600 break-words">{m.message}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{new Date(m.date).toLocaleDateString("fr-FR")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
