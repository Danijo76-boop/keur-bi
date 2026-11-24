import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const racine = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // Les fichiers .tsx contiennent du JSX (React) : transformation automatique, comme dans Next.js.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@/": racine,
      // « server-only » refuse d'être chargé hors de Next.js : dans les tests, on le remplace par un module vide.
      "server-only": fileURLToPath(new URL("./tests/outils/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Les tests d'intégration partagent la même base : on les exécute l'un après l'autre.
    fileParallelism: false,
    testTimeout: 20_000,
    setupFiles: ["tests/outils/preparation.ts"],
  },
});
