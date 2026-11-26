"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ROLE_LABELS, useAuth, type Role } from "@/lib/auth";

type Demande = { role: Role; statut: "en_attente" | "acceptee" | "refusee"; motifRefus: string | null };

// Où en est la demande de profil professionnel faite à l'inscription.
export default function BandeauDemandeProfil() {
  const { user } = useAuth();
  const [demande, setDemande] = useState<Demande | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/demande-profil", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDemande(d?.demande ?? null))
      .catch(() => {});
  }, [user]);

  if (!demande || demande.statut === "acceptee") return null;
  const profil = ROLE_LABELS[demande.role];
  return demande.statut === "en_attente" ? (
    <p role="status" className="text-sm bg-gold/10 border border-gold/30 text-navy-dark rounded-lg px-4 py-3 mb-6">
      Votre demande de profil <strong>{profil}</strong> est en cours de vérification par l&apos;équipe KEUR GUI. En attendant, vous pouvez déjà consulter les
      annonces et utiliser votre compte comme acheteur.
    </p>
  ) : (
    <p role="status" className="text-sm bg-red/5 border border-red/20 text-gray-800 rounded-lg px-4 py-3 mb-6">
      Votre demande de profil <strong>{profil}</strong> n&apos;a pas été acceptée{demande.motifRefus ? ` : ${demande.motifRefus}` : "."}{" "}
      <Link href={`/contact?sujet=${encodeURIComponent(`Demande de profil ${profil}`)}`} className="text-blue font-semibold hover:underline">
        Contacter l&apos;équipe
      </Link>
    </p>
  );
}
