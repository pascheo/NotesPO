const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

const ACTIONS_LABELS = {
  create: 'Création',
  update: 'Mise à jour',
  delete: 'Suppression',
  archive: 'Archivage',
};

function enrichir(rows) {
  const projetIds = [...new Set(rows.filter((r) => r.entite_type === 'projet').map((r) => r.entite_id))];
  const actionIds = [...new Set(rows.filter((r) => r.entite_type === 'action').map((r) => r.entite_id))];

  const projets = new Map();
  if (projetIds.length > 0) {
    const placeholders = projetIds.map(() => '?').join(',');
    db.prepare(`SELECT id, nom FROM projets WHERE id IN (${placeholders})`)
      .all(...projetIds)
      .forEach((p) => projets.set(p.id, p.nom));
  }

  const agentIds = [...new Set(rows.filter((r) => r.entite_type === 'agent').map((r) => r.entite_id))];
  const agents = new Map();
  if (agentIds.length > 0) {
    const placeholders = agentIds.map(() => '?').join(',');
    db.prepare(`SELECT id, nom FROM agents WHERE id IN (${placeholders})`)
      .all(...agentIds)
      .forEach((a) => agents.set(a.id, a.nom));
  }

  const actions = new Map();
  if (actionIds.length > 0) {
    const placeholders = actionIds.map(() => '?').join(',');
    db.prepare(
      `SELECT a.id, a.description, a.projet_id, p.nom AS projet_nom
       FROM actions a LEFT JOIN projets p ON p.id = a.projet_id
       WHERE a.id IN (${placeholders})`
    )
      .all(...actionIds)
      .forEach((a) => actions.set(a.id, a));
  }

  return rows.map((r) => {
    let libelle = null;
    let projet_id = null;
    if (r.entite_type === 'projet') {
      libelle = projets.get(r.entite_id) || r.champs_modifies?.nom?.[1] || r.champs_modifies?.nom || `Projet #${r.entite_id}`;
      projet_id = r.entite_id;
    } else if (r.entite_type === 'action') {
      const a = actions.get(r.entite_id);
      libelle = a?.description || r.champs_modifies?.description || `Action #${r.entite_id}`;
      projet_id = a?.projet_id ?? null;
    } else if (r.entite_type === 'agent') {
      libelle = agents.get(r.entite_id) || r.champs_modifies?.nom?.[1] || `Agent #${r.entite_id}`;
    }
    return {
      ...r,
      libelle,
      projet_id,
      projet_nom: projet_id ? projets.get(projet_id) || actions.get(r.entite_id)?.projet_nom : null,
      action_label: ACTIONS_LABELS[r.action] || r.action,
    };
  });
}

// GET /api/historique - audit trail, filtrable par entité
router.get('/', (req, res) => {
  const { entite_type, entite_id, limit = 200 } = req.query;
  let sql = 'SELECT * FROM historique WHERE 1=1';
  const params = [];
  if (entite_type) {
    sql += ' AND entite_type = ?';
    params.push(entite_type);
  }
  if (entite_id) {
    sql += ' AND entite_id = ?';
    params.push(entite_id);
  }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(Number(limit));

  const rows = db.prepare(sql).all(...params).map((r) => ({
    ...r,
    champs_modifies: r.champs_modifies ? JSON.parse(r.champs_modifies) : null,
  }));

  res.json(enrichir(rows));
});

module.exports = router;
