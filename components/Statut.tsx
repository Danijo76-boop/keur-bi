import { AlertTriangle, CheckCircle2, Circle, Clock, Info, Star, XCircle, type LucideIcon } from "lucide-react";
import type { StatutTF } from "@/lib/tf";

/* ── Icônes de statut (charte graphique) ──
   Remplacent les émojis (✅ ⏳ ⚠️ ❌ ⭐), qui s'affichent différemment selon le téléphone.
   Un code couleur fixe : vert = fait ou vérifié, or = en attente ou à surveiller, rouge = problème, bleu = information.
   L'icône accompagne toujours un texte : elle le renforce, elle ne le remplace pas (aria-hidden). */

export type TypeStatut = "ok" | "attente" | "attention" | "erreur" | "info" | "vedette" | "neutre";

const ICONES: Record<TypeStatut, LucideIcon> = {
  ok: CheckCircle2,
  attente: Clock,
  attention: AlertTriangle,
  erreur: XCircle,
  info: Info,
  vedette: Star,
  neutre: Circle,
};

const COULEURS: Record<TypeStatut, string> = {
  ok: "text-green",
  attente: "text-gold-dark",
  attention: "text-gold-dark",
  erreur: "text-red",
  info: "text-blue",
  vedette: "fill-current",
  neutre: "text-gray-400",
};

// « herite » : l'icône prend la couleur du texte autour (dans une pastille déjà colorée, par exemple).
export function IconeStatut({
  type,
  taille = 15,
  herite = false,
  className = "",
}: {
  type: TypeStatut;
  taille?: number;
  herite?: boolean;
  className?: string;
}) {
  const Icone = ICONES[type];
  return (
    <Icone
      size={taille}
      aria-hidden
      className={`inline-block shrink-0 align-[-0.2em] mr-1 ${herite && type !== "vedette" ? "" : COULEURS[type]} ${className}`}
    />
  );
}

const TYPE_TF: Record<StatutTF, TypeStatut> = { verifie: "ok", en_verification: "attente", non_verifie: "neutre", invalide: "erreur" };

export function IconeTF({ statut, taille, herite, className }: { statut: StatutTF; taille?: number; herite?: boolean; className?: string }) {
  return <IconeStatut type={TYPE_TF[statut]} taille={taille} herite={herite} className={className} />;
}
