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
Les annonces affichées sur le site (accueil, liste, fiche, carte, statistiques) sont lues dans la base, via `/api/annonces`. Si la base ne répond pas, le site affiche les annonces d'exemple embarquées.
La connexion est réelle : inscription, mot de passe et session sont gérés par le serveur (voir « Comptes et connexion »).
Les comptes (profil, dossier d'identité, abonnement, gestion par l'administration) et les annonces (publication, modification, retrait, mise en avant) sont eux aussi dans la base.
Le reste (dossiers de vente, offres, messagerie, visites, favoris, réglages de la plateforme) utilise encore les données du navigateur et basculera domaine par domaine.

| Commande | Effet |
|---|---|
| `npm run db:start` | Démarre la base locale de développement (port 5434, dossier `.pgdata`) |
| `npm run db:stop` | L'arrête |
| `npm run db:migrate` | Applique les changements du schéma à la base |
| `npm run db:seed` | Charge ou met à jour les données d'exemple |
| `npm run db:studio` | Ouvre un tableau pour consulter et modifier les données |

`npm run dev` démarre automatiquement la base locale si elle est arrêtée (par exemple après un redémarrage du PC).

L'adresse de la base se règle dans le fichier `.env` (modèle : `.env.example`), qui n'est jamais envoyé sur GitHub.
Pour utiliser une base hébergée (Supabase, Neon), remplacez `DATABASE_URL`, puis lancez `npx prisma migrate deploy` et `npm run db:seed`.

Le code serveur vit dans `lib/serveur/` et ne peut pas être importé par les pages qui s'exécutent dans le navigateur.

## Comptes et connexion

- Le mot de passe n'est jamais stocké, seulement son empreinte (bcrypt). Il fait 8 caractères au minimum.
- La session est un cookie illisible par JavaScript ; la base n'en garde que l'empreinte. Elle dure 30 jours.
- À l'inscription, on peut choisir acheteur, vendeur, agence, agent, notaire ou clerc. Les rôles modérateur et admin sont attribués par un administrateur.
- Après 8 mots de passe erronés sur un compte, la connexion à ce compte est bloquée 15 minutes.
- Suspendre un compte ou changer son rôle depuis l'administration ferme ses sessions ouvertes.
- Les pages de l'espace connecté et de l'administration renvoient vers la connexion sans session (`middleware.ts`).

Comptes de développement, créés par `npm run db:seed` à partir du fichier `.env` : les comptes d'exemple (`d.badiane@exemple.sn`, `a.diallo@exemple.sn`, etc.) partagent le mot de passe `MOT_DE_PASSE_DEMO`, et l'administrateur est défini par `ADMIN_EMAIL` et `ADMIN_MOT_DE_PASSE`.
En ligne, ne définissez pas `MOT_DE_PASSE_DEMO` et choisissez un vrai mot de passe administrateur.

Le code se trouve dans `lib/serveur/auth.ts` et `app/api/auth/`.

## Accès des visiteurs

Sans compte, on ne voit que la présentation du site : accueil, bienvenue, tarifs, guides, FAQ, contact, diaspora, annonceurs et pages légales.
Toute autre page (annonces, carte, outils, services, annuaires, espace personnel) renvoie vers la connexion, puis ramène la personne à la page demandée.
La liste des pages ouvertes est dans `lib/acces.ts` ; elle est appliquée par `middleware.ts` (serveur) et `components/GardeVisiteur.tsx` (navigateur).

## Annonces

- Publier : vendeur particulier (2 annonces actives), agence (1, 5 ou illimité selon l'abonnement), agent, administrateur.
- Modifier le titre, la description ou le prix : l'auteur de l'annonce ou un administrateur.
- Retirer ou remettre en ligne : l'auteur, un administrateur ou un modérateur. La remise en ligne compte dans le quota.
- Une annonce retirée n'est visible que de son auteur et de la modération.
- Les photos sont envoyées au serveur une par une (JPEG, PNG ou WebP, 2 Mo au maximum) et servies par `/api/fichiers/<id>`. Elles sont stockées dans la base pour l'instant ; `lib/serveur/fichiers.ts` est le seul fichier à changer pour les déplacer vers un stockage dédié.

Les règles sont dans `lib/serveur/annonces.ts`.

## Déploiement sur Vercel

Vercel compile avec `npm run vercel-build` : génération du client Prisma, migrations de la base (`scripts/migrer.mjs`), puis `next build`.

Variables à définir dans le projet Vercel (Settings → Environment Variables) :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Adresse de la base PostgreSQL (fournie automatiquement par l'intégration Neon de Vercel) |
| `DATABASE_URL_UNPOOLED` | Adresse directe, utilisée pour les migrations (fournie aussi par Neon ; sinon `DATABASE_URL` sert) |
| `ADMIN_EMAIL`, `ADMIN_MOT_DE_PASSE` | Premier compte administrateur |
| `SEED_AU_DEPLOIEMENT` | `1` au premier déploiement pour charger les données d'exemple et créer l'administrateur ; à retirer ensuite |

Ne définissez pas `MOT_DE_PASSE_DEMO` en ligne : sans lui, les comptes d'exemple existent mais personne ne peut s'y connecter.

## Location, programmes neufs, recherche sur carte, alertes

- **Location** : une annonce est « à vendre » ou « à louer ». En location, le prix est un loyer mensuel, avec charges, caution, meublé et nombre de pièces. La recherche, l'accueil et le menu proposent Acheter / Louer ; les statistiques de prix ne portent que sur les ventes.
- **Programmes neufs** (`/neuf`) : un programme d'un promoteur regroupe plusieurs lots avec leurs prix. Publication par les comptes Agence et l'administration (`/neuf/publier`). Code : `lib/serveur/programmes.ts`.
- **Liste + carte** : bouton dans la recherche (`?vue=carte`), résultats et carte côte à côte sur grand écran.
- **Alertes par email** : une recherche enregistrée est vérifiée chaque matin à 7 h (tâche planifiée dans `vercel.json`, route `/api/cron/alertes`) ; les nouvelles annonces correspondantes sont envoyées par email via Resend. Code : `lib/serveur/alertes.ts` et `lib/serveur/email.ts`.

## Sécurité

- Next.js 14.2.35 (corrige notamment le contournement du middleware).
- En-têtes de sécurité sur toutes les pages (`next.config.mjs`) : politique de contenu (CSP), interdiction d'affichage dans un cadre, HTTPS obligatoire, etc.
- Limitation des essais en série gardée en base (connexion, inscription, envois de photos, publications, alertes) : `lib/serveur/securite.ts`.
- Taille des requêtes plafonnée, requêtes venant d'un autre site refusées, mots de passe trop courants refusés.
- Actions d'administration tracées (rôles, suspensions, décisions d'identité, retraits d'annonces).

## Journaux et débogage

- Chaque requête reçoit un identifiant (`x-request-id`), repris dans toutes les lignes du journal.
- Le serveur écrit une ligne JSON par événement : dans le terminal en local, dans Vercel → projet → Logs en ligne. Niveau réglable par `LOG_LEVEL` (`debug`, `info`, `warn`, `erreur`) : `debug` par défaut en local, `info` en ligne.
- Les avertissements, erreurs et actions d'administration sont aussi gardés en base et consultables dans **Administration → Journal technique**, avec recherche par code ou par référence.
- Les erreurs du navigateur sont transmises au serveur (`/api/journal`). Une page qui plante affiche un code d'erreur ; une erreur du serveur affiche une référence. Avec ce code ou cette référence, on retrouve l'entrée exacte dans le journal technique.
- Rien de secret n'est écrit dans les journaux (mots de passe, jetons, cookies, images), et les emails y sont partiellement masqués.

## Variables d'environnement supplémentaires

| Variable | Rôle |
|---|---|
| `RESEND_API_KEY` | Clé du service d'envoi d'emails Resend. Sans elle, les alertes ne partent pas (elles sont seulement journalisées). |
| `EMAIL_EXPEDITEUR` | Expéditeur des emails, d'un domaine vérifié chez Resend (ex. `KEUR BI <alertes@keurbi.sn>`). |
| `CRON_SECRET` | Secret présenté par la tâche planifiée de Vercel ; sans lui, l'envoi des alertes est refusé. |
| `APP_URL` | Adresse publique du site, utilisée dans les liens des emails. |
| `LOG_LEVEL` | Niveau de détail du journal (facultatif). |
