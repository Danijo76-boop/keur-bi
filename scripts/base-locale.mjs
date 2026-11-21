// Démarre la base de données locale de développement si elle est arrêtée (par exemple après un redémarrage du PC).
// Lancé automatiquement avant `npm run dev`. Ne bloque jamais le démarrage de l'application :
// en cas de problème, il affiche la marche à suivre et laisse continuer.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { connect } from "node:net";

const PORT = 5434;
const DOSSIER = ".pgdata";

// L'adresse de la base est dans .env. Si elle ne vise pas la base locale (Supabase, Neon…), il n'y a rien à démarrer.
const env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const url = /^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m.exec(env)?.[1] ?? "";
if (url && !/@(localhost|127\.0\.0\.1):5434\//.test(url)) process.exit(0);

const repond = () =>
  new Promise((ok) => {
    const s = connect({ host: "127.0.0.1", port: PORT });
    s.setTimeout(1000);
    s.once("connect", () => (s.destroy(), ok(true)));
    s.once("error", () => ok(false));
    s.once("timeout", () => (s.destroy(), ok(false)));
  });

if (await repond()) {
  console.log(`Base de données : déjà démarrée (port ${PORT}).`);
  process.exit(0);
}

if (!existsSync(DOSSIER)) {
  console.warn(`Base de données : dossier ${DOSSIER} introuvable. Voir la section « Base de données » du README.`);
  process.exit(0);
}

console.log("Base de données : démarrage…");
const pgCtl = spawn("pg_ctl", ["-D", DOSSIER, "-o", `-p ${PORT} -c listen_addresses=localhost`, "-l", `${DOSSIER}/journal.log`, "start"], {
  detached: true,
  stdio: "ignore",
  windowsHide: true,
});
pgCtl.on("error", () => {});
pgCtl.unref();

for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  if (await repond()) {
    console.log(`Base de données : prête (port ${PORT}).`);
    process.exit(0);
  }
}
console.warn(`Base de données : elle n'a pas démarré. Consultez ${DOSSIER}/journal.log, ou lancez \`npm run db:start\` pour voir l'erreur.`);
process.exit(0);
