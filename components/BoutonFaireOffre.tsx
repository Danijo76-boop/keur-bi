"use client";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Bien } from "@/lib/mock-data";
import { lireDossiers } from "@/lib/dossiers";

export default function BoutonFaireOffre({
  bien,
  className,
  children,
}: {
  bien: Bien;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuth();

  function ouvrir() {
    if (!user) {
      router.push("/connexion");
      return;
    }
    const existant = lireDossiers().find((d) => d.bienId === bien.id && d.acheteurEmail === user.email);
    router.push(existant ? `/dossiers/${existant.id}` : `/annonces/${bien.id}/offre`);
  }

  return (
    <button type="button" onClick={ouvrir} className={className}>
      {children}
    </button>
  );
}
