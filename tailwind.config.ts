import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./pages/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#1B4F72", dark: "#1B2A4A", light: "#2E6E9E" },
        gold: { DEFAULT: "#F0A500", light: "#FFC940" },
        blue: { DEFAULT: "#2E86AB" },
        green: { DEFAULT: "#1A5E20", light: "#27AE60" },
        red: { DEFAULT: "#922B21" },
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
