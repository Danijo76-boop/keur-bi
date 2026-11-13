"use client";
import { ReactNode } from "react";
import Protege from "@/components/Protege";

// Espace connecté : tout ce qui se trouve dans ce dossier exige une session.
// La garde est posée ici une fois pour toutes, plutôt que répétée dans chaque page.
export default function EspaceLayout({ children }: { children: ReactNode }) {
  return <Protege>{() => <>{children}</>}</Protege>;
}
