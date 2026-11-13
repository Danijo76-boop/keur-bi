"use client";
import { ReactNode } from "react";
import { Flags, useParametres } from "@/lib/parametres";

export default function SiActif({ flag, children, message }: { flag: keyof Flags; children: ReactNode; message?: string }) {
  const { flags } = useParametres();
  if (!flags[flag]) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-400">{message ?? "Cette fonctionnalité est actuellement désactivée par l'administrateur."}</div>;
  }
  return <>{children}</>;
}
