"use client";
import { CheckCircle } from "@/components/icones";
import { Bien } from "@/lib/mock-data";
import { LABELS_TF, useVerificationTF } from "@/lib/tf";
import { IconeTF } from "@/components/Statut";

const COULEURS = {
  en_verification: "bg-gold text-navy-dark",
  non_verifie: "bg-gray-600 text-white",
  invalide: "bg-red text-white",
};

export default function TFBadge({
  bien,
  size = 11,
  texte = "TF Vérifié",
  className = "bg-green text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1",
}: {
  bien: Bien;
  size?: number;
  texte?: string;
  className?: string;
}) {
  const { statut } = useVerificationTF(bien);
  if (statut === "verifie") {
    return (
      <span className={className}>
        <CheckCircle size={size} /> {texte}
      </span>
    );
  }
  return (
    <span className={`${COULEURS[statut]} text-xs font-semibold px-2 py-0.5 rounded-full`}>
      <IconeTF statut={statut} herite taille={13} />
      {LABELS_TF[statut]}
    </span>
  );
}
