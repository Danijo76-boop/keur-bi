"use client";
import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { versConnexion } from "@/lib/acces";

/* ── Actions réservées aux personnes connectées ──
   Un visiteur peut consulter les annonces, mais pas agir dessus. Quand il clique sur une action,
   il est envoyé vers la connexion (ou la création de compte), qui le ramène ensuite sur la même page.
   Renvoie une fonction : vrai si la personne est connectée et peut continuer, faux sinon (la redirection est lancée). */
export function useExigeCompte() {
  const { user } = useAuth();
  const router = useRouter();
  const chemin = usePathname();
  return useCallback(
    (e?: { preventDefault(): void; stopPropagation(): void }) => {
      if (user) return true;
      e?.preventDefault();
      e?.stopPropagation();
      router.push(versConnexion(chemin + window.location.search));
      return false;
    },
    [user, router, chemin],
  );
}
