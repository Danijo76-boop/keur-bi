// Applique les migrations de la base avant la compilation, lors d'un déploiement (Vercel).
// Les migrations exigent une connexion directe à PostgreSQL : on prend l'adresse « non mutualisée »
// fournie par l'hébergeur si elle existe, sinon DATABASE_URL.
import { spawnSync } from "node:child_process";

const directe = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directe) {
  console.error(
    "\nDéploiement interrompu : aucune base de données n'est configurée.\n" +
      "Dans Vercel, ouvrez le projet → Storage → créez ou connectez une base Postgres,\n" +
      "ou ajoutez la variable DATABASE_URL dans Settings → Environment Variables.\n",
  );
  process.exit(1);
}

const lancer = (...args) =>
  spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, DATABASE_URL: directe } }).status ?? 1;

const code = lancer("prisma", "migrate", "deploy");
if (code !== 0) process.exit(code);

// Premier déploiement : avec SEED_AU_DEPLOIEMENT=1, charge les données d'exemple et crée le compte administrateur
// (ADMIN_EMAIL, ADMIN_MOT_DE_PASSE). Retirez la variable ensuite : chaque déploiement remettrait les annonces d'exemple à leur état initial.
if (process.env.SEED_AU_DEPLOIEMENT === "1") process.exit(lancer("tsx", "prisma/seed.ts"));
