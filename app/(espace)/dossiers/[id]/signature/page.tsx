"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBiens } from "@/lib/annonces";
import { User } from "@/lib/auth";
import { formatFCFA } from "@/lib/mock-data";
import { notaireParSlug } from "@/lib/notaires";
import { useStocke } from "@/lib/stockage";
import { lireDossiers, prixRetenu, referenceDossier, Signataire, signer, SIGNATAIRES, totalConfirme } from "@/lib/dossiers";
import { useVerificationTF } from "@/lib/tf";
import { useParametres } from "@/lib/parametres";
import { Bien } from "@/lib/mock-data";
import BandeauDemo from "@/components/BandeauDemo";
import Protege from "@/components/Protege";
import SiActif from "@/components/SiActif";

const LABELS: Record<Signataire, string> = { notaire: "Notaire", acheteur: "Acheteur", vendeur: "Vendeur" };

function Pad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dessin = useRef(false);

  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height };
  }

  function debut(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = position(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    dessin.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function trace(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dessin.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = position(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1B2A4A";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function fin(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dessin.current) return;
    dessin.current = false;
    onChange(e.currentTarget.toDataURL("image/png"));
  }

  function effacer() {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvas}
        width={520}
        height={160}
        aria-label="Zone de signature : dessinez votre signature"
        onPointerDown={debut}
        onPointerMove={trace}
        onPointerUp={fin}
        className="w-full h-36 border-2 border-dashed border-gray-300 rounded-lg bg-white touch-none cursor-crosshair"
      />
      <button type="button" onClick={effacer} className="text-xs text-gray-400 hover:text-red mt-1">✕ Effacer</button>
    </div>
  );
}

function Formulaire({ id, bien, user }: { id: string; bien: Bien; user: User }) {
  const dossiers = useStocke(lireDossiers, lireDossiers());
  const dossier = dossiers.find((d) => d.id === id)!;
  const { verifie } = useVerificationTF(bien);
  const p = useParametres();
  const [image, setImage] = useState<string | null>(null);
  const [lu, setLu] = useState(false);
  const [code, setCode] = useState("");
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState("");

  // L'agent et le clerc préparent le dossier mais ne signent pas : seuls le propriétaire ou le responsable d'agence
  // engagent le vendeur, et seul le notaire instrumente l'acte.
  const quiConnecte: Signataire | null =
    user.role === "acheteur" ? "acheteur" : user.role === "agence" || user.role === "vendeur" ? "vendeur" : user.role === "notaire" ? "notaire" : null;
  const notaire = notaireParSlug(dossier.notaireSlug);
  const nomPartie: Record<Signataire, string> = { notaire: notaire?.nom ?? "Notaire", acheteur: dossier.acheteurNom, vendeur: bien.agence };
  const prix = prixRetenu(dossier, bien);
  const dejaSigne = quiConnecte ? !!dossier.signatures?.[quiConnecte] : false;

  const conditions = [
    ...(p.flags.cadastre ? [{ label: "Titre Foncier vérifié", ok: verifie }] : []),
    { label: "Fonds confirmés en séquestre", ok: totalConfirme(dossier) > 0 },
    { label: "Dossier au stade de signature", ok: dossier.statut === "en_signature" },
  ];
  const pret = conditions.every((c) => c.ok);

  useEffect(() => {
    setCode("");
    setSaisie("");
  }, [image]);

  function envoyerCode() {
    // Sans passerelle SMS, le code est affiché à l'écran.
    setCode(String(Math.floor(100000 + Math.random() * 900000)));
    setErreur("");
  }

  function valider(e: React.FormEvent) {
    e.preventDefault();
    if (!quiConnecte || !image) return;
    if (saisie !== code) return setErreur("Code incorrect.");
    signer(id, quiConnecte, { nom: nomPartie[quiConnecte], date: new Date().toISOString(), image });
    setErreur("");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href={`/dossiers/${id}`} className="text-sm text-blue hover:underline mb-4 inline-block">← Retour au dossier</Link>
      <h1 className="text-2xl font-bold text-navy mb-1">Signature de l&apos;acte</h1>
      <p className="text-gray-500 text-sm mb-4">Dossier #{referenceDossier(dossier)} · Toutes les parties doivent signer pour finaliser la transaction.</p>
      <BandeauDemo>Parcours de démonstration : cette signature n&apos;a aucune valeur juridique. L&apos;acte authentique reste à signer devant le notaire.</BandeauDemo>

      <div className="grid lg:grid-cols-3 gap-6">
        <article className="lg:col-span-2 card p-8 text-sm text-gray-700 leading-relaxed">
          <h2 className="text-center font-bold text-gray-900 tracking-wide mb-1">PROJET D&apos;ACTE DE VENTE</h2>
          <p className="text-center text-xs text-gray-400 mb-6">{notaire?.etude ?? "Étude à désigner"} · {notaire?.ville ?? ""}</p>
          <dl className="flex flex-col gap-3 mb-6">
            <div><dt className="font-semibold text-gray-900">Vendeur</dt><dd>{nomPartie.vendeur}</dd></div>
            <div><dt className="font-semibold text-gray-900">Acheteur</dt><dd>{nomPartie.acheteur}</dd></div>
            <div><dt className="font-semibold text-gray-900">Bien immobilier</dt><dd>{bien.titre} · {bien.superficie.toLocaleString("fr-FR")} m² · {bien.quartier}, {bien.ville}</dd></div>
            <div><dt className="font-semibold text-gray-900">Titre Foncier</dt><dd>N° {bien.tf.numero ?? "en attente"} · Conservation {bien.tf.conservation ?? "—"}</dd></div>
            <div><dt className="font-semibold text-gray-900">Prix de vente convenu</dt><dd className="font-bold text-navy">{formatFCFA(prix)}</dd></div>
          </dl>
          <p className="text-xs text-gray-500 mb-4">Les parties reconnaissent avoir pris connaissance des clauses de cet acte et y adhèrent sans réserve.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {SIGNATAIRES.map((s) => {
              const sig = dossier.signatures?.[s];
              return (
                <div key={s} className="border border-gray-100 rounded-lg p-2 min-h-24">
                  <div className="text-xs font-semibold text-gray-500 mb-1">{LABELS[s]}</div>
                  {sig ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sig.image} alt={`Signature de ${sig.nom}`} className="h-12 w-full object-contain" />
                      <div className="text-[11px] text-green font-semibold">✓ {new Date(sig.date).toLocaleString("fr-FR")}</div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-400">{nomPartie[s]} · en attente</div>
                  )}
                </div>
              );
            })}
          </div>
        </article>

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3">Conditions préalables</h3>
            <ul className="text-sm flex flex-col gap-2">
              {conditions.map((c) => (
                <li key={c.label} className={c.ok ? "text-green" : "text-gray-500"}>{c.ok ? "✓" : "⏳"} {c.label}</li>
              ))}
            </ul>
          </div>

          {!quiConnecte ? (
            <div className="card p-5 text-sm text-gray-500">Votre rôle ne signe pas cet acte.</div>
          ) : dejaSigne ? (
            <div className="card p-5 text-sm font-semibold text-green">✅ Vous avez signé cet acte.</div>
          ) : !pret ? (
            <div className="card p-5 text-sm text-gray-500">La signature s&apos;ouvrira quand toutes les conditions seront remplies.</div>
          ) : (
            <form onSubmit={valider} className="card p-5 flex flex-col gap-3">
              <h3 className="font-bold text-gray-900">Votre signature</h3>
              <Pad onChange={setImage} />
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="accent-navy mt-0.5" checked={lu} onChange={(e) => setLu(e.target.checked)} />
                J&apos;ai lu et j&apos;approuve l&apos;intégralité de l&apos;acte de vente
              </label>
              {!code ? (
                <button type="button" disabled={!image || !lu} onClick={envoyerCode} className="btn-navy text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  Recevoir le code de confirmation
                </button>
              ) : (
                <>
                  <p className="text-xs bg-gray-50 rounded-lg p-2 text-gray-600">Démo, aucun SMS envoyé. Votre code : <strong className="text-navy">{code}</strong></p>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    required
                    aria-label="Code de confirmation à 6 chiffres"
                    placeholder="— — — — — —"
                    value={saisie}
                    onChange={(e) => setSaisie(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-center tracking-widest outline-none focus:border-navy"
                  />
                  {erreur && <p className="text-red text-xs">{erreur}</p>}
                  <button type="submit" className="btn-primary text-sm">🔐 Signer & valider</button>
                </>
              )}
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function SignaturePage() {
  const { id } = useParams<{ id: string }>();
  const biens = useBiens(true);
  const dossiers = useStocke(lireDossiers, []);
  const dossier = dossiers.find((d) => d.id === id);
  const bien = dossier ? biens.find((b) => b.id === dossier.bienId) : undefined;

  return (
    <SiActif flag="signature">
      <Protege>
        {(user) =>
          bien ? <Formulaire id={id} bien={bien} user={user} /> : <div className="py-16 text-center text-gray-400">Dossier introuvable.</div>
        }
      </Protege>
    </SiActif>
  );
}
