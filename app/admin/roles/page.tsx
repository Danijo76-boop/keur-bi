"use client";
import { useEffect, useState } from "react";
import { Role, ROLE_LABELS, ROLES } from "@/lib/auth";
import { lireMatrice, Matrice, PERMISSIONS, sauvegarderMatrice } from "@/lib/permissions";
import { journaliser } from "@/lib/journal";
import { useStocke } from "@/lib/stockage";
import { ajouterUtilisateur, lireUtilisateurs, StatutKYC, trouverUtilisateur } from "@/lib/utilisateurs";

const GROUPES = Array.from(new Set(PERMISSIONS.map((p) => p.groupe)));
const champ = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy mt-1 font-normal";
const lib = "text-sm font-semibold text-gray-700";

export default function RolesPage() {
  const enregistree = useStocke(lireMatrice, lireMatrice());
  const utilisateurs = useStocke(lireUtilisateurs, []);
  const [matrice, setMatrice] = useState<Matrice>(enregistree);
  const [ok, setOk] = useState(false);

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [role, setRole] = useState<Role>("acheteur");
  const [statut, setStatut] = useState<"actif" | "attente" | "suspendu">("actif");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    setMatrice(enregistree);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(enregistree)]);

  const modifie = JSON.stringify(matrice) !== JSON.stringify(enregistree);

  function basculer(id: string, r: Role) {
    setOk(false);
    setMatrice((m) => ({ ...m, [id]: m[id].includes(r) ? m[id].filter((x) => x !== r) : [...m[id], r] }));
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    const adresse = email.trim();
    if (trouverUtilisateur(adresse)) return setErreur("Un compte existe déjà avec cet email.");
    const kyc: StatutKYC = statut === "attente" ? "en_attente" : "non_soumis";
    const cree = await ajouterUtilisateur({ email: adresse, nom: nom.trim(), role, telephone: telephone.trim() || undefined, statutKYC: kyc, suspendu: statut === "suspendu" });
    if (!cree) return;
    journaliser("compte", `Compte créé : ${nom.trim()} (${ROLE_LABELS[role]})`, "/admin/utilisateurs");
    setErreur("");
    setNom("");
    setEmail("");
    setTelephone("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Rôles & habilitations</h1>

      <div className="grid xl:grid-cols-[18rem_1fr] gap-6 items-start">
        <div className="flex flex-col gap-4">
          <form onSubmit={creer} className="card p-5 flex flex-col gap-3">
            <h2 className="font-bold text-gray-900">Ajouter un utilisateur</h2>
            <label className={lib}>Nom complet<input required value={nom} onChange={(e) => setNom(e.target.value)} className={champ} /></label>
            <label className={lib}>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={champ} /></label>
            <label className={lib}>Téléphone<input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} className={champ} /></label>
            <label className={lib}>Rôle principal
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={champ}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
            </label>
            <label className={lib}>Statut initial
              <select value={statut} onChange={(e) => setStatut(e.target.value as typeof statut)} className={champ}>
                <option value="actif">Actif</option>
                <option value="attente">En attente KYC</option>
                <option value="suspendu">Suspendu</option>
              </select>
            </label>
            {erreur && <p className="text-red text-xs">{erreur}</p>}
            <button type="submit" className="btn-navy text-sm">Créer l&apos;utilisateur</button>
          </form>
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Utilisateurs récents</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {utilisateurs.slice(0, 5).map((u) => (
                <li key={u.email} className="min-w-0">
                  <div className="font-semibold text-gray-800 truncate">{u.nom}</div>
                  <div className="text-xs text-gray-400 truncate">{ROLE_LABELS[u.role]} · {u.email}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card min-w-0">
          <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-bold text-gray-900">Matrice des habilitations</h2>
              <p className="text-xs text-gray-500 xl:hidden">Faites défiler le tableau vers la droite pour voir tous les rôles.</p>
              <p className="text-xs text-gray-500">« Bloquant » : la permission contrôle réellement l&apos;action dans cette démo. Les autres sont indicatives. Une permission d&apos;administration accordée à un autre rôle lui ouvre la section correspondante.</p>
            </div>
            <div className="flex items-center gap-2">
              {ok && <span className="text-sm text-green font-semibold">Enregistrée</span>}
              <button disabled={!modifie} onClick={() => setMatrice(enregistree)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40">Annuler</button>
              <button
                disabled={!modifie}
                onClick={() => {
                  const modifiees = PERMISSIONS.filter((p) => JSON.stringify(matrice[p.id]) !== JSON.stringify(enregistree[p.id]));
                  sauvegarderMatrice(matrice);
                  journaliser(
                    "habilitations",
                    `Matrice modifiée : ${modifiees.map((p) => `${p.label} (${matrice[p.id].map((r) => ROLE_LABELS[r]).join(", ") || "aucun rôle"})`).join(" ; ")}`,
                    "/admin/roles",
                  );
                  setOk(true);
                }}
                className="btn-navy text-sm px-3 py-2 disabled:opacity-40"
              >
                Enregistrer la matrice
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th scope="col" className="p-3 text-left font-semibold sticky left-0 bg-white z-10 w-72">Permission</th>
                  {ROLES.map((r) => <th scope="col" key={r} className="p-2 font-semibold text-center normal-case tracking-normal">{ROLE_LABELS[r]}</th>)}
                </tr>
              </thead>
              {GROUPES.map((g) => (
                <tbody key={g}>
                  <tr><th scope="colgroup" colSpan={ROLES.length + 1} className="bg-gray-50 px-3 py-2 text-left text-xs font-bold text-navy uppercase">{g}</th></tr>
                  {PERMISSIONS.filter((p) => p.groupe === g).map((p) => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <th scope="row" className="p-3 text-left font-normal sticky left-0 bg-white z-10 w-72 shadow-[1px_0_0_rgba(27,42,74,0.08)]">
                        <span className="font-semibold text-gray-800">{p.label}</span>
                        {p.appliquee && <span className="ml-2 text-[10px] font-bold uppercase bg-blue/10 text-blue px-1.5 py-0.5 rounded">Bloquant</span>}
                        <span className="block text-xs text-gray-400">{p.desc}</span>
                      </th>
                      {ROLES.map((r) => {
                        // L'admin garde toujours l'administration, pour éviter de s'enfermer dehors.
                        const verrou = r === "admin" && p.groupe.startsWith("Administration");
                        return (
                          <td key={r} className="p-2 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${p.label} : ${ROLE_LABELS[r]}`}
                              className="accent-navy w-4 h-4"
                              checked={(matrice[p.id] ?? []).includes(r)}
                              disabled={verrou}
                              onChange={() => basculer(p.id, r)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
