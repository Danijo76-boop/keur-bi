import { NextResponse } from "next/server";
import { exigerRole } from "@/lib/serveur/auth";
import { avecJournal } from "@/lib/serveur/journal";
import { canauxConfigures, modeDemo, otpActif, reinitialisationPossible } from "@/lib/serveur/otp";
import { alerteWhatsAppConfiguree } from "@/lib/serveur/whatsapp";

// GET /api/admin/securite : état de la double vérification, pour le bandeau de l'administration.
// Ne renvoie que des oui/non : jamais la valeur d'une clé.
async function get(_requete: Request) {
  if (!(await exigerRole("admin"))) return NextResponse.json({ erreur: "Réservé aux administrateurs." }, { status: 403 });
  return NextResponse.json({
    doubleVerification: otpActif(),
    coupeeVolontairement: process.env.OTP_WHATSAPP === "off",
    modeDemo: modeDemo(),
    canaux: canauxConfigures(),
    alerteWhatsApp: alerteWhatsAppConfiguree(),
    motDePasseOublie: reinitialisationPossible(),
  });
}

export const GET = avecJournal("GET /api/admin/securite", get);
