"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, ROLE_LABELS, estCoteVendeur, estNotariat, estPlateforme } from "@/lib/auth";
import { sectionsAdminOuvertes, useMatrice } from "@/lib/permissions";
import TableauAcheteur from "./TableauAcheteur";
import TableauAgence from "./TableauAgence";
import TableauNotaire from "./TableauNotaire";

export default function TableauDeBordPage() {
  const { user, pret } = useAuth();
  const router = useRouter();
  const matrice = useMatrice();
  // Retour de « Mot de passe oublié » : on confirme le changement, puis on nettoie l'adresse.
  const [mdpChange, setMdpChange] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mdp") === "change") {
      setMdpChange(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (pret && !user) router.replace("/connexion");
  }, [pret, user, router]);

  const sectionsAdmin = sectionsAdminOuvertes(matrice, user?.role);

  if (!pret || !user) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Chargement…</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Bonjour, {user.nom}</h1>
        <p className="text-gray-500 text-sm">Espace {ROLE_LABELS[user.role]}</p>
      </div>
      {mdpChange && (
        <p role="status" className="text-sm bg-green-50 border border-green-200 text-green-900 rounded-lg px-4 py-3 mb-6">
          Votre mot de passe a bien été changé. Par sécurité, vos autres appareils ont été déconnectés.
        </p>
      )}

      {user.role === "acheteur" && <TableauAcheteur user={user} />}
      {estCoteVendeur(user.role) && <TableauAgence user={user} />}
      {estNotariat(user.role) && <TableauNotaire />}
      {estPlateforme(user.role) && (
        <Link href={sectionsAdmin[0] ?? "/profil"} className="card p-8 block text-center text-navy font-semibold hover:shadow-md transition-shadow">
          Ouvrir l&apos;espace d&apos;administration →
        </Link>
      )}
    </div>
  );
}