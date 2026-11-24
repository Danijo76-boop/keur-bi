"use client";
import { popup } from "@/lib/popup";
import { useState } from "react";
import { Share2, Check } from "@/components/icones";

export default function ShareButton({ titre, className }: { titre: string; className?: string }) {
  const [copie, setCopie] = useState(false);

  async function partager(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: titre, url });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopie(true);
    popup.succes("Lien copié", "Vous pouvez le coller où vous voulez.");
    setTimeout(() => setCopie(false), 2000);
  }

  return (
    <button onClick={partager} className={className} aria-label="Partager">
      {copie ? <Check size={18} className="text-green-light" /> : <Share2 size={18} className="text-gray-500" />}
    </button>
  );
}
