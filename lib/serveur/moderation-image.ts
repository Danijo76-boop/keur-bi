import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { log } from "./journal";

/* ── Vérification du contenu des photos envoyées ──
   Chaque photo est examinée par Claude (API Anthropic) avant d'être enregistrée.
   Sont refusées : nudité ou contenu sexuel, violence ou sang, haine, contenu choquant,
   et photos qui exposent des données personnelles (pièce d'identité, carte bancaire, document nominatif…).

   Réglage :
   - ANTHROPIC_API_KEY absente : la vérification est sautée (pratique en local), c'est noté dans le journal.
     En production (NODE_ENV=production), sans clé, les photos sont refusées, sauf si MODERATION_IMAGES=off.
   - Service injoignable : la photo est refusée (on ne laisse rien passer sans contrôle). */

const MODELE = "claude-opus-5-5";

export const MOTIFS = {
  sexuel: "contenu à caractère sexuel ou nudité",
  violence: "violence, blessure ou sang",
  haine: "symbole ou message haineux, discriminatoire ou injurieux",
  choquant: "contenu choquant (armes brandies, drogue, cadavre, maltraitance…)",
  donnees_personnelles: "données personnelles visibles (pièce d'identité, carte bancaire, document nominatif…)",
  enfant: "enfant identifiable",
} as const;
type Motif = keyof typeof MOTIFS;

const Verdict = z.object({
  acceptable: z.boolean(),
  motifs: z.array(z.enum(Object.keys(MOTIFS) as [Motif, ...Motif[]])),
});

const CONSIGNE = `Tu vérifies les photos envoyées sur KEUR BI, un site d'annonces immobilières au Sénégal, avant leur publication.
Une photo est publiée à la vue de tous : elle doit montrer un bien immobilier (intérieur, extérieur, terrain, quartier, plan) sans heurter personne ni exposer quiconque.

Refuse la photo (acceptable = false) et indique chaque motif qui s'applique :
- sexuel : nudité, même partielle, pose suggestive, contenu pornographique ou érotique.
- violence : violence, blessure, sang, scène d'agression.
- haine : symbole, geste ou texte haineux, raciste, discriminatoire, injurieux.
- choquant : arme brandie, drogue, cadavre humain ou animal, maltraitance, toute image pouvant heurter la sensibilité.
- donnees_personnelles : pièce d'identité, passeport, carte bancaire, relevé, document lisible portant nom, adresse, numéro ou signature d'une personne.
- enfant : enfant dont le visage est reconnaissable.

Accepte (acceptable = true, motifs vide) une photo ordinaire de bien immobilier, même floue, sombre ou de qualité médiocre, même si des adultes y apparaissent normalement vêtus. Un titre foncier ou un plan cadastral sans données personnelles lisibles est acceptable.
Ne refuse jamais une photo pour sa qualité ou parce qu'elle sort du sujet immobilier : seul compte le risque de choquer ou d'exposer quelqu'un.`;

export type VerdictImage = { ok: true } | { ok: false; erreur: string; motifs: string[] };

let client: Anthropic | null = null;
const lireClient = () => (client ??= new Anthropic({ timeout: 25_000, maxRetries: 1 }));

export async function verifierImage(donnees: Buffer, type: string): Promise<VerdictImage> {
  if (process.env.MODERATION_IMAGES === "off") return { ok: true };
  if (!process.env.ANTHROPIC_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      log.erreur("Vérification des photos : ANTHROPIC_API_KEY absente, photo refusée");
      return { ok: false, erreur: "La vérification des photos est indisponible. Réessayez plus tard.", motifs: [] };
    }
    log.warn("Vérification des photos sautée : ANTHROPIC_API_KEY absente");
    return { ok: true };
  }

  try {
    const reponse = await lireClient().messages.parse({
      model: MODELE,
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(Verdict) },
      system: CONSIGNE,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: type as "image/jpeg" | "image/png" | "image/webp", data: donnees.toString("base64") } },
            { type: "text", text: "Cette photo peut-elle être publiée ?" },
          ],
        },
      ],
    });

    // Un refus du modèle lui-même signale un contenu problématique : la photo est refusée.
    if (reponse.stop_reason === "refusal") {
      log.info("Photo refusée par la vérification (refus du modèle)", { categorie: reponse.stop_details?.category ?? null });
      return { ok: false, erreur: "Cette photo ne peut pas être publiée : son contenu n'est pas autorisé.", motifs: ["refus"] };
    }
    const verdict = reponse.parsed_output;
    if (!verdict) throw new Error(`Réponse illisible (stop_reason=${reponse.stop_reason})`);
    if (verdict.acceptable && verdict.motifs.length === 0) return { ok: true };

    const motifs = verdict.motifs.length ? verdict.motifs : (["choquant"] as Motif[]);
    return {
      ok: false,
      erreur: `Cette photo ne peut pas être publiée : ${motifs.map((m) => MOTIFS[m]).join(", ")}.`,
      motifs,
    };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) log.warn("Vérification des photos : limite de débit atteinte", e);
    else if (e instanceof Anthropic.AuthenticationError) log.erreur("Vérification des photos : clé ANTHROPIC_API_KEY refusée", e);
    else if (e instanceof Anthropic.APIError) log.warn(`Vérification des photos : erreur ${e.status}`, e);
    else log.warn("Vérification des photos : service injoignable", e);
    return { ok: false, erreur: "La photo n'a pas pu être vérifiée. Réessayez dans un instant.", motifs: [] };
  }
}
