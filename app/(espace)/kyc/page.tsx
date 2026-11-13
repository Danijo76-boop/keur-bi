"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { User, estCoteVendeur } from "@/lib/auth";
import { useStocke } from "@/lib/stockage";
import { DossierKYC, majUtilisateur, soumettreKYC, trouverUtilisateur } from "@/lib/utilisateurs";
import { useParametres } from "@/lib/parametres";
import BandeauDemo from "@/components/BandeauDemo";
import Protege from "@/components/Protege";

const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal";
const libelle = "text-sm font-semibold text-gray-700";
const ETAPES = [
  { titre: "Identité & document", desc: "CNI / Passeport" },
  { titre: "Selfie de contrôle", desc: "Photo avec votre document" },
  { titre: "Justificatif de domicile", desc: "Facture ou contrat de bail" },
  { titre: "Validation", desc: "Revue par notre équipe" },
];

function ChampFichier({ label, valeur, onChange, accept = "image/*,.pdf", camera }: { label: string; valeur?: string; onChange: (nom: string) => void; accept?: string; camera?: boolean }) {
  return (
    <label className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${valeur ? "border-green-light bg-green/5" : "border-gray-200 hover:border-navy"}`}>
      <span className="block text-sm font-semibold text-gray-700">{label}</span>
      <span className="block text-xs text-gray-400 mt-1 break-all">{valeur ? `✅ ${valeur}` : "Cliquez pour choisir un fichier (JPG, PNG, PDF, max 5 Mo)"}</span>
      <input
        type="file"
        accept={accept}
        capture={camera ? "user" : undefined}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && f.size <= 5_000_000) onChange(f.name);
        }}
      />
    </label>
  );
}

function Parcours({ user }: { user: User }) {
  const profil = useStocke(() => trouverUtilisateur(user.email), undefined, [user.email]);
  const p = useParametres();
  const [etape, setEtape] = useState(0);
  const [form, setForm] = useState<DossierKYC>({ nationalite: "Sénégalaise", typeDocument: "Carte Nationale d'Identité" });
  const [telephone, setTelephone] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    setTelephone((t) => t || profil?.telephone || "");
  }, [profil?.telephone]);

  const maj = (patch: Partial<DossierKYC>) => setForm((f) => ({ ...f, ...patch }));

  const valide = [
    form.dateNaissance && form.lieuNaissance && form.numeroDocument && form.recto && form.verso && telephone.trim(),
    form.selfie,
    form.justificatif,
  ];

  function suivant() {
    if (!valide[etape]) return setErreur("Merci de compléter cette étape.");
    setErreur("");
    if (etape === 2) {
      majUtilisateur(user.email, { telephone: telephone.trim() });
      soumettreKYC(user.email, form);
    }
    setEtape(etape + 1);
  }

  if (profil?.statutKYC === "verifie") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="card p-8 text-center">
          <p className="text-green font-semibold text-lg mb-1">✅ Identité vérifiée</p>
          <p className="text-sm text-gray-500 mb-4">Vous avez accès à toutes les fonctions de la plateforme.</p>
          <Link href="/profil" className="btn-navy text-sm inline-block">Voir mon profil</Link>
        </div>
      </div>
    );
  }

  if (profil?.statutKYC === "en_attente" || etape === 3) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="card p-8 text-center">
          <p className="text-navy font-semibold text-lg mb-1">⏳ Dossier en cours de revue</p>
          <p className="text-sm text-gray-500 mb-4">Traitement habituel sous {p.delaiKYC} heures. Vous pouvez déjà soumettre des offres si votre score le permet.</p>
          <Link href="/tableau-de-bord" className="btn-navy text-sm inline-block">Retour au tableau de bord</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy mb-1">Vérification de votre identité</h1>
      <p className="text-sm text-gray-500 mb-4">Cette étape protège acheteurs et vendeurs. Pièces demandées : {estCoteVendeur(user.role) ? p.docsVendeur : p.docsAcheteur}.</p>
      <BandeauDemo>Démo : aucune pièce n&apos;est envoyée ni conservée, seul le nom du fichier est enregistré dans ce navigateur. N&apos;utilisez pas de vrais documents.</BandeauDemo>
      {profil?.statutKYC === "rejete" && (
        <p className="text-sm font-semibold text-red bg-red/10 rounded-lg px-3 py-2 mb-4">Dossier précédent rejeté{profil.kyc?.motifRejet ? ` : ${profil.kyc.motifRejet}` : ""}. Merci de le soumettre à nouveau.</p>
      )}

      <div className="grid md:grid-cols-[15rem_1fr] gap-6">
        <ol className="card p-4 flex flex-col gap-3 h-fit">
          {ETAPES.map((e, i) => (
            <li key={e.titre} aria-current={i === etape ? "step" : undefined} className="flex items-start gap-3">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${i < etape ? "bg-green text-white" : i === etape ? "bg-navy text-white" : "bg-gray-100 text-gray-400"}`}>{i < etape ? "✓" : i + 1}</span>
              <span>
                <span className="block text-sm font-semibold text-gray-800">{e.titre}</span>
                <span className="block text-xs text-gray-400">{e.desc}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="card p-6 flex flex-col gap-4">
          {etape === 0 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className={libelle}>Date de naissance *<input type="date" value={form.dateNaissance ?? ""} onChange={(e) => maj({ dateNaissance: e.target.value })} className={champ} /></label>
                <label className={libelle}>Lieu de naissance *<input value={form.lieuNaissance ?? ""} onChange={(e) => maj({ lieuNaissance: e.target.value })} placeholder="Dakar, Sénégal" className={champ} /></label>
                <label className={libelle}>Nationalité
                  <select value={form.nationalite} onChange={(e) => maj({ nationalite: e.target.value })} className={champ}><option>Sénégalaise</option><option>Autre</option></select>
                </label>
                <label className={libelle}>Téléphone *<input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+221 77 000 00 00" className={champ} /></label>
                <label className={libelle}>Type de document
                  <select value={form.typeDocument} onChange={(e) => maj({ typeDocument: e.target.value })} className={champ}>
                    <option>Carte Nationale d&apos;Identité</option>
                    <option>Passeport biométrique</option>
                    <option>Titre de séjour</option>
                  </select>
                </label>
                <label className={libelle}>Numéro de document *<input value={form.numeroDocument ?? ""} onChange={(e) => maj({ numeroDocument: e.target.value })} className={champ} /></label>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <ChampFichier label="Recto *" valeur={form.recto} onChange={(n) => maj({ recto: n })} />
                <ChampFichier label="Verso *" valeur={form.verso} onChange={(n) => maj({ verso: n })} />
              </div>
              <p className="text-xs text-gray-400">Photo nette, fond clair, sans reflet. Les 4 coins du document doivent être visibles.</p>
            </>
          )}
          {etape === 1 && (
            <>
              <h2 className="font-bold text-gray-900">Selfie de contrôle</h2>
              <ul className="text-sm text-gray-600 list-disc pl-5">
                <li>Visage bien éclairé, de face</li>
                <li>Pas de lunettes ni chapeau</li>
                <li>Tenez votre document à côté de votre visage</li>
              </ul>
              <ChampFichier label="Selfie *" valeur={form.selfie} accept="image/*" camera onChange={(n) => maj({ selfie: n })} />
            </>
          )}
          {etape === 2 && (
            <>
              <h2 className="font-bold text-gray-900">Justificatif de domicile</h2>
              <p className="text-sm text-gray-600">Facture ou contrat de bail de moins de 3 mois.</p>
              <ChampFichier label="Justificatif *" valeur={form.justificatif} onChange={(n) => maj({ justificatif: n })} />
            </>
          )}
          {erreur && <p className="text-red text-xs">{erreur}</p>}
          <div className="flex justify-between gap-3">
            <button type="button" disabled={etape === 0} onClick={() => setEtape(etape - 1)} className="border border-gray-200 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40">← Retour</button>
            <button type="button" onClick={suivant} className="btn-navy text-sm">{etape === 2 ? "Soumettre mon dossier" : "Continuer →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KycPage() {
  return <Protege>{(user) => <Parcours user={user} />}</Protege>;
}
