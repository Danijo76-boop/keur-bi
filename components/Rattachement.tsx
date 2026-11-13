"use client";
import { useEffect, useState } from "react";
import { Role } from "@/lib/auth";
import { popup } from "@/lib/popup";
import { useStocke } from "@/lib/stockage";
import { majUtilisateur, trouverUtilisateur } from "@/lib/utilisateurs";

const TEXTES: Partial<Record<Role, { titre: string; libelle: string; aide: string }>> = {
  agent: { titre: "Mon agence", libelle: "Agence de rattachement", aide: "Vos annonces et vos dossiers sont suivis par le responsable de l'agence, qui signe les actes." },
  clerc: { titre: "Mon étude", libelle: "Étude notariale de rattachement", aide: "Vous préparez les dossiers ; seul le notaire fait avancer les étapes et signe." },
};

// Lien entre un collaborateur (agent, clerc) et la structure pour laquelle il travaille.
export default function Rattachement({ email, role }: { email: string; role: Role }) {
  const enregistre = useStocke(() => trouverUtilisateur(email)?.rattachement ?? "", "", [email]);
  const [valeur, setValeur] = useState("");
  const textes = TEXTES[role];

  useEffect(() => {
    setValeur(enregistre);
  }, [enregistre]);

  if (!textes) return null;

  return (
    <form
      className="card p-5 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        majUtilisateur(email, { rattachement: valeur.trim() || undefined });
        popup.succes("Rattachement enregistré", valeur.trim() || undefined);
      }}
    >
      <h2 className="font-bold text-gray-900 mb-2">{textes.titre}</h2>
      <label className="text-xs font-semibold text-gray-600 block">
        {textes.libelle}
        <input value={valeur} onChange={(e) => setValeur(e.target.value)} placeholder="Nom de la structure" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal mt-1 outline-none focus:border-navy" />
      </label>
      <p className="text-xs text-gray-400 mt-2">{textes.aide}</p>
      <button type="submit" disabled={valeur.trim() === enregistre} className="btn-navy text-sm mt-3 disabled:opacity-40">Enregistrer</button>
    </form>
  );
}
