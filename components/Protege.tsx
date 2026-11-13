"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role, User, useAuth } from "@/lib/auth";

export default function Protege({ roles, children }: { roles?: Role[]; children: (user: User) => ReactNode }) {
  const { user, pret } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (pret && !user) router.replace("/connexion");
  }, [pret, user, router]);

  if (!pret || !user) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Chargement…</div>;
  }
  if (roles && !roles.includes(user.role)) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Cet espace n&apos;est pas accessible avec votre rôle.</div>;
  }
  return <>{children(user)}</>;
}
