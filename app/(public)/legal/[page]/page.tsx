import { notFound } from "next/navigation";

const TITRES: Record<string, string> = {
  cgu: "Conditions générales d'utilisation",
  confidentialite: "Politique de confidentialité",
  mentions: "Mentions légales",
};

export default async function LegalPage(ctx: { params: Promise<{ page: string }> }) {
  const params = await ctx.params;
  const titre = TITRES[params.page];
  if (!titre) notFound();
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="titre-page mb-4">{titre}</h1>
      <div className="card p-6 text-sm text-gray-600">
        Ce document n&apos;est pas encore rédigé. Il doit être préparé et validé par un conseil juridique avant toute mise en production.
      </div>
    </div>
  );
}
