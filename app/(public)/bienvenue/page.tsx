"use client";
import Image from "next/image";
import Link from "next/link";
import { useBiens } from "@/lib/annonces";
import { NOTAIRES } from "@/lib/notaires";
import { useStocke } from "@/lib/stockage";
import { lireDemandesTF, lireOverridesTF, statutTF } from "@/lib/tf";

export default function BienvenuePage() {
  const biens = useBiens();
  const overrides = useStocke(lireOverridesTF, []);
  const demandes = useStocke(lireDemandesTF, []);

  const chiffres = [
    { val: biens.length, label: "Annonces" },
    { val: biens.filter((b) => statutTF(b, overrides, demandes) === "verifie").length, label: "TF vérifiés" },
    { val: NOTAIRES.length, label: "Notaires" },
  ];

  return (
    <div
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 -mb-16"
      style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #1B4F72 60%, #2E86AB 100%)" }}
    >
      <div className="w-full max-w-md text-white text-center">
        <Image src="/logo.png" alt="" width={96} height={96} priority className="w-24 h-24 mx-auto mb-4 rounded-3xl ring-1 ring-white/20 shadow-flottant" />
        <h1 className="titre-page text-white md:text-4xl">
          KEUR<span className="text-gold">GUI</span>
        </h1>
        <p className="text-white/70 mb-6">Votre maison, au Sénégal</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {chiffres.map((c) => (
            <div key={c.label} className="bg-white/10 rounded-xl py-3">
              <div className="text-xl font-bold text-gold">{c.val}</div>
              <div className="text-xs text-white/70">{c.label}</div>
            </div>
          ))}
        </div>
        <Link href="/connexion?mode=inscription" className="btn-primary block">
          Créer mon compte →
        </Link>
        <Link
          href="/connexion"
          className="block mt-3 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 font-semibold hover:bg-white/20 transition-colors"
        >
          Se connecter
        </Link>
        <p className="text-sm text-white/70 mt-6">
          Vendeur, agence, agent ou notaire ?{" "}
          <Link href="/contact?sujet=Activer%20mon%20profil%20professionnel" className="text-gold font-semibold hover:underline">
            Demandez votre profil professionnel
          </Link>
          , un administrateur le crée pour vous.
        </p>
      </div>
    </div>
  );
}
