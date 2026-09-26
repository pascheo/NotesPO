-- Schéma de la base de suivi de projets hebdomadaires
PRAGMA foreign_keys = ON;

-- Agents (référence équipes)
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  equipe TEXT NOT NULL,
  email TEXT,
  actif BOOLEAN DEFAULT 1
);

-- Projets
CREATE TABLE IF NOT EXISTS projets (
  id INTEGER PRIMARY KEY,
  nom TEXT NOT NULL,
  equipe TEXT NOT NULL,
  description TEXT,
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_debut DATE,
  date_limite DATE NOT NULL,
  priorite TEXT DEFAULT 'Normale',
  etat TEXT DEFAULT 'À faire',
  progression_global INTEGER DEFAULT 0,
  responsable TEXT,
  notes TEXT,
  archived BOOLEAN DEFAULT 0,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Actions / Sous-tâches
CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assignee TEXT,
  progression INTEGER DEFAULT 0,
  etat TEXT DEFAULT 'À faire',
  ordre INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Affectations (projet <-> agent + allocation)
CREATE TABLE IF NOT EXISTS affectations (
  id INTEGER PRIMARY KEY,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  allocation_pourcentage INTEGER DEFAULT 50,
  role TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dépendances projet
CREATE TABLE IF NOT EXISTS dependances (
  id INTEGER PRIMARY KEY,
  projet_source INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  projet_cible INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'bloque',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tâches libres / TODO (non rattachées à un projet, assignables à un agent)
CREATE TABLE IF NOT EXISTS taches (
  id INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  assignee TEXT,
  notes TEXT,
  date_ouverture DATE DEFAULT (date('now')),
  date_prevue_fin DATE,
  etat TEXT DEFAULT 'À faire',
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Historique (audit trail)
CREATE TABLE IF NOT EXISTS historique (
  id INTEGER PRIMARY KEY,
  entite_type TEXT,
  entite_id INTEGER,
  action TEXT,
  champs_modifies TEXT,
  auteur TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projets_equipe ON projets(equipe);
CREATE INDEX IF NOT EXISTS idx_projets_archived ON projets(archived);
CREATE INDEX IF NOT EXISTS idx_actions_projet ON actions(projet_id);
CREATE INDEX IF NOT EXISTS idx_affectations_projet ON affectations(projet_id);
CREATE INDEX IF NOT EXISTS idx_dependances_source ON dependances(projet_source);
CREATE INDEX IF NOT EXISTS idx_dependances_cible ON dependances(projet_cible);
CREATE INDEX IF NOT EXISTS idx_historique_entite ON historique(entite_type, entite_id);
CREATE INDEX IF NOT EXISTS idx_taches_assignee ON taches(assignee);
CREATE INDEX IF NOT EXISTS idx_taches_etat ON taches(etat);
