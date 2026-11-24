import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./pages/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#1B4F72", dark: "#1B2A4A", light: "#2E6E9E" },
        // Or vif : boutons, fonds, logo, texte sur fond sombre. Or foncé : texte sur fond clair (lisibilité 5,2 : 1).
        gold: { DEFAULT: "#F0A500", light: "#FFC940", dark: "#946200" },
        // Bleu des liens, assombri pour être lisible sur fond blanc (5,7 : 1).
        blue: { DEFAULT: "#1F6F8B" },
        green: { DEFAULT: "#1A5E20", light: "#27AE60" },
        // Un seul rouge : alertes, erreurs, bouton PDF.
        red: { DEFAULT: "#B42318" },
      },
      // Textes secondaires : le gris 400 de Tailwind est trop pâle (2,5 : 1). Remplacé partout par un gris lisible (5,8 : 1).
      textColor: {
        gray: { 400: "#5F6673" },
      },
      // Trois niveaux d'ombre, nommés par rôle (charte graphique).
      boxShadow: {
        carte: "0 1px 2px rgba(27, 42, 74, 0.04), 0 8px 24px -12px rgba(27, 42, 74, 0.12)",
        eleve: "0 2px 4px rgba(27, 42, 74, 0.05), 0 20px 40px -16px rgba(27, 42, 74, 0.25)",
        flottant: "0 20px 40px -16px rgba(0, 0, 0, 0.45)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
