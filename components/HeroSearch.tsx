"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

const TYPES = ["Tous types", "Terrain", "Villa", "Appartement", "Bureau"];

export default function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [transaction, setTransaction] = useState("Acheter");
  const [type, setType] = useState("Tous types");

  function rechercher(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (transaction === "Louer") params.set("transaction", "location");
    if (q.trim()) params.set("q", q.trim());
    if (type !== "Tous types") params.set("type", type.toLowerCase());
    const query = params.toString();
    router.push(`/annonces${query ? `?${query}` : ""}`);
  }

  return (
    <form onSubmit={rechercher} className="bg-white rounded-2xl shadow-[0_24px_48px_-20px_rgba(0,0,0,0.5)] p-2 flex flex-col sm:flex-row gap-2 [&_input]:!shadow-none [&_select]:!shadow-none">
      <div className="flex-1 flex items-center gap-3 px-3">
        <Search size={18} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Quartier, ville, région…"
          className="w-full text-gray-800 text-sm outline-none placeholder-gray-400"
        />
      </div>
      <select
        aria-label="Acheter ou louer"
        value={transaction}
        onChange={(e) => setTransaction(e.target.value)}
        className="text-sm text-gray-600 border-l border-gray-200 px-3 py-2 outline-none bg-transparent"
      >
        <option>Acheter</option>
        <option>Louer</option>
      </select>
      <select
        aria-label="Type de bien"
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="text-sm text-gray-600 border-l border-gray-200 px-3 py-2 outline-none bg-transparent"
      >
        {TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <button type="submit" className="btn-primary whitespace-nowrap text-sm text-center">
        Rechercher
      </button>
    </form>
  );
}