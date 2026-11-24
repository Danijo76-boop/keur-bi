"use client";
import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bug, Coins, FileSpreadsheet, Flag, ScrollText, Settings, ShieldCheck, Users } from "@/components/icones";
import Protege from "@/components/Protege";
import { Role } from "@/lib/auth";
import { sectionsAdminOuvertes, useMatrice } from "@/lib/permissions";

const LIENS = [
  { href: "/admin", label: "Vue d'ensemble", icone: BarChart3 },
  { href: "/admin/utilisateurs", label: "Utilisateurs & KYC", icone: Users },
  { href: "/admin/moderation", label: "Modération", icone: Flag },
  { href: "/admin/roles", label: "Rôles & habilitations", icone: ShieldCheck },
  { href: "/admin/parametres", label: "Paramètres", icone: Settings },
  { href: "/admin/reporting", label: "Reporting & export", icone: FileSpreadsheet },
  { href: "/admin/revenus", label: "Revenus", icone: Coins },
  { href: "/admin/journal", label: "Journal d'activité", icone: ScrollText },
  { href: "/admin/journal-technique", label: "Journal technique", icone: Bug },
];

// L'accès se décide section par section, d'après la matrice des habilitations et non d'après le seul rôle admin.
function Espace({ role, children }: { role: Role; children: ReactNode }) {
  const chemin = usePathname();
  const ouvertes = sectionsAdminOuvertes(useMatrice(), role);
  const liens = LIENS.filter((l) => ouvertes.includes(l.href));

  if (liens.length === 0) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Cet espace n&apos;est pas accessible avec votre rôle.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[14rem_1fr] gap-6">
      {/* Sur téléphone, les entrées passent à la ligne : toutes restent visibles sans faire défiler. */}
      <nav className="card p-2 h-fit flex flex-wrap lg:flex-col lg:flex-nowrap gap-1 print:hidden" aria-label="Administration">
        {liens.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={chemin === l.href ? "page" : undefined}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${chemin === l.href ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <l.icone size={16} /> {l.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">
        {ouvertes.includes(chemin) ? (
          children
        ) : (
          <div className="card p-10 text-center text-gray-500">
            <p className="mb-2">Votre rôle n&apos;est pas habilité pour cette section.</p>
            <Link href={liens[0].href} className="text-blue font-medium hover:underline">
              Aller à « {liens[0].label} » →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Protege>{(user) => <Espace role={user.role}>{children}</Espace>}</Protege>;
}
