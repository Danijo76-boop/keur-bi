"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, User as UserIcon, Phone, MessageCircle } from "lucide-react";
import { suiteSure } from "@/lib/acces";
import Link from "next/link";
import {
  useAuth,
  ROLE_LABELS,
  Role,
  ROLES_INSCRIPTION,
  ROLE_DESCRIPTIONS,
  LONGUEUR_MIN_MOT_DE_PASSE,
  motDePasseConforme,
  type Canal,
  type EtapeOTP,
} from "@/lib/auth";
import ReglesMotDePasse from "@/components/ReglesMotDePasse";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-400">Chargement…</div>}>
      <Formulaire />
    </Suspense>
  );
}

function Formulaire() {
  const params = useSearchParams();
  const { connexion, inscription } = useAuth();
  const [mode, setMode] = useState<"connexion" | "inscription">(params.get("mode") === "inscription" ? "inscription" : "connexion");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState<Role>(() => ROLES_INSCRIPTION.find((r) => r === params.get("role")) ?? "acheteur");
  const suite = suiteSure(params.get("suite"));
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  // Deuxième temps de la connexion : code reçu par WhatsApp.
  const [otp, setOtp] = useState<EtapeOTP | null>(null);

  // Retour à la page demandée avant la connexion ; sinon vérification d'identité (nouveau compte) ou tableau de bord.
  // Chargement complet plutôt que navigation interne : le navigateur garde en mémoire le renvoi vers la connexion
  // reçu avant d'être identifié, et y retomberait.
  const entrer = () => window.location.assign(suite ?? (mode === "inscription" ? "/kyc" : "/tableau-de-bord"));

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (envoi) return;
    if (!email.trim() || !motDePasse || (mode === "inscription" && (!nom.trim() || !telephone.trim()))) {
      setErreur("Merci de remplir tous les champs.");
      return;
    }
    if (mode === "inscription" && !motDePasseConforme(motDePasse, email.trim())) {
      setErreur("Le mot de passe ne respecte pas encore toutes les règles indiquées sous le champ.");
      return;
    }
    setErreur("");
    setEnvoi(true);
    const resultat =
      mode === "inscription"
        ? await inscription({ nom: nom.trim(), email: email.trim(), motDePasse, role, telephone: telephone.trim() || undefined })
        : await connexion(email.trim(), motDePasse);
    setEnvoi(false);
    if (resultat.ok === false) {
      setErreur(resultat.erreur);
      return;
    }
    if (resultat.ok === "otp") {
      setOtp(resultat.otp);
      return;
    }
    entrer();
  }

  if (otp) {
    return (
      <EtapeCode
        otp={otp}
        numeroModifiable={mode === "inscription"}
        onChange={setOtp}
        onSucces={entrer}
        onAbandon={(message) => {
          setOtp(null);
          setMotDePasse("");
          setErreur(message ?? "");
          if (mode === "inscription") setMode("connexion");
        }}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-navy mb-1 text-center">{mode === "connexion" ? "Connexion" : "Créer un compte"}</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          {mode === "connexion" ? "Accédez à votre espace KEUR BI" : "Rejoignez KEUR BI en quelques secondes"}
        </p>

        {suite && (
          <p className="text-sm bg-gold/10 border border-gold/30 text-navy-dark rounded-lg px-3 py-2.5 mb-5 text-center">
            Cette page est réservée aux membres. Connectez-vous ou créez un compte gratuit pour y accéder.
          </p>
        )}

        <form onSubmit={soumettre} className="flex flex-col gap-3">
          {mode === "inscription" && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Je suis un(e)</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES_INSCRIPTION.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    title={ROLE_DESCRIPTIONS[r]}
                    aria-pressed={r === role}
                    className={`text-xs px-2 py-2 rounded-lg border font-medium transition-colors ${
                      r === role ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy"
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          )}
          {mode === "inscription" && (
            <>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-navy">
                <UserIcon size={16} className="text-gray-400 shrink-0" />
                <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom complet" className="w-full text-sm outline-none" />
              </div>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-navy">
                <Phone size={16} className="text-gray-400 shrink-0" />
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Numéro WhatsApp (ex. 77 123 45 67)"
                  autoComplete="tel"
                  className="w-full text-sm outline-none"
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-navy">
            <Mail size={16} className="text-gray-400 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse email"
              autoComplete="email"
              className="w-full text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-navy">
            <Lock size={16} className="text-gray-400 shrink-0" />
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder={mode === "inscription" ? `Mot de passe (${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum)` : "Mot de passe"}
              autoComplete={mode === "inscription" ? "new-password" : "current-password"}
              className="w-full text-sm outline-none"
            />
          </div>

          {mode === "inscription" && <ReglesMotDePasse motDePasse={motDePasse} email={email.trim()} />}
          {mode === "connexion" && (
            <Link
              href={`/mot-de-passe-oublie${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
              className="text-xs text-blue font-medium hover:underline self-end"
            >
              Mot de passe oublié ?
            </Link>
          )}

          {erreur && (
            <p role="alert" className="text-red text-xs">
              {erreur}
            </p>
          )}

          <button type="submit" disabled={envoi} className="btn-navy w-full mt-2 disabled:opacity-60">
            {envoi ? "Un instant…" : mode === "connexion" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-5">
          {mode === "connexion" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                onClick={() => {
                  setMode("inscription");
                  setErreur("");
                }}
                className="text-blue font-medium hover:underline"
              >
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà inscrit ?{" "}
              <button
                onClick={() => {
                  setMode("connexion");
                  setErreur("");
                }}
                className="text-blue font-medium hover:underline"
              >
                Se connecter
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

const RENVOI_S = 30;
const LIBELLE_CANAL: Record<Canal, string> = { whatsapp: "sur WhatsApp", sms: "par SMS", email: "par email" };
const TITRE_CANAL: Record<Canal, string> = { whatsapp: "Vérification WhatsApp", sms: "Vérification par SMS", email: "Vérification par email" };

// Deuxième temps de la connexion : saisie du numéro WhatsApp (première fois) puis du code reçu.
function EtapeCode({
  otp,
  numeroModifiable,
  onChange,
  onSucces,
  onAbandon,
}: {
  otp: EtapeOTP;
  numeroModifiable: boolean;
  onChange: (o: EtapeOTP) => void;
  onSucces: () => void;
  onAbandon: (message?: string) => void;
}) {
  const { envoyerCode, verifierCode } = useAuth();
  const [numero, setNumero] = useState("");
  const [code, setCode] = useState("");
  const [changerNumero, setChangerNumero] = useState(false);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [attente, setAttente] = useState(otp.etape === "code" ? RENVOI_S : 0);

  useEffect(() => {
    if (attente <= 0) return;
    const t = setTimeout(() => setAttente((a) => a - 1), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  async function demanderCode(numeroSaisi?: string, canal?: Canal) {
    if (envoi) return;
    setErreur("");
    setInfo("");
    setEnvoi(true);
    const r = await envoyerCode(otp.defi, numeroSaisi, canal);
    setEnvoi(false);
    if (!r.ok) {
      if (r.expire) return onAbandon(r.erreur);
      return setErreur(r.erreur);
    }
    onChange(r.otp);
    setCode("");
    setChangerNumero(false);
    setAttente(RENVOI_S);
    if (numeroSaisi === undefined && r.otp.etape === "code") setInfo(`Un nouveau code vous a été envoyé ${LIBELLE_CANAL[r.otp.canal]}.`);
  }

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    if (envoi) return;
    if (!/^\d{6}$/.test(code.trim())) return setErreur("Saisissez les 6 chiffres du code.");
    setErreur("");
    setEnvoi(true);
    const r = await verifierCode(otp.defi, code.trim());
    setEnvoi(false);
    if (r.ok === true) return onSucces();
    if (r.ok === false) {
      if (r.expire || /Recommencez depuis le début/.test(r.erreur)) return onAbandon(r.erreur);
      setErreur(r.erreur);
      setCode("");
    }
  }

  const saisieNumero = otp.etape === "numero" || changerNumero;
  const titre = !saisieNumero && otp.etape === "code" ? TITRE_CANAL[otp.canal] : "Vérification de votre identité";

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-[#25D366]/15 text-[#128C7E] flex items-center justify-center">
          <MessageCircle size={24} />
        </div>
        <h1 className="text-2xl font-bold text-navy mb-1 text-center">{titre}</h1>

        {saisieNumero ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (numero.trim()) demanderCode(numero.trim());
              else setErreur("Indiquez votre numéro WhatsApp.");
            }}
            className="flex flex-col gap-3"
          >
            <p className="text-gray-500 text-sm text-center mb-3">
              Pour protéger votre compte, chaque connexion est confirmée par un code à usage unique. Indiquez votre numéro WhatsApp : le code y sera envoyé (ou
              par SMS si vous n&apos;avez pas WhatsApp).
            </p>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-navy">
              <Phone size={16} className="text-gray-400 shrink-0" />
              <input
                type="tel"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="77 123 45 67 ou +33 6 12 34 56 78"
                autoComplete="tel"
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
              {envoi ? "Envoi…" : "Recevoir le code"}
            </button>
            {otp.etape === "numero" && otp.autres.includes("email") && (
              <button type="button" disabled={envoi} onClick={() => demanderCode(undefined, "email")} className="text-sm text-blue font-medium hover:underline">
                Je préfère recevoir le code par email
              </button>
            )}
            {changerNumero && (
              <button
                type="button"
                onClick={() => {
                  setChangerNumero(false);
                  setErreur("");
                }}
                className="text-sm text-blue font-medium hover:underline"
              >
                Garder le numéro précédent
              </button>
            )}
          </form>
        ) : (
          otp.etape === "code" && (
            <form onSubmit={valider} className="flex flex-col gap-3">
              <p className="text-gray-500 text-sm text-center mb-3">
                Saisissez le code à 6 chiffres envoyé {LIBELLE_CANAL[otp.canal]} à{" "}
                <span className="font-semibold text-gray-700 whitespace-nowrap">{otp.destination}</span>. Il expire dans 10 minutes. Ne le communiquez à
                personne.
              </p>
              {otp.codeDemo && (
                <p className="text-sm bg-gold/10 border border-gold/30 text-navy-dark rounded-lg px-3 py-2.5 text-center" role="status">
                  Mode démo, aucun moyen d&apos;envoi configuré : votre code est <span className="font-mono font-bold tracking-widest">{otp.codeDemo}</span>
                </p>
              )}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Code de vérification"
                placeholder="••••••"
                autoFocus
                className="border border-gray-200 rounded-lg px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:border-navy"
              />
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
              <button type="submit" disabled={envoi || code.length !== 6} className="btn-navy w-full mt-2 disabled:opacity-60">
                {envoi ? "Vérification…" : "Valider"}
              </button>
              <div className="flex flex-col items-center gap-1 text-sm">
                <button
                  type="button"
                  disabled={attente > 0 || envoi}
                  onClick={() => demanderCode()}
                  className="text-blue font-medium hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  {attente > 0 ? `Renvoyer le code (${attente} s)` : "Renvoyer le code"}
                </button>
                {otp.autres.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={envoi}
                    onClick={() => demanderCode(undefined, c)}
                    className="text-blue font-medium hover:underline disabled:text-gray-400"
                  >
                    {otp.canal === "whatsapp" ? "Pas reçu sur WhatsApp ? " : "Pas reçu ? "}Recevoir {LIBELLE_CANAL[c]}
                  </button>
                ))}
                {numeroModifiable && (
                  <button
                    type="button"
                    onClick={() => {
                      setChangerNumero(true);
                      setErreur("");
                      setInfo("");
                    }}
                    className="text-blue font-medium hover:underline"
                  >
                    Changer de numéro
                  </button>
                )}
              </div>
            </form>
          )
        )}

        <p className="text-sm text-gray-500 text-center mt-5">
          <button type="button" onClick={() => onAbandon()} className="text-blue font-medium hover:underline">
            Annuler et revenir à la connexion
          </button>
        </p>
      </div>
    </div>
  );
}
