"use client";
import Link from "next/link";
import { Shield, FileCheck } from "lucide-react";
import { Bien } from "@/lib/mock-data";
import { useVerificationTF, StatutTF } from "@/lib/tf";
import { useAuth } from "@/lib/auth";
import TFReportLauncher from "./TFReportLauncher";

const TEXTES: Record<StatutTF, { titre: string; desc: string; bord: string; icone: string }> = {
  verifie: {
    titre: "Titre Foncier vérifié ✅",
    desc: "Ce bien a été vérifié auprès de la DGID. Aucune hypothèque, aucun litige connu.",
    bord: "border-green",
    icone: "text-green-light",
  },
  en_verification: {
    titre: "Titre Foncier en cours de vérification ⏳",
    desc: "Le dossier est en cours d'examen. Réponse habituelle sous 3 à 7 jours ouvrés.",
    bord: "border-gold",
    icone: "text-gold",
  },
  non_verifie: {
    titre: "Titre Foncier non vérifié ○",
    desc: "Ce bien est en attente de vérification par un notaire partenaire. Renseignez-vous avant toute offre.",
    bord: "border-gray-300",
    icone: "text-gray-400",
  },
  invalide: {
    titre: "Titre Foncier invalide ❌",
    desc: "Une anomalie a été détectée (hypothèque, litige ou non-concordance du propriétaire). Ne faites pas d'offre avant régularisation.",
    bord: "border-red",
    icone: "text-red",
  },
};

export default function SuiviTF({ bien }: { bien: Bien }) {
  const { verifie, statut, basculer } = useVerificationTF(bien);
  const { user } = useAuth();
  const t = TEXTES[statut];

  return (
    <div className={`card p-5 mb-6 border-l-4 ${t.bord}`}>
      <div className="flex items-start gap-3">
        <Shield className={`shrink-0 mt-0.5 ${t.icone}`} size={20} />
        <div>
          <h3 className="font-bold text-gray-900 mb-1">{t.titre}</h3>
          <p className="text-sm text-gray-600">{t.desc}</p>
          {verifie && (
            <TFReportLauncher bien={bien} className="mt-3 text-sm text-blue font-medium hover:underline flex items-center gap-1">
              <FileCheck size={14} /> Voir le rapport de vérification TF
            </TFReportLauncher>
          )}
          {user?.role === "notaire" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={basculer} className="text-sm font-medium px-3 py-1.5 rounded-lg border border-navy text-navy hover:bg-navy/5">
                {verifie ? "Révoquer la vérification" : "Valider ce Titre Foncier"}
              </button>
              <Link href="/verification-tf" className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                Soumettre à la DGID
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
