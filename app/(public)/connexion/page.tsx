"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, User as UserIcon, Phone } from "lucide-react";
import { suiteSure } from "@/lib/acces";
import { useAuth, ROLE_LABELS, Role, ROLES_INSCRIPTION, ROLE_DESCRIPTIONS, LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth";


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

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (envoi) return;
    if (!email.trim() || !motDePasse || (mode === "inscription" && !nom.trim())) {
      setErreur("Merci de remplir tous les champs.");
      return;
    }
    if (mode === "inscription" && motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
      setErreur(`Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`);
      return;
    }
    setErreur("");
    setEnvoi(true);
    const resultat =
      mode === "inscription"
        ? await inscription({ nom: nom.trim(), email: email.trim(), motDePasse, role, telephone: telephone.trim() || undefined })
        : await connexion(email.trim(), motDePasse);
    setEnvoi(false);
    if (!resultat.ok) {
      setErreur(resultat.erreur);
      return;
    }
    // Retour à la page demandée avant la connexion ; sinon vérification d'identité (nouveau compte) ou tableau de bord.
    // Chargement complet plutôt que navigation interne : le navigateur garde en mémoire le renvoi vers la connexion
    // reçu avant d'être identifié, et y retomberait.
    window.location.assign(suite ?? (mode === "inscription" ? "/kyc" : "/tableau-de-bord"));
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-navy mb-1 text-center">
          {mode === "connexion" ? "Connexion" : "Créer un compte"}
        </h1>
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
                    r === role
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy"
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
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Nom complet"
                  className="w-full text-sm outline-none"
                />
              </div>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-navy">
                <Phone size={16} className="text-gray-400 shrink-0" />
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Téléphone (optionnel)"
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

          {erreur && <p role="alert" className="text-red text-xs">{erreur}</p>}

          <button type="submit" disabled={envoi} className="btn-navy w-full mt-2 disabled:opacity-60">
            {envoi ? "Un instant…" : mode === "connexion" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-5">
          {mode === "connexion" ? (
            <>
              Pas encore de compte ?{" "}
              <button onClick={() => { setMode("inscription"); setErreur(""); }} className="text-blue font-medium hover:underline">
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà inscrit ?{" "}
              <button onClick={() => { setMode("connexion"); setErreur(""); }} className="text-blue font-medium hover:underline">
                Se connecter
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
