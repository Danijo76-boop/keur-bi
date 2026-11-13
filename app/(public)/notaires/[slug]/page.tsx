"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { MapPin, Phone, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { notaireParSlug, prochainsCreneaux } from "@/lib/notaires";
import { obtenirConversation } from "@/lib/messagerie";
import { ajouterRendezVous, lireRendezVous } from "@/lib/preferences";
import { useStocke } from "@/lib/stockage";
import { lireAvis, noteAgregee } from "@/lib/moderation";

export default function NotairePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const notaire = notaireParSlug(slug);
  if (!notaire) notFound();

  // Calculés après le montage : la date du serveur et celle du navigateur peuvent différer.
  const [creneaux, setCreneaux] = useState<Date[]>([]);
  const [choix, setChoix] = useState<string | null>(null);
  const [motif, setMotif] = useState("Consultation");
  const [confirme, setConfirme] = useState(false);
  const rdvs = useStocke(lireRendezVous, []);
  const avisLocaux = useStocke(() => lireAvis("notaire", notaire.slug), [], [notaire.slug]);
  const { note, nbAvis } = noteAgregee(notaire.note, notaire.nbAvis, avisLocaux);
  const tousLesAvis = [
    ...avisLocaux.map((a) => ({ auteur: a.auteurNom, date: new Date(a.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), texte: a.texte })),
    ...notaire.avis,
  ];

  useEffect(() => {
    setCreneaux(prochainsCreneaux(notaire, new Date()));
  }, [notaire]);

  const pris = rdvs.filter((r) => r.notaireSlug === notaire.slug).map((r) => r.date);
  const disponibles = creneaux.filter((c) => !pris.includes(c.toISOString()));

  function reserver() {
    if (!user) return router.push("/connexion");
    if (!choix) return;
    ajouterRendezVous({ email: user.email, notaireSlug: notaire!.slug, notaireNom: notaire!.nom, date: choix, motif, clientNom: user.nom });
    setChoix(null);
    setConfirme(true);
  }

  function ecrire() {
    if (!user) return router.push("/connexion");
    const c = obtenirConversation({
      sujet: `Contact ${notaire!.nom}`,
      acheteurEmail: user.email,
      acheteurNom: user.nom,
      avec: "notaire",
      interlocuteurNom: notaire!.nom,
    });
    router.push(`/messages?c=${c.id}`);
  }

  const chiffres = [
    { val: notaire.dossiers, label: "Dossiers traités" },
    { val: `${new Date().getFullYear() - notaire.agreeDepuis} ans`, label: "D'expérience" },
    { val: `${notaire.satisfaction}%`, label: "Satisfaction" },
    { val: notaire.delaiTF, label: "Délai vérif. TF moyen" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/notaires" className="text-sm text-blue hover:underline mb-4 inline-block">← Tous les notaires</Link>
      <div className="card p-6 mb-6 flex flex-col md:flex-row gap-5 items-start">
        <div className="w-20 h-20 rounded-2xl bg-navy text-gold font-bold text-2xl flex items-center justify-center shrink-0">{notaire.initiales}</div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{notaire.nom}</h1>
          <p className="text-sm text-gray-500 mb-2">Notaire · {notaire.etude} · {notaire.ville} · Agréé depuis {notaire.agreeDepuis}</p>
          <div className="flex items-center gap-1 text-sm mb-2">
            <Star size={15} className="text-gold fill-gold" /> <strong>{note}</strong> <span className="text-gray-400">({nbAvis} avis)</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1"><MapPin size={14} /> {notaire.adresse}</span>
            <a href={`tel:${notaire.telephone}`} className="flex items-center gap-1 hover:text-navy"><Phone size={14} /> {notaire.telephone}</a>
          </div>
        </div>
        <button onClick={ecrire} className="border border-navy text-navy font-semibold px-5 py-2.5 rounded-lg hover:bg-navy/5 text-sm shrink-0">Envoyer un message</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {chiffres.map((c) => (
          <div key={c.label} className="card p-4 text-center">
            <div className="text-xl font-bold text-navy">{c.val}</div>
            <div className="text-xs text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-2">Présentation</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{notaire.presentation}</p>
            <div className="flex flex-wrap gap-1">
              {notaire.specialites.map((s) => <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>)}
            </div>
          </div>
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Derniers avis clients</h2>
            <div className="flex flex-col gap-3">
              {tousLesAvis.map((a) => (
                <div key={`${a.auteur}-${a.texte}`} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-800">{a.auteur} <span className="text-xs font-normal text-gray-400">· {a.date}</span></div>
                  <p className="text-sm text-gray-600">« {a.texte} »</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Prendre rendez-vous</h2>
            {confirme ? (
              <div className="text-sm">
                <p className="text-green font-semibold mb-2">✅ Rendez-vous enregistré</p>
                <Link href="/calendrier" className="text-blue hover:underline block mb-2">Voir dans le calendrier</Link>
                <button onClick={() => setConfirme(false)} className="text-gray-500 hover:underline">Prendre un autre rendez-vous</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {disponibles.map((c) => {
                    const iso = c.toISOString();
                    return (
                      <button
                        key={iso}
                        aria-pressed={choix === iso}
                        onClick={() => setChoix(iso)}
                        className={`text-xs font-medium px-2 py-2 rounded-lg border capitalize ${choix === iso ? "bg-navy text-white border-navy" : "bg-white text-gray-700 border-gray-200 hover:border-navy"}`}
                      >
                        {c.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}<br />
                        {c.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </button>
                    );
                  })}
                </div>
                <label className="text-xs font-semibold text-gray-600 block mb-3">
                  Motif
                  <select value={motif} onChange={(e) => setMotif(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm font-normal mt-1 outline-none focus:border-navy">
                    <option>Consultation</option>
                    <option>Vérification TF</option>
                    <option>Signature du compromis</option>
                    <option>Signature de l&apos;acte</option>
                  </select>
                </label>
                <button disabled={!choix} onClick={reserver} className="btn-navy text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed">Confirmer le rendez-vous</button>
              </>
            )}
          </div>
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Tarifs indicatifs</h2>
            <dl className="text-sm flex flex-col gap-2 mb-3">
              {notaire.tarifs.map((t) => (
                <div key={t.label} className="flex justify-between gap-3">
                  <dt className="text-gray-500">{t.label}</dt>
                  <dd className="font-semibold text-right">{t.val}</dd>
                </div>
              ))}
            </dl>
            <Link href="/frais" className="text-sm text-blue hover:underline">Voir le calculateur de frais →</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
