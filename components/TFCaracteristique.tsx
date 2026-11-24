"use client";
import { Bien } from "@/lib/mock-data";
import { LABELS_TF, useVerificationTF } from "@/lib/tf";
import { IconeTF } from "@/components/Statut";

export default function TFCaracteristique({ bien }: { bien: Bien }) {
  const { statut } = useVerificationTF(bien);
  return (
    <>
      <IconeTF statut={statut} /> {LABELS_TF[statut]}
    </>
  );
}
