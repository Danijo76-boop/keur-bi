"use client";
import { ReactNode } from "react";
import { X } from "@/components/icones";

export default function Modal({ titre, sousTitre, onClose, children }: { titre: string; sousTitre?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">{titre}</h3>
            {sousTitre && <p className="text-sm text-gray-500">{sousTitre}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
