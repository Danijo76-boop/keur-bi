"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CreditCard, MessageSquare, PenLine, Upload } from "@/components/icones";
import { useAuth, estCoteVendeur, estNotariat } from "@/lib/auth";
import { useBiens } from "@/lib/annonces";
import { formatFCFA, formatPrix } from "@/lib/mock-data";
import { NOTAIRES, notaireParSlug } from "@/lib/notaires";
import { calculerFrais, commissionVente, useParametres } from "@/lib/parametres";
import { usePeut } from "@/lib/permissions";
import { obtenirConversation } from "@/lib/messagerie";
import { useStocke } from "@/lib/stockage";
import { exporterPDF } from "@/lib/export";
import { BoutonPDF } from "@/components/BoutonsExport";
import { useVerificationTF } from "@/lib/tf";
import {
  ajouterOffre,
  ajouterPiece,
  avancerEtape,
  choisirNotaire,
  conditionsTransition,
  confirmerPaiement,
  documentsDossier,
  enregistrerNotes,
  ETAPES_DOSSIER,
  joursAvantExpiration,
  joursRestantsDGID,
  LABELS_ETAPE,
  LABELS_MOYEN,
  lireDossiers,
  montantAcompte,
  prixRetenu,
  referenceDossier,
  repondreOffre,
  retirerOffre,
  signalerIncident,
  totalConfirme,
} from "@/lib/dossiers";
import { Bien } from "@/lib/mock-data";
import ParcoursContrat from "@/components/ParcoursContrat";
import { popup } from "@/lib/popup";
import LaisserAvis from "@/components/LaisserAvis";
import { IconeStatut } from "@/components/Statut";

const INCIDENTS = { litigieux: "Dossier en litige", resilie: "Dossier résilié" };

export default function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, pret } = useAuth();
  const biens = useBiens(true);
  const dossiers = useStocke(lireDossiers, []);
  const dossier = dossiers.find((d) => d.id === id);
  const bien = dossier ? biens.find((b) => b.id === dossier.bienId) : undefined;

  useEffect(() => {
    if (pret && !user) router.replace("/connexion");
  }, [pret, user, router]);

  if (!pret || !user) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">Chargement…</div>;
  }
  if (!dossier || !bien) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">Dossier introuvable.</div>;
  }
  if (user.role === "acheteur" && dossier.acheteurEmail !== user.email) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">Ce dossier ne vous appartient pas.</div>;
  }
  return <Contenu dossierId={dossier.id} bien={bien} />;
}

function Contenu({ dossierId, bien }: { dossierId: string; bien: Bien }) {
  const router = useRouter();
  const { user } = useAuth();
  const dossiers = useStocke(lireDossiers, lireDossiers());
  const dossier = dossiers.find((d) => d.id === dossierId)!;
  const p = useParametres();
  const { verifie } = useVerificationTF(bien);
  const peutAvancer = usePeut(user!.role, "dossier_avancer");
  const peutDeposer = usePeut(user!.role, "dossier_documents");
  const peutRepondreOffres = usePeut(user!.role, "offre_repondre");
  const peutEnregistrer = usePeut(user!.role, "tf_enregistrement");

  const [montant, setMontant] = useState("");
  const [acompte, setAcompte] = useState("");
  const [delai, setDelai] = useState("");
  const [conditionsNego, setConditionsNego] = useState("");
  const [messageNego, setMessageNego] = useState("");
  const [notes, setNotes] = useState(dossier.notes ?? "");
  const [notesOk, setNotesOk] = useState(false);

  const role = user!.role;
  const estNotaire = role === "notaire" || role === "admin";
  // Vendeur particulier, agence ou agent : même côté de la négociation.
  const coteVendeur = estCoteVendeur(role);
  const prix = prixRetenu(dossier, bien);
  const frais = calculerFrais(prix, p);
  const commission = commissionVente(prix, p);
  const acompteDu = montantAcompte(dossier, bien, p.acompteMin);
  const verse = totalConfirme(dossier);
  const joursDGID = joursRestantsDGID(dossier);
  const prochaineEtape = ETAPES_DOSSIER[ETAPES_DOSSIER.indexOf(dossier.statut) + 1];
  const notaire = notaireParSlug(dossier.notaireSlug);
  const manque = conditionsTransition(dossier, verifie, { vendeur: bien.agence, notaire: notaire?.nom });
  if (prochaineEtape === "enregistrement_dgid" && !peutEnregistrer) manque.push("Habilitation « Déclencher l'enregistrement DGID »");
  const documents = documentsDossier(dossier, verifie, bien.tf.numero);
  const auteurOffre = coteVendeur ? "agence" : "acheteur";
  const nbContreOffres = dossier.offres.filter((o) => o.auteur === "agence").length;
  const limiteAtteinte = auteurOffre === "agence" && nbContreOffres >= p.maxContreOffres;
  const accord = dossier.offres.some((o) => o.statut === "acceptee");
  const signatureOuverte = p.flags.signature && dossier.statut === "en_signature";
  const paiementPossible = role === "acheteur" && accord && verse < prix;

  function soumettreOffre(e: React.FormEvent) {
    e.preventDefault();
    if (!montant.trim()) return;
    ajouterOffre(dossierId, {
      auteur: auteurOffre,
      montant: Number(montant),
      acompte: acompte || undefined,
      delai: delai || undefined,
      conditions: conditionsNego || undefined,
      message: messageNego || undefined,
      statut: "en_attente",
    });
    setMontant("");
    setAcompte("");
    setDelai("");
    setConditionsNego("");
    setMessageNego("");
  }

  function contacter(avec: "agence" | "notaire") {
    const conversation = obtenirConversation({
      sujet: bien.titre,
      bienId: bien.id,
      dossierId,
      acheteurEmail: dossier.acheteurEmail,
      acheteurNom: dossier.acheteurNom,
      avec,
      interlocuteurNom: avec === "notaire" ? (notaire?.nom ?? "Notaire") : bien.agence,
    });
    router.push(`/messages?c=${conversation.id}`);
  }

  const parties = [
    { initiales: dossier.acheteurNom[0]?.toUpperCase(), nom: dossier.acheteurNom, role: "Acheteur" },
    { initiales: bien.agence[0], nom: bien.agence, role: "Vendeur" },
    ...(notaire ? [{ initiales: notaire.initiales, nom: notaire.nom, role: "Notaire instrumentaire" }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href={`/annonces/${bien.id}`} className="text-sm text-blue hover:underline mb-4 inline-block">
        ← {bien.titre}
      </Link>

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="titre-page">Dossier #{referenceDossier(dossier)}</h1>
          <p className="text-gray-500 text-sm">
            {bien.titre} · {formatFCFA(prix)} · Ouvert le {new Date(dossier.dateOuverture).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {signatureOuverte && (
            <Link href={`/dossiers/${dossierId}/signature`} className="btn-primary text-sm flex items-center gap-2">
              <PenLine size={15} /> Signer l&apos;acte
            </Link>
          )}
          {paiementPossible && (
            <Link href={`/dossiers/${dossierId}/paiement`} className="btn-navy text-sm flex items-center gap-2">
              <CreditCard size={15} /> Paiement séquestre
            </Link>
          )}
          <Link
            href="/calendrier"
            className="border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <CalendarDays size={15} /> Calendrier
          </Link>
        </div>
      </div>

      {dossier.incident && <div className="mb-6 text-sm font-semibold px-4 py-3 rounded-lg bg-red/10 text-red">{INCIDENTS[dossier.incident]}</div>}

      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-900 mb-3">Parcours du contrat</h2>
        <ParcoursContrat statut={dossier.statut} />
        {joursDGID !== null && (
          <div className={`mt-4 text-sm font-semibold px-3 py-2 rounded-lg ${joursDGID <= p.alerteDGID2 ? "bg-red/10 text-red" : "bg-gold/10 text-navy-dark"}`}>
            {joursDGID >= 0
              ? `J-${joursDGID} avant l'échéance d'enregistrement DGID (${new Date(dossier.dateLimiteDGID!).toLocaleDateString("fr-FR")}). Pénalité de +${p.penaliteRetard}% sur les droits passé ce délai, soit ${formatFCFA(frais.penaliteRetard)}.`
              : `Délai DGID dépassé de ${Math.abs(joursDGID)} jours. Pénalité estimée : ${formatFCFA(frais.penaliteRetard)}.`}
          </div>
        )}
        {estNotaire && peutAvancer && prochaineEtape && (
          <div className="mt-4 border-t border-gray-100 pt-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm">
              <div className="font-semibold text-gray-800">Prochaine transition : {LABELS_ETAPE[prochaineEtape]}</div>
              {manque.length > 0 && (
                <ul className="text-xs text-red mt-1 flex flex-col gap-0.5">
                  {manque.map((m) => (
                    <li key={m}>En attente : {m}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              disabled={manque.length > 0}
              onClick={() => avancerEtape(dossierId)}
              className="btn-navy text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Faire avancer →
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Négociation</h2>
            {dossier.offres.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">Aucune offre pour le moment.</p>
            ) : (
              <div className="flex flex-col gap-3 mb-4">
                {dossier.offres.map((o) => {
                  const jours = joursAvantExpiration(o, p.validiteOffre);
                  const expiree = o.statut === "en_attente" && jours < 0;
                  const peutRepondre =
                    o.statut === "en_attente" &&
                    !expiree &&
                    ((coteVendeur && o.auteur === "acheteur" && peutRepondreOffres) || (role === "acheteur" && o.auteur === "agence"));
                  const peutRetirer =
                    o.statut === "en_attente" && !expiree && ((role === "acheteur" && o.auteur === "acheteur") || (coteVendeur && o.auteur === "agence"));
                  const decote = ((bien.prix - o.montant) / bien.prix) * 100;
                  return (
                    <div key={o.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase">
                          {o.auteur === "acheteur" ? "Acheteur" : "Vendeur"} · {new Date(o.date).toLocaleDateString("fr-FR")}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            o.statut === "acceptee"
                              ? "bg-green/10 text-green"
                              : o.statut === "refusee" || expiree
                                ? "bg-red/10 text-red"
                                : o.statut === "retiree"
                                  ? "bg-gray-100 text-gray-500"
                                  : "bg-gold/20 text-navy-dark"
                          }`}
                        >
                          {o.statut === "acceptee"
                            ? "Acceptée"
                            : o.statut === "refusee"
                              ? "Refusée"
                              : o.statut === "retiree"
                                ? "Retirée"
                                : expiree
                                  ? "Expirée"
                                  : `Expire dans ${jours} j`}
                        </span>
                      </div>
                      <div className="font-bold text-navy">{formatFCFA(o.montant)}</div>
                      <p className="text-xs text-gray-400">
                        {o.acompte && <>Acompte {o.acompte} · </>}
                        {o.delai && <>Délai {o.delai} · </>}
                        {o.financement && <>{o.financement} · </>}
                        {o.conditions}
                      </p>
                      {coteVendeur && decote > p.decoteMax && (
                        <p className="text-xs text-red font-semibold mt-1">
                          <IconeStatut type="attention" herite />
                          Décote de {decote.toFixed(1)} % par rapport au prix affiché
                        </p>
                      )}
                      {o.message && <p className="text-sm text-gray-600 mt-1">{o.message}</p>}
                      {peutRepondre && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => repondreOffre(dossierId, o.id, "acceptee")}
                            className="text-xs font-semibold px-3 py-1 rounded-lg bg-green text-white"
                          >
                            Accepter
                          </button>
                          <button
                            onClick={() => repondreOffre(dossierId, o.id, "refusee")}
                            className="text-xs font-semibold px-3 py-1 rounded-lg border border-gray-200 text-gray-600"
                          >
                            Refuser
                          </button>
                        </div>
                      )}
                      {peutRetirer && (
                        <button
                          onClick={() => {
                            popup
                              .confirmer("Retirer cette offre ?", "L'autre partie ne pourra plus l'accepter.", { libelleOk: "Retirer", danger: true })
                              .then((oui) => oui && retirerOffre(dossierId, o.id));
                          }}
                          className="text-xs font-semibold text-gray-500 hover:text-red mt-2"
                        >
                          Retirer mon offre
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {accord ? (
              <p className="text-sm font-semibold text-green border-t border-gray-100 pt-4">
                <IconeStatut type="ok" />
                Accord trouvé à {formatFCFA(prix)}.
              </p>
            ) : limiteAtteinte ? (
              <p className="text-sm text-gray-500 border-t border-gray-100 pt-4">
                Limite de {p.maxContreOffres} contre-offres atteinte : acceptez ou refusez la dernière offre.
              </p>
            ) : coteVendeur && !peutRepondreOffres ? (
              <p className="text-sm text-gray-500 border-t border-gray-100 pt-4">
                Votre rôle n&apos;est pas habilité à répondre aux offres. Contactez l&apos;administrateur.
              </p>
            ) : (
              (role === "acheteur" || coteVendeur) && (
                <form onSubmit={soumettreOffre} className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700">
                    {coteVendeur ? `Faire une contre-offre (${nbContreOffres}/${p.maxContreOffres})` : "Nouvelle offre"}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      placeholder="Montant (FCFA)"
                      value={montant}
                      onChange={(e) => setMontant(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                    <input
                      placeholder="Acompte (%)"
                      value={acompte}
                      onChange={(e) => setAcompte(e.target.value)}
                      className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="Délai souhaité"
                      value={delai}
                      onChange={(e) => setDelai(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                    <input
                      placeholder="Conditions"
                      value={conditionsNego}
                      onChange={(e) => setConditionsNego(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                  </div>
                  <textarea
                    placeholder="Message (optionnel)"
                    value={messageNego}
                    onChange={(e) => setMessageNego(e.target.value)}
                    rows={2}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy resize-none"
                  />
                  <button type="submit" className="btn-navy text-sm self-start">
                    Envoyer
                  </button>
                </form>
              )
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="font-bold text-gray-900">Documents du dossier</h2>
              {peutDeposer && (
                <label className="text-sm text-blue font-medium hover:underline cursor-pointer flex items-center gap-1">
                  <Upload size={14} /> Ajouter une pièce
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) ajouterPiece(dossierId, f.name, user!.nom);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {documents.map((d) => (
                <div key={d.nom} className="flex items-center justify-between gap-3 text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800">
                      <IconeStatut type={d.disponible ? "ok" : "attente"} /> {d.nom}
                    </div>
                    <div className="text-xs text-gray-400">{d.detail}</div>
                  </div>
                  {d.disponible && (
                    <BoutonPDF
                      taille="petit"
                      libelle="PDF"
                      titre={`Télécharger ${d.nom} en PDF`}
                      onClick={() =>
                        exporterPDF(`${d.nom}_${referenceDossier(dossier)}`, {
                          titre: d.nom,
                          sousTitre: `Dossier n° ${referenceDossier(dossier)}`,
                          avertissement: "Document de démonstration, sans valeur juridique.",
                          sections: [
                            {
                              titre: "Informations du dossier",
                              champs: [
                                { label: "Bien", valeur: bien.titre },
                                { label: "Localisation", valeur: `${bien.quartier}, ${bien.ville}` },
                                { label: "Titre Foncier", valeur: bien.tf.numero || "Non renseigné" },
                                { label: "Prix convenu", valeur: formatFCFA(prix) },
                                { label: "Acheteur", valeur: dossier.acheteurNom },
                                { label: "Vendeur", valeur: bien.agence },
                                { label: "Notaire", valeur: notaire?.nom ?? "Non désigné" },
                                { label: "Ouvert le", valeur: new Date(dossier.dateOuverture).toLocaleDateString("fr-FR") },
                              ],
                            },
                          ],
                        })
                      }
                    />
                  )}
                </div>
              ))}
              {(dossier.pieces ?? []).map((f) => (
                <div key={f.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <div className="font-semibold text-gray-800 break-all">{f.nom}</div>
                  <div className="text-xs text-gray-400">
                    {f.auteur} · {new Date(f.date).toLocaleDateString("fr-FR")} · nom du fichier seulement, non transmis dans cette démo
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Historique du dossier</h2>
            <div className="flex flex-col gap-2">
              {dossier.evenements.map((e) => (
                <div key={e.id} className="text-sm text-gray-600 flex items-center justify-between gap-4">
                  <span>{e.libelle}</span>
                  <span className="text-xs text-gray-400 shrink-0">{new Date(e.date).toLocaleDateString("fr-FR")}</span>
                </div>
              ))}
            </div>
          </div>

          {role === "acheteur" && ETAPES_DOSSIER.indexOf(dossier.statut) >= ETAPES_DOSSIER.indexOf("actif") && (
            <LaisserAvis
              dossierId={dossierId}
              auteurEmail={user!.email}
              nomComplet={user!.nom}
              notaire={notaire ? { slug: notaire.slug, nom: notaire.nom } : undefined}
              agence={bien.agence_slug ? { slug: bien.agence_slug, nom: bien.agence } : undefined}
            />
          )}

          {estNotaire && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-3">Notes internes</h2>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesOk(false);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy resize-none"
              />
              <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                <button
                  onClick={() => {
                    enregistrerNotes(dossierId, notes);
                    setNotesOk(true);
                  }}
                  className="btn-navy text-sm"
                >
                  Enregistrer
                </button>
                {notesOk && <span className="text-xs text-green font-semibold">Notes enregistrées</span>}
                <div className="flex gap-2">
                  <button
                    onClick={() => signalerIncident(dossierId, dossier.incident === "litigieux" ? undefined : "litigieux")}
                    className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    {dossier.incident === "litigieux" ? "Lever le litige" : "Signaler un litige"}
                  </button>
                  <button
                    onClick={() => {
                      popup
                        .confirmer("Résilier ce dossier ?", "Le bien sera remis en vente et le dossier ne pourra plus avancer.", {
                          libelleOk: "Résilier",
                          danger: true,
                        })
                        .then((oui) => oui && signalerIncident(dossierId, "resilie"));
                    }}
                    disabled={dossier.incident === "resilie"}
                    className="text-xs font-semibold px-3 py-2 rounded-lg border border-red/30 text-red hover:bg-red/5 disabled:opacity-50"
                  >
                    Résilier
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Parties du dossier</h2>
            <div className="flex flex-col gap-3">
              {parties.map((x) => (
                <div key={x.role} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-navy/10 text-navy font-bold text-xs flex items-center justify-center shrink-0">{x.initiales}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{x.nom}</div>
                    <div className="text-xs text-gray-400">{x.role}</div>
                  </div>
                </div>
              ))}
            </div>
            {!notaire && (
              <label className="block text-xs font-semibold text-gray-600 mt-3">
                Mandater un notaire
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const n = NOTAIRES.find((x) => x.slug === e.target.value);
                    if (n) choisirNotaire(dossierId, n.slug, n.nom);
                  }}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm font-normal mt-1 outline-none focus:border-navy"
                >
                  <option value="">Choisir…</option>
                  {NOTAIRES.map((n) => (
                    <option key={n.slug} value={n.slug}>
                      {n.nom}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex flex-col gap-2 mt-3">
              {role === "acheteur" && (
                <button onClick={() => contacter("agence")} className="text-sm text-blue font-medium hover:underline flex items-center gap-1">
                  <MessageSquare size={14} /> Écrire au vendeur
                </button>
              )}
              {!estNotariat(role) && notaire && (
                <button onClick={() => contacter("notaire")} className="text-sm text-blue font-medium hover:underline flex items-center gap-1">
                  <MessageSquare size={14} /> Écrire au notaire
                </button>
              )}
              {estNotariat(role) && (
                <button onClick={() => contacter("notaire")} className="text-sm text-blue font-medium hover:underline flex items-center gap-1">
                  <MessageSquare size={14} /> Écrire à l&apos;acheteur
                </button>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">{coteVendeur ? "Net vendeur" : "Récapitulatif financier"}</h2>
            <dl className="text-sm flex flex-col gap-2">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">{accord ? "Prix convenu" : "Prix affiché"}</dt>
                <dd className="font-semibold text-right">{formatFCFA(prix)}</dd>
              </div>
              {coteVendeur ? (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Commission KEUR BI</dt>
                    <dd className="font-semibold text-right">−{formatFCFA(commission)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-gray-100 pt-2">
                    <dt className="font-bold text-navy">Total net vendeur</dt>
                    <dd className="font-bold text-navy text-right">{formatFCFA(prix - commission)}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Honoraires notaire HT</dt>
                    <dd className="font-semibold text-right">{formatFCFA(frais.honoraires)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">TVA {p.tvaHonoraires}%</dt>
                    <dd className="font-semibold text-right">{formatFCFA(frais.tva)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Droits DGID ({p.droitsEnregistrement}%)</dt>
                    <dd className="font-semibold text-right">{formatFCFA(frais.droits)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Publicité foncière et mutation</dt>
                    <dd className="font-semibold text-right">{formatFCFA(frais.publicite + frais.mutation)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-gray-100 pt-2">
                    <dt className="font-bold text-navy">Total estimé</dt>
                    <dd className="font-bold text-navy text-right">{formatFCFA(frais.totalAcquisition)}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Suivi des paiements</h2>
            <dl className="text-sm flex flex-col gap-2 mb-3">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Acompte attendu</dt>
                <dd className="font-semibold text-right">{formatFCFA(acompteDu)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Confirmé en séquestre</dt>
                <dd className="font-semibold text-right">{formatFCFA(verse)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Solde restant</dt>
                <dd className="font-semibold text-right">{formatFCFA(Math.max(prix - verse, 0))}</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-2">
              {(dossier.paiements ?? []).map((x) => (
                <div key={x.id} className="text-xs bg-gray-50 rounded-lg p-2">
                  <div className="font-semibold text-gray-800">
                    {formatFCFA(x.montant)} · {x.statut === "confirme" ? "✓ Confirmé" : "À confirmer"}
                  </div>
                  <div className="text-gray-400 break-all">
                    {LABELS_MOYEN[x.moyen]} · {x.reference}
                  </div>
                  {estNotaire && x.statut === "declare" && (
                    <button onClick={() => confirmerPaiement(dossierId, x.id)} className="text-blue font-semibold hover:underline mt-1">
                      Confirmer la réception
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Titre Foncier</h2>
            <dl className="text-sm flex flex-col gap-2">
              <div className="flex justify-between">
                <dt className="text-gray-500">Numéro TF</dt>
                <dd className="font-semibold">{bien.tf.numero ?? "En attente"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Conservation</dt>
                <dd className="font-semibold">{bien.tf.conservation ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Superficie cadastrale</dt>
                <dd className="font-semibold">{bien.tf.superficie_cadastrale ? `${bien.tf.superficie_cadastrale} m²` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Prix au m²</dt>
                <dd className="font-semibold">{formatPrix(Math.round(prix / bien.superficie))}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
