"use client";
import { useState } from "react";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { NOTAIRES } from "@/lib/notaires";
import { texteNote } from "@/lib/moderation";

const REGIONS = ["Toutes", ...Array.from(new Set(NOTAIRES.map((n) => n.region)))];

export default function NotairesPage() {
  const [region, setRegion] = useState("Toutes");
  const liste = NOTAIRES.filter((n) => region === "Toutes" || n.region === region);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy">Notaires partenaires</h1>
      <p className="text-gray-500 text-sm mb-5">Le notaire est le garant légal de votre transaction</p>
      <div className="flex gap-2 flex-wrap mb-6">
        {REGIONS.map((r) => (
          <button
            key={r}
            aria-pressed={region === r}
            onClick={() => setRegion(r)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border ${region === r ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200"}`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {liste.map((n) => (
          <Link key={n.slug} href={`/notaires/${n.slug}`} className="card p-5 hover:shadow-md transition-shadow block">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-navy text-gold font-bold flex items-center justify-center">{n.initiales}</div>
              <div>
                <div className="font-bold text-gray-900">{n.nom}</div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin size={11} /> {n.ville}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm mb-2">
              {n.nbAvis > 0 && <Star size={14} className="text-gold fill-gold" />}
              <span className="text-gray-400 text-xs">
                {texteNote(n.note, n.nbAvis)} · TF sous {n.delaiTF}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {n.specialites.slice(0, 3).map((s) => (
                <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
