"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User as UserIcon, Phone } from "lucide-react";
import { useAuth, ROLE_LABELS, Role, ROLES, ROLE_DESCRIPTIONS, estPlateforme } from "@/lib/auth";
import { enregistrerConnexion, trouverUtilisateur } from "@/lib/utilisateurs";
import BandeauDemo from "@/components/BandeauDemo";


export default function ConnexionPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-400">Chargement…</div>}>
      <Formulaire />
    </Suspense>
  );
}

function Formulaire() {
  const params = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<"connexion" | "inscription">(params.get("mode") === "inscription" ? "inscription" : "connexion");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState<Role>(() => ROLES.find((r) => r === params.get("role")) ?? "acheteur");
  const [erreur, setErreur] = useState("");

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !motDePasse.trim() || (mode === "inscription" && !nom.trim())) {
      setErreur("Merci de remplir tous les champs.");
      return;
    }
    const adresse = email.trim();
    const existant = trouverUtilisateur(adresse);
    if (existant?.suspendu) {
      setErreur("Ce compte est suspendu. Contactez le support KEUR BI.");
      return;
    }
    setErreur("");
    const nomAffiche = mode === "inscription" ? nom.trim() : existant?.nom ?? adresse.split("@")[0];
    const user = { nom: nomAffiche, email: adresse, role };
    enregistrerConnexion(user, telephone.trim() || undefined);
    login(user);
    router.push(mode === "inscription" && !estPlateforme(role) ? "/kyc" : "/tableau-de-bord");
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

        <BandeauDemo>Version de démonstration : aucun mot de passe n&apos;est vérifié ni enregistré, et le rôle se choisit librement.</BandeauDemo>

        <form onSubmit={soumettre} className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              {mode === "inscription" ? "Je suis un(e)" : "Se connecter en tant que"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
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
              className="w-full text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-navy">
            <Lock size={16} className="text-gray-400 shrink-0" />
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Mot de passe"
              className="w-full text-sm outline-none"
            />
          </div>

          {erreur && <p className="text-red text-xs">{erreur}</p>}

          <button type="submit" className="btn-navy w-full mt-2">
            {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
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
