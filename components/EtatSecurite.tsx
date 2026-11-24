"use client";
import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "@/components/icones";

type Etat = {
  doubleVerification: boolean;
  coupeeVolontairement: boolean;
  modeDemo: boolean;
  canaux: { whatsapp: boolean; sms: boolean; email: boolean };
  alerteWhatsApp: boolean;
  motDePasseOublie: boolean;
};

const NOMS = { whatsapp: "WhatsApp", sms: "SMS", email: "Email" } as const;

// Bandeau de l'administration : dit clairement si la connexion est protégée par un code, et sinon quoi configurer.
export default function EtatSecurite() {
  const [etat, setEtat] = useState<Etat | null>(null);
  useEffect(() => {
    fetch("/api/admin/securite", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setEtat)
      .catch(() => setEtat(null));
  }, []);
  if (!etat) return null;

  const actifs = (Object.keys(NOMS) as (keyof typeof NOMS)[]).filter((c) => etat.canaux[c]);

  if (etat.doubleVerification && !etat.modeDemo) {
    return (
      <div className="flex gap-3 items-start rounded-xl border border-green-200 bg-green-50 px-4 py-3 mb-6 text-sm text-green-900" role="status">
        <ShieldCheck size={20} className="shrink-0 mt-0.5" />
        <p>
          <strong>Double vérification active.</strong> Chaque connexion est confirmée par un code envoyé par {actifs.map((c) => NOMS[c]).join(", puis ")}.
          {!etat.canaux.sms && " Ajoutez un fournisseur SMS (Orange ou Twilio) pour les numéros sans WhatsApp."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start rounded-xl border border-red/30 bg-red/5 px-4 py-3 mb-6 text-sm text-gray-800" role="alert">
      <ShieldAlert size={20} className="shrink-0 mt-0.5 text-red" />
      <div>
        <p className="font-bold text-red mb-1">
          {etat.modeDemo
            ? "Double vérification en mode démo : les codes s'affichent à l'écran."
            : "Double vérification inactive : la connexion se fait avec le mot de passe seul."}
        </p>
        {etat.coupeeVolontairement ? (
          <p>
            Elle est coupée par la variable <code>OTP_WHATSAPP=off</code> dans Vercel. Retirez-la pour la réactiver.
          </p>
        ) : (
          <>
            <p>
              Aucun moyen d&apos;envoyer les codes n&apos;est configuré. Ajoutez au moins l&apos;un de ces groupes de variables dans Vercel (Settings →
              Environment Variables), puis redéployez :
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>
                <strong>Email</strong> (le plus rapide) : <code>RESEND_API_KEY</code> et <code>EMAIL_EXPEDITEUR</code>
              </li>
              <li>
                <strong>WhatsApp</strong> : <code>WHATSAPP_TOKEN</code> et <code>WHATSAPP_PHONE_NUMBER_ID</code>
              </li>
              <li>
                <strong>SMS Sénégal</strong> : <code>ORANGE_CLIENT_ID</code> et <code>ORANGE_CLIENT_SECRET</code>
              </li>
              <li>
                <strong>SMS international</strong> : <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> et <code>TWILIO_FROM</code>
              </li>
            </ul>
            {!etat.motDePasseOublie && <p className="mt-1">Tant qu&apos;aucun n&apos;est configuré, « Mot de passe oublié » est également indisponible.</p>}
          </>
        )}
      </div>
    </div>
  );
}
