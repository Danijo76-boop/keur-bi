"use client";
import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { estPagePublique, versConnexion } from "@/lib/acces";

// Seconde barrière, dans le navigateur : si la session a expiré ou vient d'être fermée,
// la page réservée est remplacée par la connexion au lieu de rester affichée.
export default function GardeVisiteur({ children }: { children: ReactNode }) {
  const { user, pret } = useAuth();
  const chemin = usePathname();
  const router = useRouter();
  const reservee = !estPagePublique(chemin);

  useEffect(() => {
    if (pret && !user && reservee) router.replace(versConnexion(chemin + window.location.search));
  }, [pret, user, reservee, chemin, router]);

  if (reservee && (!pret || !user)) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Chargement…</div>;
  }
  return <>{children}</>;
}
