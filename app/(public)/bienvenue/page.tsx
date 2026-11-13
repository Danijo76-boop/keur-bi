"use client";
import { useState } from "react";
import Link from "next/link";
import { useBiens } from "@/lib/annonces";
import { NOTAIRES } from "@/lib/notaires";
import { useStocke } from "@/lib/stockage";
import { lireDemandesTF, lireOverridesTF, statutTF } from "@/lib/tf";

const PROFILS = [
  { role: "acheteur", icone: "🏠", titre: "Acheteur", desc: "Je cherche un terrain" },
  { role: "vendeur", icone: "🔑", titre: "Vendeur particulier", desc: "Je vends mon propre bien" },
  { role: "agence", icone: "🤝", titre: "Agence ou promoteur", desc: "Je vends pour des clients" },
  { role: "notaire", icone: "🏛", titre: "Notaire", desc: "Je gère des dossiers" },
];

export default function BienvenuePage() {
  const biens = useBiens();
  const overrides = useStocke(lireOverridesTF, []);
  const demandes = useStocke(lireDemandesTF, []);
  const [role, setRole] = useState("acheteur");

  const chiffres = [
    { val: biens.length, label: "Annonces" },
    { val: biens.filter((b) => statutTF(b, overrides, demandes) === "verifie").length, label: "TF vérifiés" },
    { val: NOTAIRES.length, label: "Notaires" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 -mb-16" style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #1B4F72 60%, #2E86AB 100%)" }}>
      <div className="w-full max-w-md text-white text-center">
        <h1 className="text-4xl font-extrabold">KEUR<span className="text-gold">BI</span></h1>
        <p className="text-white/70 mb-6">Votre maison, au Sénégal</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {chiffres.map((c) => (
            <div key={c.label} className="bg-white/10 rounded-xl py-3">
              <div className="text-xl font-bold text-gold">{c.val}</div>
              <div className="text-xs text-white/70">{c.label}</div>
            </div>
          ))}
        </div>
        <h2 className="font-semibold mb-3 text-left">Je suis…</h2>
        <div className="flex flex-col gap-2 mb-6" role="radiogroup" aria-label="Votre profil">
          {PROFILS.map((p) => (
            <button
              key={p.role}
              role="radio"
              aria-checked={role === p.role}
              onClick={() => setRole(p.role)}
              className={`flex items-center gap-3 text-left rounded-xl p-4 border-2 transition-colors ${role === p.role ? "bg-white text-navy-dark border-gold" : "bg-white/5 border-white/20 hover:bg-white/10"}`}
            >
              <span className="text-2xl" aria-hidden>{p.icone}</span>
              <span>
                <span className="block font-bold">{p.titre}</span>
                <span className={`block text-sm ${role === p.role ? "text-gray-500" : "text-white/60"}`}>{p.desc}</span>
              </span>
            </button>
          ))}
        </div>
        <Link href={`/connexion?mode=inscription&role=${role}`} className="btn-primary block">Commencer →</Link>
        <p className="text-sm text-white/70 mt-4">
          Déjà inscrit ? <Link href={`/connexion?role=${role}`} className="text-gold font-semibold hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
