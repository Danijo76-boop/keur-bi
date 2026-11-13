"use client";
import { Bien } from "@/lib/mock-data";
import { ICONES_TF, LABELS_TF, useVerificationTF } from "@/lib/tf";

export default function TFCaracteristique({ bien }: { bien: Bien }) {
  const { statut } = useVerificationTF(bien);
  return <>{ICONES_TF[statut]} {LABELS_TF[statut]}</>;
}
