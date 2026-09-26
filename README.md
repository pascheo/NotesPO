# NotesPO — Suivi de Projets Hebdomadaires

Application de suivi des points hebdomadaires pour la Sous-Direction Opérations
(DSI, Conseil Départemental des Yvelines). Elle gère les projets et actions des
4 équipes techniques : **Infrastructure**, **Développement**, **Réseau**, **Exploitation**.

Application 100 % locale : utilisateur unique, sans authentification, base
SQLite embarquée, aucune dépendance cloud.

## Stack technique

- **Backend** : Express.js + `better-sqlite3`, API REST
- **Frontend** : Vue 3 + TypeScript + Vite + Tailwind CSS (thème sombre), Pinia, Vue Router

## Démarrage rapide (macOS, sans Terminal)

Une fois le dépôt cloné, deux scripts à double-cliquer dans le Finder :

- **`demarrer.command`** : installe les dépendances si besoin, démarre le
  backend et le frontend, puis ouvre automatiquement http://localhost:5173
  dans le navigateur. Au tout premier lancement, la base de données est vide
  (voir « Charger les données de démonstration » ci-dessous si vous en avez besoin).
- **`arreter.command`** : arrête les deux serveurs.

Au tout premier double-clic, macOS peut afficher un avertissement de
sécurité (« développeur non identifié ») : clic droit sur le fichier →
**Ouvrir** → confirmer. Cette étape n'est nécessaire qu'une seule fois.

## Démarrage manuel (ligne de commande)

### 1. Backend (API + base SQLite)

```bash
cd backend
npm install
npm run seed   # initialise la base avec 20 projets de démonstration
npm start      # démarre l'API sur http://localhost:3001
```

### 2. Frontend

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev    # démarre l'interface sur http://localhost:5173
```

Le serveur de développement Vite proxifie automatiquement les appels `/api/*`
vers le backend (voir `vite.config.ts`).

### Build de production du frontend

```bash
cd frontend
npm run build     # génère frontend/dist (fichiers statiques)
npm run preview   # sert le build de production
```

## Fonctionnalités

- **Vue Synthétique** : cartes de statistiques (réalisation globale, projets en
  cours, actions en retard, charge moyenne par équipe), liste des projets
  triable et filtrable, création de projet.
- **Vue Kanban** : 4 colonnes (À faire / En cours / En retard / Terminé),
  déplacement des projets par glisser-déposer, détection automatique du retard
  selon la date limite.
- **Planning Gantt** : timeline annuelle par équipe (zoom mois / trimestre /
  année), barres colorées par équipe avec progression, table de charge par
  agent avec alertes de surcharge (🔴 >100 %, 🟡 75-100 %, 🟢 20-75 %, ⚪ <20 %).
- **Vue Détail Projet** : informations générales, actions/sous-tâches (CRUD
  inline), affectations d'agents avec allocation %, dépendances entre projets,
  notes libres, archivage (soft delete).
- **Historique** : journal des créations/mises à jour/archivages (projets,
  actions, agents), filtrable, avec lien direct vers l'élément concerné.
- **Export Excel** : export des projets (par équipe ou toutes équipes
  confondues) depuis la Vue Synthétique.
- **Recherche globale** : recherche instantanée sur les projets et les
  actions depuis le menu latéral.
- **Gestion des agents** : création, renommage, changement d'équipe (libre,
  ex. « Direction » pour un agent hors des 4 équipes techniques),
  activation/désactivation et suppression des membres des équipes.
- **Tâches** : micro-tâches libres assignables à un agent, non rattachées à
  un projet (sujet, notes libres, date d'ouverture, date prévue de fin
  modifiable, état).
- **Revue Fares** : écran dédié au point hebdomadaire Pascal Olivier / Fares
  Tabet — liste des projets en cours à questionner, ajout rapide d'un
  nouveau projet (créateur : Pascal Olivier) ou d'une action sur un projet
  existant (assignable à Pascal Olivier ou tout autre agent), et panneau de
  micro-sujets en vrac (même liste que l'écran Tâches).

## Modèle de données

Le schéma SQLite (`backend/db/init.sql`) définit les tables `projets`,
`actions`, `affectations`, `dependances`, `historique` (audit trail),
`agents` et `taches` (micro-tâches libres). L'état **« En retard »** n'est
jamais stocké directement : il est recalculé à la volée dès que la date
limite d'un projet est dépassée.

## API REST (résumé)

```
GET    /api/projets                → liste (filtres: equipe, etat, priorite, sort)
GET    /api/projets/:id            → détail complet (actions, affectations, dépendances)
POST   /api/projets                → créer
PATCH  /api/projets/:id            → mettre à jour
DELETE /api/projets/:id            → archiver (soft delete)
POST   /api/projets/:id/actions    → ajouter une action
PATCH  /api/actions/:id            → mettre à jour une action
DELETE /api/actions/:id            → supprimer une action
GET    /api/agents                 → lister les agents (?tous=1 pour inclure les désactivés)
POST   /api/agents                 → créer un agent
PATCH  /api/agents/:id             → mettre à jour un agent (nom, équipe, email, actif)
DELETE /api/agents/:id             → supprimer un agent (refusé s'il est référencé)
POST   /api/affectations           → affecter un agent à un projet
GET    /api/affectations/charge    → charge par agent (Vue Gantt)
GET    /api/dependances            → gérer les dépendances (POST/DELETE)
GET    /api/historique             → audit trail
GET    /api/stats                  → indicateurs du dashboard
GET    /api/recherche?q=...        → recherche globale (projets + actions)
GET    /api/export/projets         → export Excel (?equipe=... optionnel)
GET    /api/taches                 → lister les tâches (filtres: assignee, etat)
POST   /api/taches                 → créer une tâche libre
PATCH  /api/taches/:id             → mettre à jour une tâche
DELETE /api/taches/:id             → supprimer une tâche
```

## Structure du projet

```
NotesPO/
├── backend/
│   ├── server.js
│   ├── db/ (init.sql, database.js, seed.js)
│   └── routes/ (projets, actions, affectations, agents, historique, dependances, stats)
├── frontend/
│   └── src/ (components, views, stores, router, api, types, utils)
└── README.md
```

## Charger les données de démonstration (optionnel)

Par défaut, une base vide se crée toute seule au premier lancement. Pour la
remplir avec 20 projets d'exemple répartis sur les 4 équipes :

```bash
cd backend
npm run seed
```

## Réinitialiser les données

Pour repartir sur une base vide (vos propres projets et agents), serveurs
arrêtés (ou via `arreter.command`) :

```bash
rm -f backend/db/suivi.db backend/db/suivi.db-wal backend/db/suivi.db-shm
```

Ajoutez ensuite vos agents depuis l'écran **Agents** de l'application.
