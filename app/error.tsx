"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { codeErreur, signalerErreur } from "@/lib/rapport-erreurs";

// Affichée à la place d'une page qui a planté. L'erreur est transmise au journal technique avec un code,
// que la personne peut communiquer au support pour retrouver ce qui s'est passé.
export default function ErreurPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [code] = useState(codeErreur);
  useEffect(() => {
    signalerErreur(error, error.digest ? `page (digest ${error.digest})` : "page", code);
  }, [error, code]);

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="card p-8 text-center">
        <h1 className="text-xl font-bold text-navy mb-2">Une erreur est survenue</h1>
        <p className="text-sm text-gray-500 mb-1">Cette page n&apos;a pas pu s&apos;afficher. L&apos;incident a été signalé à notre équipe.</p>
        <p className="text-xs text-gray-400 mb-6">Code de l&apos;erreur : <span className="font-mono font-semibold text-gray-600">{code}</span></p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button onClick={reset} className="btn-navy text-sm">Réessayer</button>
          <Link href="/" className="border border-gray-200 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-50">Retour à l&apos;accueil</Link>
        </div>
      </div>
    </div>
  );
}
