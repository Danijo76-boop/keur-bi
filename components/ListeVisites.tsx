"use client";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { User, estCoteVendeur } from "@/lib/auth";
import { useStocke } from "@/lib/stockage";
import { changerStatutVisite, LABELS_VISITE, lireVisites, Visite } from "@/lib/visites";

function libelleStatut(v: Visite): string {
  return v.statut === "confirmee" && new Date(v.date).getTime() < Date.now() ? "Effectuée" : LABELS_VISITE[v.statut];
}

export default function ListeVisites({ user }: { user: User }) {
  const vendeur = estCoteVendeur(user.role);
  const visites = useStocke(() => lireVisites().filter((v) => vendeur || v.acheteurEmail === user.email), [], [user.email, vendeur]);
  const triees = [...visites].sort((a, b) => b.date.localeCompare(a.date));

  if (triees.length === 0) return null;

  const bouton = "text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50";

  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <CalendarCheck size={18} className="text-blue" /> {vendeur ? "Demandes de visite" : "Mes visites"} ({triees.length})
      </h2>
      <div className="flex flex-col gap-2">
        {triees.map((v) => {
          const aVenir = new Date(v.date).getTime() > Date.now();
          return (
            <div key={v.id} className={`card p-4 flex items-center justify-between gap-4 flex-wrap ${vendeur && v.statut === "demandee" ? "border-l-4 border-gold" : ""}`}>
              <div className="min-w-0">
                <Link href={`/annonces/${v.bienId}`} className="font-semibold text-sm text-gray-900 hover:text-navy">{v.bienTitre}</Link>
                <div className="text-xs text-gray-500 capitalize">
                  {new Date(v.date).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                {vendeur && <div className="text-xs text-gray-500">{v.acheteurNom}{v.telephone && ` · ${v.telephone}`}</div>}
                {v.message && <p className="text-sm text-gray-600 break-words mt-1">« {v.message} »</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-gray-600">{libelleStatut(v)}</span>
                {vendeur && v.statut === "demandee" && aVenir && (
                  <>
                    <button onClick={() => changerStatutVisite(v.id, "confirmee")} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green text-white">Confirmer</button>
                    <button onClick={() => changerStatutVisite(v.id, "refusee")} className={bouton}>Refuser</button>
                  </>
                )}
                {!vendeur && (v.statut === "demandee" || v.statut === "confirmee") && aVenir && (
                  <button onClick={() => changerStatutVisite(v.id, "annulee")} className={bouton}>Annuler</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
