import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ChargeurAnnonces from "@/components/ChargeurAnnonces";
import RapportErreurs from "@/components/RapportErreurs";
import MaintenanceGate from "@/components/MaintenanceGate";
import GardeVisiteur from "@/components/GardeVisiteur";
import PopupHost from "@/components/PopupHost";
import Newsletter from "@/components/Newsletter";
import { SCRIPT_THEME } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const display = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-display", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "KEUR BI — Immobilier au Sénégal",
  description: "Achetez, vendez et vérifiez des biens immobiliers au Sénégal. Titres Fonciers vérifiés, transactions sécurisées.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body>
        <AuthProvider>
          <ChargeurAnnonces />
          <RapportErreurs />
          <Navbar />
          <main>
            <MaintenanceGate>
              <GardeVisiteur>{children}</GardeVisiteur>
            </MaintenanceGate>
          </main>
          <PopupHost />
          <footer className="relative bg-navy-dark text-white/60 text-sm pt-12 pb-8 mt-20 print:hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-gold-light to-blue" />
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-8">
              <div className="max-w-xs">
                <div className="font-display text-white font-extrabold text-xl mb-2">
                  KEUR<span className="text-gold">BI</span>
                </div>
                <p className="text-sm leading-relaxed">
                  La plateforme immobilière de confiance au Sénégal : Titres Fonciers vérifiés, notaires partenaires, transactions suivies de bout en bout.
                </p>
                <Newsletter />
              </div>
              <div className="flex gap-10 text-sm flex-wrap">
                <div>
                  <div className="text-white font-semibold mb-2">Plateforme</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/annonces" className="hover:text-gold">
                      Annonces
                    </Link>
                    <Link href="/carte" className="hover:text-gold">
                      Carte interactive
                    </Link>
                    <Link href="/comparer" className="hover:text-gold">
                      Comparateur
                    </Link>
                    <Link href="/notaires" className="hover:text-gold">
                      Notaires
                    </Link>
                    <Link href="/quartiers" className="hover:text-gold">
                      Guide des quartiers
                    </Link>
                    <Link href="/statistiques" className="hover:text-gold">
                      Statistiques du marché
                    </Link>
                  </div>
                </div>
                <div>
                  <div className="text-white font-semibold mb-2">Ressources</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/guides" className="hover:text-gold">
                      Guide d&apos;achat
                    </Link>
                    <Link href="/faq" className="hover:text-gold">
                      FAQ
                    </Link>
                    <Link href="/estimer" className="hover:text-gold">
                      Estimer mon bien
                    </Link>
                    <Link href="/budget" className="hover:text-gold">
                      Calculer mon budget
                    </Link>
                    <Link href="/frais" className="hover:text-gold">
                      Simulateur de frais
                    </Link>
                    <Link href="/financement" className="hover:text-gold">
                      Comparer les crédits
                    </Link>
                    <Link href="/services" className="hover:text-gold">
                      Services à la carte
                    </Link>
                    <Link href="/diaspora" className="hover:text-gold">
                      Espace diaspora
                    </Link>
                    <Link href="/tarifs" className="hover:text-gold">
                      Abonnements & plans
                    </Link>
                  </div>
                </div>
                <div>
                  <div className="text-white font-semibold mb-2">Légal</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/legal/cgu" className="hover:text-gold">
                      CGU
                    </Link>
                    <Link href="/legal/confidentialite" className="hover:text-gold">
                      Confidentialité
                    </Link>
                    <Link href="/legal/mentions" className="hover:text-gold">
                      Mentions légales
                    </Link>
                    <Link href="/annonceurs" className="hover:text-gold">
                      Annoncer sur KEUR BI
                    </Link>
                    <Link href="/contact" className="hover:text-gold">
                      Contact
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 mt-10 pt-5 border-t border-white/10 text-xs">© 2026 KEUR BI · Dakar, Sénégal</div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
