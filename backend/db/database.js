const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'suivi.db');
const INIT_SQL_PATH = path.join(__dirname, 'init.sql');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(fs.readFileSync(INIT_SQL_PATH, 'utf8'));

const EQUIPES = ['Infrastructure', 'Développement', 'Réseau', 'Exploitation'];
const PRIORITES = ['Faible', 'Normale', 'Haute', 'Critique'];
const ETATS = ['À faire', 'En cours', 'En retard', 'Terminé'];

const EQUIPE_COULEURS = {
  Infrastructure: '#FF6B6B',
  'Développement': '#4ECDC4',
  'Réseau': '#45B7D1',
  Exploitation: '#FFA07A',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// L'état "En retard" n'est pas persisté par les mises à jour manuelles :
// il est dérivé à la volée pour rester cohérent avec la date du jour.
function etatEffectif(projet) {
  if (!projet) return projet;
  if (projet.etat !== 'Terminé' && projet.date_limite && projet.date_limite < todayISO()) {
    return 'En retard';
  }
  return projet.etat;
}

function withEtatEffectif(projet) {
  if (!projet) return projet;
  return { ...projet, etat: etatEffectif(projet), etat_saisi: projet.etat };
}

function logHistorique({ entite_type, entite_id, action, champs_modifies, auteur }) {
  db.prepare(
    `INSERT INTO historique (entite_type, entite_id, action, champs_modifies, auteur)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    entite_type,
    entite_id,
    action,
    champs_modifies ? JSON.stringify(champs_modifies) : null,
    auteur || 'DSI'
  );
}

module.exports = {
  db,
  EQUIPES,
  PRIORITES,
  ETATS,
  EQUIPE_COULEURS,
  todayISO,
  etatEffectif,
  withEtatEffectif,
  logHistorique,
};
