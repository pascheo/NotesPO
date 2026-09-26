# NotesPO — Suivi de Projets Hebdomadaires

Application de suivi des points hebdomadaires pour la Sous-Direction Opérations
(DSI, Conseil Départemental des Yvelines). Elle gère les projets et actions des
4 équipes techniques : **Infrastructure**, **Développement**, **Réseau**, **Exploitation**.

Application 100 % locale : utilisateur unique, sans authentification, base
SQLite embarquée, aucune dépendance cloud.

## Stack technique

- **Backend** : Express.js + `better-sqlite3`, API REST
- **Frontend** : Vue 3 + TypeScript + Vite + Tailwind CSS (thème sombre), Pinia, Vue Router

## Démarrage rapide

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

## Modèle de données

Le schéma SQLite (`backend/db/init.sql`) définit les tables `projets`,
`actions`, `affectations`, `dependances`, `historique` (audit trail) et
`agents`. L'état **« En retard »** n'est jamais stocké directement : il est
recalculé à la volée dès que la date limite d'un projet est dépassée.

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
GET    /api/agents                 → lister les agents
POST   /api/affectations           → affecter un agent à un projet
GET    /api/affectations/charge    → charge par agent (Vue Gantt)
GET    /api/dependances            → gérer les dépendances (POST/DELETE)
GET    /api/historique             → audit trail
GET    /api/stats                  → indicateurs du dashboard
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

## Notes / limites connues (P1-P3)

- L'historique (audit trail) est enregistré en base à chaque création/mise à
  jour/archivage, mais n'a pas encore d'écran dédié dans l'interface.
- L'export Excel par équipe (Phase 3) n'est pas implémenté dans cette version.
- La recherche globale (Phase 4) n'est pas implémentée.
