"use client";
import { useEffect } from "react";
import { signalerErreur } from "@/lib/rapport-erreurs";

// Écoute les erreurs qui échappent au code (bug d'un script, promesse rejetée sans traitement)
// et les transmet au journal technique du serveur.
export default function RapportErreurs() {
  useEffect(() => {
    const surErreur = (e: ErrorEvent) => {
      // Les erreurs de scripts d'extensions ou d'autres sites n'ont pas de détail utile : on les ignore.
      if (!e.error && e.message === "Script error.") return;
      signalerErreur(e.error ?? e.message, "erreur-script");
    };
    const surRejet = (e: PromiseRejectionEvent) => signalerErreur(e.reason, "promesse-rejetee");
    window.addEventListener("error", surErreur);
    window.addEventListener("unhandledrejection", surRejet);
    return () => {
      window.removeEventListener("error", surErreur);
      window.removeEventListener("unhandledrejection", surRejet);
    };
  }, []);
  return null;
}
