# KEUR GUI

Plateforme immobilière pour le Sénégal (Next.js 14, TypeScript, Tailwind). Version de démonstration : les données sont stockées dans le navigateur, sans serveur ni base de données.

## Lancer le projet

```bash
npm install
npm run dev      # http://localhost:3000
```

Ne pas lancer `npm run build` pendant que `npm run dev` tourne : les deux écrivent dans `.next` et le serveur de développement se met à renvoyer des pages blanches. En cas de doute, arrêter le serveur, supprimer `.next`, relancer.

## Qualité du code

| Commande | Effet |
|---|---|
| `npm run verifier` | Tout en une fois : types, lint, mise en forme, tests |
| `npm run types` | Vérifie les types TypeScript |
| `npm run lint` | ESLint (règles officielles Next.js), aucun avertissement toléré |
| `npm run format` | Met le code en forme (Prettier) ; `npm run format:verifier` contrôle sans modifier |
| `npm test` | Tests automatiques (Vitest) ; `npm run test:surveiller` les relance à chaque modification |

- **Tests unitaires** (`tests/unitaires`) : règles des mots de passe, numéros WhatsApp, adresses de photos, contenu des PDF et des fichiers Excel, droits de publication. Ils tournent sans base de données.
- **Tests d'intégration** (`tests/integration`) : limitation des essais, connexion en deux temps, mot de passe oublié, envoi WhatsApp → SMS → email (simulé), règles de publication. Ils utilisent une vraie base PostgreSQL, désignée par `DATABASE_URL`, et sont ignorés si elle n'est pas définie. **Ne jamais les lancer sur la base de production** : ils créent puis suppriment des comptes en `…@tests.keurbi`.
- **Vérification automatique** (`.github/workflows/verifications.yml`) : à chaque pull request, GitHub lance types, lint, mise en forme, tests (avec une base jetable) et build. Une pull request en échec ne doit pas être fusionnée ; pour l'imposer, activer la protection de la branche `main` (Settings → Branches → exiger la vérification « Types, lint, format, tests et build »).

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

- Le mot de passe n'est jamais stocké, seulement son empreinte (bcrypt). Un nouveau mot de passe doit faire 10 caractères au minimum, avec au moins une lettre et un chiffre, ne pas contenir l'adresse email ni figurer parmi les mots de passe les plus courants. Les règles sont cochées en direct pendant la saisie.
- La session est un cookie illisible par JavaScript ; la base n'en garde que l'empreinte. Elle dure 30 jours.
- À l'inscription, on peut choisir acheteur, vendeur, agence, agent, notaire ou clerc. Les rôles modérateur et admin sont attribués par un administrateur.
- Après 8 mots de passe erronés sur un compte, la connexion à ce compte est bloquée 15 minutes. La personne est prévenue quand il lui reste 3 essais, puis voit combien de minutes il reste avant le déblocage.
- **Mot de passe oublié** (`/mot-de-passe-oublie`) : un code est envoyé sur le numéro WhatsApp déjà vérifié du compte (WhatsApp, sinon SMS), à défaut par email. Il permet de choisir un nouveau mot de passe ; toutes les sessions ouvertes sont alors fermées. La page répond de la même façon que l'adresse soit inscrite ou non.
- **Alertes de sécurité** : à chaque connexion et à chaque changement de mot de passe, un message (WhatsApp avec le modèle `WHATSAPP_MODELE_ALERTE`, sinon SMS, et email si Resend est configuré) indique la date, l'appareil et la marche à suivre si ce n'est pas la personne. Code `lib/serveur/alertes-securite.ts`.
- Administration → Vue d'ensemble affiche si la double vérification est active, et sinon quelles variables ajouter.
- **Double vérification par WhatsApp, SMS ou email** : après le mot de passe, un code à 6 chiffres est envoyé sur WhatsApp (SMS puis email en secours) ; la session ne s'ouvre qu'une fois le code saisi. À l'inscription, le numéro WhatsApp est obligatoire et vérifié de la même façon. Un compte sans numéro (comptes anciens) en indique un à sa prochaine connexion. Code `lib/serveur/otp.ts`, `lib/serveur/whatsapp.ts` et `lib/serveur/sms.ts`.
  - Si WhatsApp n'aboutit pas (numéro sans WhatsApp, panne), le code part automatiquement par SMS, puis par email ; la personne peut aussi choisir « Recevoir par SMS » ou « Recevoir par email ». Avec l'email seul configuré (`RESEND_API_KEY`), la double vérification fonctionne déjà. SMS via Orange pour les numéros sénégalais (+221), via Twilio pour les autres (et pour tous si Orange n'est pas configuré).
  - Un code vaut 10 minutes, 5 essais au maximum ; un nouveau code peut être demandé toutes les 30 secondes, et 6 codes par heure au plus vers un même numéro.
  - Une fois vérifié, le numéro ne peut pas être changé avec le seul mot de passe : en cas de téléphone perdu, un administrateur l'efface (Administration → Utilisateurs → « Réinitialiser le numéro WhatsApp ») et la personne en indique un nouveau à sa connexion suivante.
  - Envoi par l'API WhatsApp de Meta (voir « Déploiement sur Vercel »). Sans aucun moyen d'envoi configuré (WhatsApp, SMS ou email), en local, le code s'affiche à l'écran (mode démo) ; en ligne, la double vérification est désactivée et une erreur est notée dans le journal technique. `OTP_WHATSAPP=off` la désactive partout.
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
- Chaque photo est vérifiée dès son ajout, avant d'être enregistrée (`lib/serveur/moderation-image.ts`). Elle est examinée par Claude (API Anthropic) et refusée si elle montre de la nudité ou un contenu sexuel, de la violence ou du sang, un message haineux, un contenu choquant (arme, drogue, cadavre, maltraitance), des données personnelles lisibles (pièce d'identité, carte bancaire, document nominatif) ou un enfant reconnaissable. La personne voit le motif du refus ; le refus est noté dans le journal technique.
  - Réglage : variable `ANTHROPIC_API_KEY`. Sans elle, en local, la vérification est sautée ; en ligne, les photos sont refusées tant que la clé manque (`MODERATION_IMAGES=off` coupe la vérification).
  - Si le service de vérification ne répond pas, la photo est refusée et la personne est invitée à réessayer : aucune photo n'est publiée sans contrôle.

Les règles sont dans `lib/serveur/annonces.ts`.

## Déploiement sur Vercel

**Adresses du site** : `keur-gui.vercel.app` (adresse principale Vercel) ; `keur-bi.vercel.app` et `keurbi.sn` restent actives pour les anciens liens. Le domaine `keurgui.sn` est à acheter auprès d'un bureau d'enregistrement sénégalais, puis à ajouter au projet Vercel (Settings → Domains) ; `keurbi.sn` pourra alors rediriger vers lui.

Vercel compile avec `npm run vercel-build` : génération du client Prisma, migrations de la base (`scripts/migrer.mjs`), puis `next build`.

Variables à définir dans le projet Vercel (Settings → Environment Variables) :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Adresse de la base PostgreSQL (fournie automatiquement par l'intégration Neon de Vercel) |
| `DATABASE_URL_UNPOOLED` | Adresse directe, utilisée pour les migrations (fournie aussi par Neon ; sinon `DATABASE_URL` sert) |
| `ADMIN_EMAIL`, `ADMIN_MOT_DE_PASSE` | Premier compte administrateur |
| `ANTHROPIC_API_KEY` | Vérification du contenu des photos envoyées et assistant de discussion (clé à créer sur console.anthropic.com) ; sans elle, l'assistant affiche « pas encore activé » |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Envoi des codes de connexion par WhatsApp : jeton d'accès permanent et identifiant du numéro expéditeur (Meta Business → WhatsApp Manager) |
| `WHATSAPP_MODELE_ALERTE` | Facultatif : modèle « Utilité » approuvé par Meta pour les alertes de connexion, avec deux variables ({{1}} l'évènement, {{2}} la date et l'appareil) |
| `RESEND_API_KEY`, `EMAIL_EXPEDITEUR` | Emails (alertes de recherche, codes de vérification en secours, alertes de sécurité) |
| `WHATSAPP_MODELE`, `WHATSAPP_LANGUE` | Facultatif : nom et langue du modèle de message « Authentification » approuvé par Meta (par défaut `code_connexion`, `fr`) |
| `ORANGE_CLIENT_ID`, `ORANGE_CLIENT_SECRET` | SMS de secours vers les numéros sénégalais (Orange SMS API, developer.orange.com). Facultatif : `ORANGE_SMS_EXPEDITEUR` (défaut `tel:+2210000`), `ORANGE_SMS_NOM` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | SMS de secours vers les autres numéros (et tous si Orange manque). `TWILIO_MESSAGING_SERVICE_SID` peut remplacer `TWILIO_FROM` |
| `SEED_AU_DEPLOIEMENT` | `1` au premier déploiement pour charger les données d'exemple et créer l'administrateur ; à retirer ensuite |

Ne définissez pas `MOT_DE_PASSE_DEMO` en ligne : sans lui, les comptes d'exemple existent mais personne ne peut s'y connecter.

## Location, programmes neufs, recherche sur carte, alertes

- **Location** : une annonce est « à vendre » ou « à louer ». En location, le prix est un loyer mensuel, avec charges, caution, meublé et nombre de pièces. La recherche, l'accueil et le menu proposent Acheter / Louer ; les statistiques de prix ne portent que sur les ventes.
- **Programmes neufs** (`/neuf`) : un programme d'un promoteur regroupe plusieurs lots avec leurs prix. Publication par les comptes Agence et l'administration (`/neuf/publier`). Code : `lib/serveur/programmes.ts`.
- **Liste + carte** : bouton dans la recherche (`?vue=carte`), résultats et carte côte à côte sur grand écran.
- **Alertes par email** : une recherche enregistrée est vérifiée chaque matin à 7 h (tâche planifiée dans `vercel.json`, route `/api/cron/alertes`) ; les nouvelles annonces correspondantes sont envoyées par email via Resend. Code : `lib/serveur/alertes.ts` et `lib/serveur/email.ts`.

## Sécurité

- Next.js 15.5 et React 19 : versions sans faille connue au dernier contrôle (voir « Analyse avec Trivy »).
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
| `EMAIL_EXPEDITEUR` | Expéditeur des emails, d'un domaine vérifié chez Resend (ex. `KEUR GUI <alertes@keurgui.sn>`). |
| `CRON_SECRET` | Secret présenté par la tâche planifiée de Vercel ; sans lui, l'envoi des alertes est refusé. |
| `APP_URL` | Adresse publique du site, utilisée dans les liens des emails et des alertes (par défaut `https://keur-gui.vercel.app`). |
| `LOG_LEVEL` | Niveau de détail du journal (facultatif). |

## Analyse avec Trivy

[Trivy](https://trivy.dev) recherche les failles connues dans les dépendances, les secrets écrits dans le code et les erreurs de configuration.

```
npm run securite
```

- Réglages dans `trivy.yaml` : dossiers générés et fichiers de réglages locaux (`.env`, `.env.local`, jamais envoyés sur GitHub) exclus, sévérités moyenne à critique.
- Pour inclure les outils de développement : `npm run securite -- --include-dev-deps`.
- Si la mise à jour de la base de failles échoue (réseau), relancer avec `--skip-db-update` pour utiliser la dernière base téléchargée.
- Quand une sous-dépendance vulnérable n'est pas encore corrigée par le paquet qui l'embarque, sa version est forcée dans la section `overrides` de `package.json` (aujourd'hui : PostCSS dans Next.js, deepmerge-ts et effect dans Prisma).

Dernier contrôle (22/11/2026) : aucune faille, aucun secret.
