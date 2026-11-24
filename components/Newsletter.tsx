"use client";
import { useState } from "react";
import { Mail } from "@/components/icones";
import { inscrireNewsletter } from "@/lib/revenus";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        inscrireNewsletter(email);
        setEmail("");
      }}
      className="mt-5"
    >
      <label htmlFor="newsletter" className="block text-white font-semibold text-sm mb-2">
        Nouvelles annonces et tendances du marché
      </label>
      <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl p-1.5 max-w-xs">
        <Mail size={16} className="text-white/50 ml-2 shrink-0" />
        <input
          id="newsletter"
          type="email"
          required
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-0 !bg-transparent !shadow-none text-white text-sm outline-none placeholder:text-white/40"
        />
        <button type="submit" className="bg-gold text-navy-dark text-sm font-semibold rounded-xl px-3 py-1.5 hover:bg-gold-light transition-colors shrink-0">
          S&apos;inscrire
        </button>
      </div>
    </form>
  );
}
