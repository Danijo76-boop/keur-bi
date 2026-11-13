"use client";
import { useState } from "react";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatFCFA } from "@/lib/mock-data";
import { demanderFinancement, OffreFinancement, OFFRES_FINANCEMENT } from "@/lib/revenus";
import { mensualite } from "@/components/SimulateursFinancement";
import BandeauDemo from "@/components/BandeauDemo";
import Modal from "@/components/Modal";

const champ = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-navy mt-1 font-normal bg-white";
const lib = "text-sm font-semibold text-gray-700";

export default function FinancementPage() {
  const { user } = useAuth();
  const [prix, setPrix] = useState("50000000");
  const [apport, setApport] = useState("20");
  const [duree, setDuree] = useState("15");
  const [choisie, setChoisie] = useState<OffreFinancement | null>(null);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [revenu, setRevenu] = useState("");

  const prixBien = Math.max(Number(prix) || 0, 0);
  const partApport = Math.min(Math.max(Number(apport) || 0, 0), 100);
  const annees = Math.max(Number(duree) || 0, 0);
  const capital = Math.round((prixBien * (100 - partApport)) / 100);

  // Classement par mensualité ; une offre dont les conditions ne sont pas remplies passe en fin de liste.
  const offres = OFFRES_FINANCEMENT.map((o) => {
    const motif = partApport < o.apportMin ? `Apport minimum ${o.apportMin} %` : annees > o.dureeMax ? `Durée maximum ${o.dureeMax} ans` : null;
    const m = mensualite(capital, o.taux, annees * 12);
    return { o, motif, m, cout: Math.max(m * annees * 12 - capital, 0) };
  }).sort((a, b) => Number(!!a.motif) - Number(!!b.motif) || a.m - b.m);
  const meilleure = offres.find((x) => !x.motif);

  function ouvrir(o: OffreFinancement) {
    setNom((n) => n || user?.nom || "");
    setChoisie(o);
  }

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!choisie) return;
    demanderFinancement({ offreId: choisie.id, nom: nom.trim(), telephone: telephone.trim(), montant: capital, duree: annees, revenu: Number(revenu) || undefined });
    setChoisie(null);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <p className="eyebrow mb-2">Financement</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-navy-dark mb-2">Comparez les crédits immobiliers</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">Indiquez votre projet, comparez les mensualités et demandez à être rappelé(e) par la banque de votre choix. C&apos;est gratuit et sans engagement.</p>
      </div>

      <div className="grid lg:grid-cols-[20rem_1fr] gap-6 items-start">
        <form className="card p-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Landmark size={18} className="text-gold" /> Votre projet</h2>
          <label className={lib}>Prix du bien (FCFA)<input type="number" min={0} inputMode="numeric" value={prix} onChange={(e) => setPrix(e.target.value)} className={champ} /></label>
          <label className={lib}>Apport (%)<input type="number" min={0} max={100} value={apport} onChange={(e) => setApport(e.target.value)} className={champ} /></label>
          <label className={lib}>Durée (ans)<input type="number" min={1} max={30} value={duree} onChange={(e) => setDuree(e.target.value)} className={champ} /></label>
          <dl className="text-sm border-t border-gray-100 pt-3 flex flex-col gap-1">
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Apport</dt><dd className="font-semibold">{formatFCFA(prixBien - capital)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Montant à emprunter</dt><dd className="font-semibold">{formatFCFA(capital)}</dd></div>
          </dl>
          <Link href="/budget" className="text-sm text-blue font-medium hover:underline">Je ne connais pas mon budget →</Link>
        </form>

        <div className="min-w-0">
          <BandeauDemo>Démo : les banques et les taux affichés sont des exemples fictifs. Les vraies offres dépendront des partenariats signés.</BandeauDemo>
          <div className="flex flex-col gap-4">
            {offres.map(({ o, motif, m, cout }) => (
              <div key={o.id} className={`card p-5 flex items-center gap-5 flex-wrap ${meilleure?.o.id === o.id ? "ring-2 ring-gold" : ""} ${motif ? "opacity-60" : ""}`}>
                <span className="w-12 h-12 rounded-2xl bg-navy/10 text-navy flex items-center justify-center shrink-0"><Landmark size={22} /></span>
                <div className="min-w-[10rem] flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{o.nom}</h3>
                    {meilleure?.o.id === o.id && <span className="bg-gold text-navy-dark text-xs font-semibold px-2 py-0.5 rounded-full">Mensualité la plus basse</span>}
                  </div>
                  <p className="text-sm text-gray-500">{o.atout}</p>
                  <p className="text-xs text-gray-400 mt-1">Taux {String(o.taux).replace(".", ",")} % · jusqu&apos;à {o.dureeMax} ans · apport dès {o.apportMin} %</p>
                </div>
                <div className="text-right">
                  {motif ? (
                    <div className="text-sm font-semibold text-red">{motif}</div>
                  ) : (
                    <>
                      <div className="font-display text-xl font-extrabold text-navy-dark">{formatFCFA(m)}<span className="text-xs font-normal text-gray-400"> /mois</span></div>
                      <div className="text-xs text-gray-400">Intérêts : {formatFCFA(cout)}</div>
                    </>
                  )}
                </div>
                <button disabled={!!motif || capital <= 0} onClick={() => ouvrir(o)} className="btn-navy text-sm disabled:opacity-40 shrink-0">Être rappelé(e)</button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">Mensualités hors assurance et frais de dossier. KEUR BI peut être rémunéré par la banque lorsqu&apos;une demande lui est transmise ; cela ne change rien au taux qui vous est proposé.</p>
        </div>
      </div>

      {choisie && (
        <Modal titre={`Être rappelé(e) par ${choisie.nom}`} sousTitre={`${formatFCFA(capital)} sur ${annees} ans`} onClose={() => setChoisie(null)}>
          <form onSubmit={envoyer} className="flex flex-col gap-3">
            <input required placeholder="Votre nom" value={nom} onChange={(e) => setNom(e.target.value)} className={champ.replace("mt-1 ", "")} />
            <input required type="tel" placeholder="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} className={champ.replace("mt-1 ", "")} />
            <input type="number" min={0} placeholder="Revenu mensuel net (optionnel)" value={revenu} onChange={(e) => setRevenu(e.target.value)} className={champ.replace("mt-1 ", "")} />
            <p className="text-xs text-gray-400">En envoyant, vous acceptez que ces informations soient transmises à cette banque pour qu&apos;elle vous recontacte.</p>
            <button type="submit" className="btn-navy w-full">Envoyer ma demande</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
