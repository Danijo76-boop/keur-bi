import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/serveur/db";
import { adresseClient, emailValide, hacherMotDePasse, memeOrigine, normaliserEmail, ouvrirSession, ROLES_INSCRIPTION, versSession } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { otpActif, ouvrirDefi } from "@/lib/serveur/otp";
import { normaliserNumero } from "@/lib/serveur/whatsapp";
import { freiner, LIMITES, lireJson, refusMotDePasse } from "@/lib/serveur/securite";

const refus = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });

// POST /api/auth/inscription  { nom, email, motDePasse, role, telephone }
// Avec la double vérification active, le téléphone est le numéro WhatsApp : le compte ne s'ouvre qu'une fois le code saisi.
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  const ip = await adresseClient();
  if (ip) {
    if (await freiner(`inscription:${ip}`, LIMITES.inscription)) return refus("Trop de tentatives. Réessayez dans quelques minutes.", 429);
  }

  const corps = await lireJson(requete);
  const nom = typeof corps?.nom === "string" ? corps.nom.trim() : "";
  const email = typeof corps?.email === "string" ? normaliserEmail(corps.email) : "";
  const motDePasse = typeof corps?.motDePasse === "string" ? corps.motDePasse : "";
  const saisie = typeof corps?.telephone === "string" ? corps.telephone.trim().slice(0, 30) : "";
  const avecOTP = otpActif();
  const numero = saisie ? normaliserNumero(saisie) : null;
  const telephone = numero ?? saisie;
  const role = ROLES_INSCRIPTION.find((r) => r === corps?.role);

  if (nom.length < 2 || nom.length > 100) return refus("Indiquez votre nom complet.");
  if (!emailValide(email)) return refus("Adresse email invalide.");
  if (!role) return refus("Ce type de compte ne peut pas être créé ici.");
  if (avecOTP && !numero)
    return refus(
      saisie
        ? "Numéro WhatsApp invalide. Exemple : 77 123 45 67 ou +33 6 12 34 56 78."
        : "Indiquez votre numéro WhatsApp : il sert à recevoir votre code de connexion.",
    );
  const faiblesse = refusMotDePasse(motDePasse, email);
  if (faiblesse) return refus(faiblesse);

  try {
    const compte = await db.utilisateur.create({
      data: { nom, email, role, telephone: telephone || null, motDePasseHash: await hacherMotDePasse(motDePasse) },
    });
    log.info("Compte créé", { utilisateurId: compte.id, role });
    if (avecOTP && numero) {
      const defi = await ouvrirDefi(compte, "connexion", numero);
      if (!defi.ok) return refus(defi.erreur, defi.status);
      return NextResponse.json({ otp: defi.valeur }, { status: 201 });
    }
    await ouvrirSession(compte.id);
    return NextResponse.json({ utilisateur: versSession(compte) }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return refus("Un compte existe déjà avec cette adresse. Connectez-vous, ou utilisez « Mot de passe oublié » si vous ne vous en souvenez plus.", 409);
    log.erreur("POST /api/auth/inscription", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const POST = avecJournal("POST /api/auth/inscription", post);
