"use client";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useParametres } from "@/lib/parametres";

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { flags } = useParametres();
  const { user } = useAuth();
  const chemin = usePathname();

  if (flags.maintenance && user?.role !== "admin" && chemin !== "/connexion") {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <Wrench size={36} className="text-gold mx-auto mb-4" />
        <h1 className="titre-page mb-2">Maintenance en cours</h1>
        <p className="text-gray-500 text-sm">KEUR BI revient très vite. Merci de votre patience.</p>
      </div>
    );
  }
  return <>{children}</>;
}
