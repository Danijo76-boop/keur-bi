"use client";
import { useState } from "react";
import { formatFCFA } from "@/lib/mock-data";

const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal";
const SEUIL_ENDETTEMENT = 33;

export function mensualite(capital: number, tauxAnnuel: number, mois: number): number {
  if (capital <= 0 || mois <= 0) return 0;
  const t = tauxAnnuel / 100 / 12;
  return t === 0 ? capital / mois : (capital * t) / (1 - Math.pow(1 + t, -mois));
}

function Ligne({ label, val, fort }: { label: string; val: string; fort?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${fort ? "border-t border-gray-100 pt-2" : ""}`}>
      <dt className={fort ? "font-bold text-navy" : "text-gray-500"}>{label}</dt>
      <dd className={`text-right ${fort ? "font-bold text-navy" : "font-semibold"}`}>{val}</dd>
    </div>
  );
}

export function SimulateurCredit({ prix }: { prix: number }) {
  const [apport, setApport] = useState("20");
  const [duree, setDuree] = useState("15");
  const [taux, setTaux] = useState("8");
  const [revenu, setRevenu] = useState("");

  const partApport = Math.min(Math.max(Number(apport) || 0, 0), 100);
  const capital = Math.round((prix * (100 - partApport)) / 100);
  const mois = Math.max(Math.round((Number(duree) || 0) * 12), 0);
  const m = mensualite(capital, Math.max(Number(taux) || 0, 0), mois);
  const coutCredit = Math.max(m * mois - capital, 0);
  const revenuMensuel = Number(revenu) || 0;
  const endettement = revenuMensuel > 0 ? Math.round((m / revenuMensuel) * 100) : null;

  return (
    <div className="card p-5 mb-6">
      <h2 className="font-bold text-gray-900 mb-3">Simulation de crédit</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <label className="text-xs font-semibold text-gray-600">Apport (%)<input type="number" min={0} max={100} value={apport} onChange={(e) => setApport(e.target.value)} className={champ} /></label>
        <label className="text-xs font-semibold text-gray-600">Durée (ans)<input type="number" min={1} max={30} value={duree} onChange={(e) => setDuree(e.target.value)} className={champ} /></label>
        <label className="text-xs font-semibold text-gray-600">Taux annuel (%)<input type="number" min={0} step="0.1" value={taux} onChange={(e) => setTaux(e.target.value)} className={champ} /></label>
        <label className="text-xs font-semibold text-gray-600">Revenu mensuel<input type="number" min={0} placeholder="Optionnel" value={revenu} onChange={(e) => setRevenu(e.target.value)} className={champ} /></label>
      </div>
      <dl className="text-sm flex flex-col gap-2">
        <Ligne label="Apport" val={formatFCFA(prix - capital)} />
        <Ligne label="Montant emprunté" val={formatFCFA(capital)} />
        <Ligne label="Coût total des intérêts" val={formatFCFA(coutCredit)} />
        <Ligne label="Mensualité estimée" val={formatFCFA(m)} fort />
      </dl>
      {endettement !== null && (
        <p className={`text-sm font-semibold mt-3 rounded-lg px-3 py-2 ${endettement > SEUIL_ENDETTEMENT ? "bg-red/10 text-red" : "bg-green/10 text-green"}`}>
          {endettement > SEUIL_ENDETTEMENT ? "⚠" : "✓"} Mensualité égale à {endettement} % de votre revenu (repère courant : {SEUIL_ENDETTEMENT} % maximum).
        </p>
      )}
      <p className="text-xs text-gray-400 mt-3">Le taux par défaut est une simple hypothèse, hors assurance et frais de dossier. Seule votre banque peut vous donner une offre.</p>
    </div>
  );
}

export function SimulateurInvestisseur({ prix, frais }: { prix: number; frais: number }) {
  const [loyer, setLoyer] = useState("");
  const [charges, setCharges] = useState("");
  const [vacance, setVacance] = useState("1");

  const loyerMensuel = Number(loyer) || 0;
  const mois = Math.min(Math.max(12 - (Number(vacance) || 0), 0), 12);
  const net = loyerMensuel * mois - (Number(charges) || 0);
  const investi = prix + frais;
  const pct = (v: number) => `${((v / investi) * 100).toFixed(1).replace(".", ",")} %`;

  return (
    <div className="card p-5">
      <h2 className="font-bold text-gray-900 mb-3">Rendement locatif</h2>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <label className="text-xs font-semibold text-gray-600">Loyer mensuel<input type="number" min={0} value={loyer} onChange={(e) => setLoyer(e.target.value)} className={champ} /></label>
        <label className="text-xs font-semibold text-gray-600">Charges / an<input type="number" min={0} value={charges} onChange={(e) => setCharges(e.target.value)} className={champ} /></label>
        <label className="text-xs font-semibold text-gray-600">Mois vacants / an<input type="number" min={0} max={12} value={vacance} onChange={(e) => setVacance(e.target.value)} className={champ} /></label>
      </div>
      {loyerMensuel > 0 && investi > 0 ? (
        <dl className="text-sm flex flex-col gap-2">
          <Ligne label="Montant investi, frais inclus" val={formatFCFA(investi)} />
          <Ligne label="Revenu net annuel" val={formatFCFA(net)} />
          <Ligne label="Rendement brut" val={pct(loyerMensuel * 12)} />
          <Ligne label="Rendement net" val={pct(net)} fort />
          {net > 0 && <Ligne label="Retour sur investissement" val={`${Math.ceil(investi / net)} ans`} />}
        </dl>
      ) : (
        <p className="text-sm text-gray-400">Saisissez un loyer pour calculer le rendement.</p>
      )}
      <p className="text-xs text-gray-400 mt-3">Avant impôts et hors valorisation du bien.</p>
    </div>
  );
}
