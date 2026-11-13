# KEUR BI

Plateforme immobilière pour le Sénégal (Next.js 14, TypeScript, Tailwind). Version de démonstration : les données sont stockées dans le navigateur, sans serveur ni base de données.

## Lancer le projet

```bash
npm install
npm run dev      # http://localhost:3000
```

Ne pas lancer `npm run build` pendant que `npm run dev` tourne : les deux écrivent dans `.next` et le serveur de développement se met à renvoyer des pages blanches. En cas de doute, arrêter le serveur, supprimer `.next`, relancer.

## Organisation du code

Le dossier `app/` est scindé en trois parties. Les parenthèses sont des « groupes de routes » Next.js : elles rangent le code sans apparaître dans les adresses (`app/(public)/annonces` répond toujours à `/annonces`).

| Dossier | Contenu | Accès |
|---|---|---|
| `app/(public)/` | Accueil, annonces, carte, quartiers, outils (estimer, budget, frais, financement), services, diaspora, annonceurs, tarifs, guides, connexion | Tout visiteur |
| `app/(espace)/` | Tableau de bord, dossiers, messagerie, favoris, profil, KYC, publication, calendrier | Utilisateur connecté (garde dans `app/(espace)/layout.tsx`) |
| `app/admin/` | Utilisateurs, modération, rôles, paramètres, reporting, revenus, journal | Selon la matrice des habilitations (`app/admin/layout.tsx`) |

- `components/` : briques d'interface réutilisables.
- `lib/` : données et règles métier. Tout le stockage passe par `lib/stockage.ts` ; c'est la couche à remplacer le jour où une base de données arrive.

## Modules activables

Les modules se coupent et se rallument dans Administration → Paramètres → Fonctionnalités (`flags` dans `lib/parametres.ts`).

- `cadastre` : vérification des Titres Fonciers auprès du cadastre et de la DGID. **En pause par défaut**, le temps de réunir les informations du cadastre. Module coupé : la page de suivi des TF, les demandes de vérification et l'étape « TF vérifié » des dossiers ne bloquent plus rien ; les badges restent affichés à titre déclaratif.
- `publicite` : encarts sponsorisés de partenaires sur les pages publiques.

## Sources de revenus

Regroupées dans `lib/revenus.ts` et `lib/publicite.ts`, visibles dans Administration → Revenus : commission sur vente, abonnements, boosts, services à la carte, mises en relation bancaires, publicité partenaires. Les prix sont des hypothèses à valider.


## Base de données

La base est en PostgreSQL, décrite dans `prisma/schema.prisma` et pilotée par Prisma.
Pour l'instant, seules les routes `/api/annonces` et `/api/annonces/[id]` la lisent : les pages utilisent encore les données du navigateur et basculeront domaine par domaine.

| Commande | Effet |
|---|---|
| `npm run db:start` | Démarre la base locale de développement (port 5434, dossier `.pgdata`) |
| `npm run db:stop` | L'arrête |
| `npm run db:migrate` | Applique les changements du schéma à la base |
| `npm run db:seed` | Charge ou met à jour les données d'exemple |
| `npm run db:studio` | Ouvre un tableau pour consulter et modifier les données |

La base locale ne redémarre pas toute seule après un redémarrage du PC : lancez `npm run db:start`.

L'adresse de la base se règle dans le fichier `.env` (modèle : `.env.example`), qui n'est jamais envoyé sur GitHub.
Pour utiliser une base hébergée (Supabase, Neon), remplacez `DATABASE_URL`, puis lancez `npx prisma migrate deploy` et `npm run db:seed`.

Le code serveur vit dans `lib/serveur/` et ne peut pas être importé par les pages qui s'exécutent dans le navigateur.
