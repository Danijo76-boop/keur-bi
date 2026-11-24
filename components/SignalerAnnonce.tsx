"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "@/components/icones";
import { useAuth } from "@/lib/auth";
import { lireSignalements, MOTIFS_SIGNALEMENT, signaler } from "@/lib/moderation";
import { useStocke } from "@/lib/stockage";
import Modal from "./Modal";

export default function SignalerAnnonce({ bienId }: { bienId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const deja = useStocke(() => lireSignalements().some((s) => s.bienId === bienId && s.auteurEmail === user?.email), false, [bienId, user?.email]);
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState(MOTIFS_SIGNALEMENT[0]);
  const [detail, setDetail] = useState("");

  if (deja) return <p className="text-xs text-gray-400 text-center mt-3">Signalement transmis à la modération.</p>;

  return (
    <>
      <button
        type="button"
        onClick={() => (user ? setOuvert(true) : router.push("/connexion"))}
        className="flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-red w-full mt-3"
      >
        <Flag size={12} /> Signaler cette annonce
      </button>
      {ouvert && (
        <Modal titre="Signaler cette annonce" sousTitre="Votre signalement sera examiné par la modération" onClose={() => setOuvert(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!user) return;
              signaler({ bienId, motif, detail: detail.trim() || undefined, auteurEmail: user.email });
              setOuvert(false);
            }}
            className="flex flex-col gap-3"
          >
            <label className="text-sm font-semibold text-gray-700">
              Motif
              <select
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal mt-1 outline-none focus:border-navy"
              >
                {MOTIFS_SIGNALEMENT.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Précisions (optionnel)
              <textarea
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal mt-1 outline-none focus:border-navy resize-none"
              />
            </label>
            <button type="submit" className="btn-navy text-sm">
              Envoyer le signalement
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
