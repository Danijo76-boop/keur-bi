export const CLE_THEME = "keurbi_theme";

// Exécuté dans <head> avant le premier affichage, pour éviter un éclair de page claire en mode nuit.
// Sans choix enregistré, on suit le réglage de l'appareil.
export const SCRIPT_THEME = `(function(){try{var t=localStorage.getItem("${CLE_THEME}");if(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}})()`;
