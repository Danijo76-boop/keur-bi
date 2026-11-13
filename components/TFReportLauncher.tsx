"use client";
import { ReactNode, useState } from "react";
import { ShieldCheck } from "lucide-react";
import Modal from "./Modal";
import { Bien } from "@/lib/mock-data";
import { telecharger } from "@/lib/telechargement";

export default function TFReportLauncher({ bien, children, className }: { bien: Bien; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);

  const lignes = [
    { label: "Numéro TF", val: bien.tf.numero ?? "—" },
    { label: "Conservation", val: bien.tf.conservation ?? "—" },
    { label: "Superficie cadastrale", val: bien.tf.superficie_cadastrale ? `${bien.tf.superficie_cadastrale} m²` : "—" },
    { label: "Propriétaire", val: bien.proprietaire ?? "Communiqué par le notaire" },
    { label: "Hypothèque", val: "Aucune" },
    { label: "Litige en cours", val: "Aucun" },
    { label: "Référence du bien", val: bien.reference },
    { label: "Région", val: bien.region },
  ];

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <Modal titre="Rapport de vérification TF" sousTitre={bien.reference} onClose={() => setOpen(false)}>
          <div className="flex items-start gap-3 mb-4">
            <ShieldCheck className="text-green-light shrink-0 mt-0.5" size={24} />
            <p className="text-sm text-gray-600">Vérification effectuée auprès de la Direction Générale des Impôts et des Domaines (DGID).</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
            {lignes.map((l) => (
              <div key={l.label}>
                <dt className="text-gray-400 text-xs">{l.label}</dt>
                <dd className="font-semibold text-gray-800">{l.val}</dd>
              </div>
            ))}
          </dl>
          <button
            onClick={() =>
              telecharger(
                `Rapport_${bien.reference}.txt`,
                `RAPPORT DE DÉMONSTRATION, sans valeur juridique\n\n${lignes.map((l) => `${l.label} : ${l.val}`).join("\n")}\n`,
              )
            }
            className="btn-navy text-sm w-full"
          >
            ↓ Télécharger le rapport
          </button>
        </Modal>
      )}
    </>
  );
}
