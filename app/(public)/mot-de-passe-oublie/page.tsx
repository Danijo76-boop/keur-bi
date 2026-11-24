"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, Lock, Mail } from "@/components/icones";
import { useAuth, motDePasseConforme } from "@/lib/auth";
import ReglesMotDePasse from "@/components/ReglesMotDePasse";

export default function MotDePasseOubliePage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-400">Chargement…</div>}>
      <Formulaire />
    </Suspense>
  );
}

const RENVOI_S = 30;

// Mot de passe oublié : 1. adresse email ; 2. code reçu (WhatsApp, SMS ou email) et nouveau mot de passe.
// Le serveur répond de la même façon que le compte existe ou non : la page ne dit jamais « adresse inconnue ».
function Formulaire() {
  const params = useSearchParams();
  const { reinitialiser } = useAuth();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [defi, setDefi] = useState<string | null>(null);
  const [codeDemo, setCodeDemo] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [attente, setAttente] = useState(0);

  useEffect(() => {
    if (attente <= 0) return;
    const t = setTimeout(() => setAttente((a) => a - 1), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  async function demanderCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (envoi) return;
    if (!email.trim()) return setErreur("Indiquez l'adresse email de votre compte.");
    setErreur("");
    setInfo("");
    setEnvoi(true);
    try {
      const r = await fetch("/api/auth/mot-de-passe-oublie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.defi) return setErreur(d.erreur ?? "Le service est momentanément indisponible. Réessayez.");
      if (defi) setInfo("Un nouveau code vient d'être envoyé. Seul le dernier code reçu est valable.");
      setDefi(d.defi);
      setCodeDemo(d.codeDemo);
      setCode("");
      setAttente(RENVOI_S);
    } catch {
      setErreur("Connexion au serveur impossible. Vérifiez votre accès Internet.");
    } finally {
      setEnvoi(false);
    }
  }

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    if (envoi || !defi) return;
    if (!/^\d{6}$/.test(code)) return setErreur("Saisissez les 6 chiffres du code reçu.");
    if (!motDePasseConforme(motDePasse, email.trim())) return setErreur("Le nouveau mot de passe ne respecte pas encore toutes les règles indiquées.");
    if (motDePasse !== confirmation) return setErreur("Les deux mots de passe ne sont pas identiques.");
    setErreur("");
    setInfo("");
    setEnvoi(true);
    const r = await reinitialiser(email.trim(), defi, code, motDePasse);
    setEnvoi(false);
    if (r.ok === true) {
      window.location.assign("/tableau-de-bord?mdp=change");
      return;
    }
    if (r.ok === false) {
      setErreur(r.erreur);
      setCode("");
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-navy/10 text-navy flex items-center justify-center">
          <KeyRound size={24} />
        </div>
        <h1 className="titre-page mb-1 text-center">Mot de passe oublié</h1>

        {!defi ? (
          <form onSubmit={demanderCode} className="flex flex-col gap-3">
            <p className="text-gray-500 text-sm text-center mb-3">
              Indiquez l&apos;adresse email de votre compte. Nous vous enverrons un code pour choisir un nouveau mot de passe, sur votre numéro WhatsApp vérifié
              (ou par SMS), sinon par email.
            </p>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-navy">
              <Mail size={16} className="text-gray-400 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse email"
                autoComplete="email"
                autoFocus
                className="w-full text-sm outline-none"
              />
            </div>
            {erreur && (
              <p role="alert" className="text-red text-xs">
                {erreur}
              </p>
            )}
            <button type="submit" disabled={envoi} className="btn-navy w-full mt-2 disabled:opacity-60">
              {envoi ? "Envoi…" : "Recevoir un code"}
            </button>
          </form>
        ) : (
          <form onSubmit={valider} className="flex flex-col gap-3">
            <p className="text-sm bg-blue/5 border border-blue/20 text-gray-700 rounded-lg px-3 py-2.5" role="status">
              Si un compte KEUR BI existe pour <strong className="break-all">{email.trim()}</strong>, un code à 6 chiffres vient d&apos;être envoyé sur son
              numéro WhatsApp vérifié (ou par SMS), sinon par email. Il expire dans 10 minutes.
            </p>
            {codeDemo && (
              <p className="text-sm bg-gold/10 border border-gold/30 text-navy-dark rounded-lg px-3 py-2.5 text-center">
                Mode démo, aucun moyen d&apos;envoi configuré : votre code est <span className="font-mono font-bold tracking-widest">{codeDemo}</span>
              </p>
            )}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Code reçu"
              placeholder="Code à 6 chiffres"
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-center text-lg font-mono tracking-[0.3em] outline-none focus:border-navy"
            />
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-navy">
              <Lock size={16} className="text-gray-400 shrink-0" />
              <input
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="Nouveau mot de passe"
                autoComplete="new-password"
                className="w-full text-sm outline-none"
              />
            </div>
            <ReglesMotDePasse motDePasse={motDePasse} email={email.trim()} />
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-navy">
              <Lock size={16} className="text-gray-400 shrink-0" />
              <input
                type="password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Confirmez le nouveau mot de passe"
                autoComplete="new-password"
                className="w-full text-sm outline-none"
              />
            </div>
            {erreur && (
              <p role="alert" className="text-red text-xs">
                {erreur}
              </p>
            )}
            {info && !erreur && (
              <p role="status" className="text-green-700 text-xs">
                {info}
              </p>
            )}
            <button type="submit" disabled={envoi} className="btn-navy w-full mt-2 disabled:opacity-60">
              {envoi ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}
            </button>
            <p className="text-xs text-gray-500 text-center">Par sécurité, toutes les sessions ouvertes sur vos autres appareils seront fermées.</p>
            <button
              type="button"
              disabled={attente > 0 || envoi}
              onClick={() => demanderCode()}
              className="text-sm text-blue font-medium hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              {attente > 0 ? `Renvoyer un code (${attente} s)` : "Pas reçu ? Renvoyer un code"}
            </button>
          </form>
        )}

        <p className="text-sm text-gray-500 text-center mt-5">
          <Link href="/connexion" className="text-blue font-medium hover:underline">
            Revenir à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
