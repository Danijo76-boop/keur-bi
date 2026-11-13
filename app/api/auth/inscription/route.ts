import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/serveur/db";
import {
  adresseClient, compterTentative, emailValide, hacherMotDePasse, LONGUEUR_MIN_MOT_DE_PASSE, memeOrigine,
  normaliserEmail, ouvrirSession, ROLES_INSCRIPTION, tropDeTentatives, versSession,
} from "@/lib/serveur/auth";

const refus = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });

// POST /api/auth/inscription  { nom, email, motDePasse, role, telephone? }
export async function POST(requete: Request) {
  if (!memeOrigine()) return refus("Requête refusée.", 403);
  const ip = adresseClient();
  if (ip) {
    const cle = `inscription:${ip}`;
    if (tropDeTentatives(cle, 20)) return refus("Trop de tentatives. Réessayez dans quelques minutes.", 429);
    compterTentative(cle);
  }

  const corps = await requete.json().catch(() => null);
  const nom = typeof corps?.nom === "string" ? corps.nom.trim() : "";
  const email = typeof corps?.email === "string" ? normaliserEmail(corps.email) : "";
  const motDePasse = typeof corps?.motDePasse === "string" ? corps.motDePasse : "";
  const telephone = typeof corps?.telephone === "string" ? corps.telephone.trim().slice(0, 30) : "";
  const role = ROLES_INSCRIPTION.find((r) => r === corps?.role);

  if (nom.length < 2 || nom.length > 100) return refus("Indiquez votre nom complet.");
  if (!emailValide(email)) return refus("Adresse email invalide.");
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) return refus(`Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`);
  // bcrypt ignore tout ce qui dépasse 72 octets : on refuse plutôt que de tronquer en silence.
  if (Buffer.byteLength(motDePasse) > 72) return refus("Le mot de passe est trop long (72 caractères au maximum).");
  if (!role) return refus("Ce type de compte ne peut pas être créé ici.");

  try {
    const compte = await db.utilisateur.create({
      data: { nom, email, role, telephone: telephone || null, motDePasseHash: await hacherMotDePasse(motDePasse) },
    });
    await ouvrirSession(compte.id);
    return NextResponse.json({ utilisateur: versSession(compte) }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return refus("Un compte existe déjà avec cette adresse. Connectez-vous.", 409);
    console.error("POST /api/auth/inscription", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}
