import "server-only";
import { PrismaClient } from "@prisma/client";

// Une seule connexion à la base pour tout le serveur. En développement, Next.js recharge
// les fichiers à chaque modification : sans cette précaution, chaque rechargement ouvrirait une nouvelle connexion.
const global = globalThis as unknown as { prisma?: PrismaClient };

export const db = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = db;
