import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/serveur/db";
import { exigerRole } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";

export const dynamic = "force-dynamic";

// GET /api/admin/journal?niveau=erreur&q=texte&requete=ab12cd34 : entrées du journal technique, les plus récentes d'abord.
// Réservé aux administrateurs : les détails techniques peuvent révéler le fonctionnement interne du site.
async function get(requete: Request) {
  try {
    if (!(await exigerRole("admin"))) return NextResponse.json({ erreur: "Réservé aux administrateurs." }, { status: 403 });
    const p = new URL(requete.url).searchParams;
    const niveau = ["warn", "erreur", "info"].find((n) => n === p.get("niveau"));
    const categorie = p.get("categorie") === "audit" ? "audit" : undefined;
    const q = p.get("q")?.trim().slice(0, 100);
    const ref = p.get("requete")?.trim().slice(0, 40);
    const where: Prisma.JournalTechniqueWhereInput = {
      ...(niveau && { niveau }),
      ...(categorie && { categorie }),
      ...(ref && { requeteId: { startsWith: ref } }),
      ...(q && { OR: [{ message: { contains: q, mode: "insensitive" } }, { route: { contains: q, mode: "insensitive" } }] }),
    };
    const entrees = await db.journalTechnique.findMany({ where, orderBy: { date: "desc" }, take: 200 });
    return NextResponse.json({ entrees });
  } catch (e) {
    log.erreur("GET /api/admin/journal", e);
    return NextResponse.json({ erreur: "Le service est momentanément indisponible." }, { status: 503 });
  }
}

export const GET = avecJournal("GET /api/admin/journal", get);
