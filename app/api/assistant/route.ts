import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { adresseClient, memeOrigine } from "@/lib/serveur/auth";
import { listerAnnonces } from "@/lib/serveur/annonces";
import { catalogue, CONSIGNE_ASSISTANT, MODELE_ASSISTANT } from "@/lib/serveur/assistant";
import { log } from "@/lib/serveur/journal";
import { compterEssai, LIMITES, limiteAtteinte, lireJson } from "@/lib/serveur/securite";
import { BIENS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MESSAGES_MAX = 12; // seuls les derniers échanges sont renvoyés au modèle
const LONGUEUR_MAX = 1500; // caractères par message

const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });

let client: Anthropic | null = null;
const lireClient = () => (client ??= new Anthropic({ timeout: 55_000, maxRetries: 1 }));

type Message = { role: "user" | "assistant"; content: string };

// N'accepte qu'une conversation propre : alternance personne / assistant, qui commence et finit par la personne.
function conversation(corps: unknown): Message[] | null {
  const brut = (corps as { messages?: unknown })?.messages;
  if (!Array.isArray(brut) || !brut.length) return null;
  const messages = brut
    .slice(-MESSAGES_MAX)
    .map((m) => ({ role: m?.role, content: typeof m?.content === "string" ? m.content.trim().slice(0, LONGUEUR_MAX) : "" }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  const valide = messages.every((m, i) => m.content && m.role === (i % 2 === 0 ? "user" : "assistant"));
  if (!valide || !messages.length || messages[messages.length - 1].role !== "user") return null;
  return messages as Message[];
}

// POST /api/assistant  { messages: [{ role, content }] }  → réponse en texte, envoyée au fil de l'eau.
export async function POST(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  if (!process.env.ANTHROPIC_API_KEY) return refus("L'assistant n'est pas encore activé sur ce site.", 503);

  const messages = conversation(await lireJson(requete));
  if (!messages) return refus("Écrivez votre question.", 400);

  const ip = await adresseClient();
  const cle = `assistant:${ip ?? "inconnue"}`;
  if (await limiteAtteinte(cle, LIMITES.assistant)) return refus("Vous avez posé beaucoup de questions : réessayez dans une heure.", 429);
  await compterEssai(cle, LIMITES.assistant);

  const biens = await listerAnnonces().catch((e) => {
    log.erreur("Assistant : annonces illisibles", e);
    return BIENS;
  });

  const encodeur = new TextEncoder();
  const flux = new ReadableStream<Uint8Array>({
    async start(controleur) {
      const ecrire = (texte: string) => controleur.enqueue(encodeur.encode(texte));
      try {
        const reponse = lireClient().beta.messages.stream({
          model: MODELE_ASSISTANT,
          // Réponses courtes de discussion : plafond volontairement bas pour maîtriser le coût d'un site public.
          max_tokens: 4000,
          output_config: { effort: "low" },
          // Si le modèle décline une question, l'API la confie à un modèle de secours dans le même appel.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          // Consigne et catalogue identiques d'une question à l'autre : mis en cache.
          cache_control: { type: "ephemeral" },
          system: [
            { type: "text", text: CONSIGNE_ASSISTANT },
            { type: "text", text: catalogue(biens) },
          ],
          messages,
        });
        for await (const evenement of reponse) {
          if (evenement.type === "content_block_delta" && evenement.delta.type === "text_delta") ecrire(evenement.delta.text);
        }
        const fin = await reponse.finalMessage();
        if (fin.stop_reason === "refusal")
          ecrire("\n\nJe ne peux pas répondre à cette question. Pour toute autre demande, écrivez à l'équipe : [Contact](/contact).");
        else if (fin.stop_reason === "max_tokens") ecrire("…");
        log.info("Assistant : réponse envoyée", { entree: fin.usage.input_tokens, cache: fin.usage.cache_read_input_tokens, sortie: fin.usage.output_tokens });
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) log.warn("Assistant : limite de débit de l'API atteinte", e);
        else if (e instanceof Anthropic.AuthenticationError) log.erreur("Assistant : clé ANTHROPIC_API_KEY refusée", e);
        else if (e instanceof Anthropic.APIError) log.warn(`Assistant : erreur ${e.status}`, e);
        else log.warn("Assistant : service injoignable", e);
        ecrire("\n\nL'assistant est momentanément indisponible. Réessayez dans un instant.");
      } finally {
        controleur.close();
      }
    },
  });

  return new Response(flux, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
