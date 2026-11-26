"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "@/components/icones";
import ChampRecherche from "@/components/ChampRecherche";
import { REGIONS_SENEGAL } from "@/lib/mock-data";

const TYPES = ["Tous types", "Terrain", "Villa", "Appartement", "Bureau"];

export default function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [transaction, setTransaction] = useState("Acheter");
  const [type, setType] = useState("Tous types");
  const [region, setRegion] = useState("");

  function rechercher(e?: React.FormEvent, saisie = q) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (transaction === "Louer") params.set("transaction", "location");
    if (saisie.trim()) params.set("q", saisie.trim());
    if (type !== "Tous types") params.set("type", type.toLowerCase());
    if (region) params.set("region", region);
    const query = params.toString();
    router.push(`/annonces${query ? `?${query}` : ""}`);
  }

  const liste = "w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-navy bg-transparent";

  // Une ligne pour la saisie, puis les listes déroulantes (2 colonnes sur téléphone, 4 sur ordinateur) et le bouton.
  return (
    <form
      onSubmit={rechercher}
      className="bg-white rounded-2xl shadow-[0_24px_48px_-20px_rgba(0,0,0,0.5)] p-2 flex flex-col gap-2 [&_input]:!shadow-none [&_select]:!shadow-none"
    >
      <div className="flex items-center gap-3 px-3">
        <Search size={18} className="text-gray-400 shrink-0" />
        <ChampRecherche
          valeur={q}
          onChange={setQ}
          onChoisir={(lieu) => rechercher(undefined, lieu)}
          transaction={transaction === "Louer" ? "location" : "vente"}
          ariaLabel="Quartier, ville ou région"
          placeholder="Quartier, ville…"
          conteneur="w-full"
          className="w-full text-gray-800 text-sm outline-none placeholder-gray-400 py-2"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1.3fr_auto] gap-2">
        <select aria-label="Acheter ou louer" value={transaction} onChange={(e) => setTransaction(e.target.value)} className={liste}>
          <option>Acheter</option>
          <option>Louer</option>
        </select>
        <select aria-label="Type de bien" value={type} onChange={(e) => setType(e.target.value)} className={liste}>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select aria-label="Région" value={region} onChange={(e) => setRegion(e.target.value)} className={`${liste} col-span-2 sm:col-span-1`}>
          <option value="">Toutes les régions</option>
          {REGIONS_SENEGAL.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary whitespace-nowrap text-sm text-center col-span-2 sm:col-span-1">
          Rechercher
        </button>
      </div>
    </form>
  );
}
