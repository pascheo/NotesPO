const express = require('express');
const { db, todayISO, logHistorique } = require('../db/database');

const router = express.Router();

function getTache(id) {
  return db.prepare('SELECT * FROM taches WHERE id = ?').get(id);
}

// GET /api/taches - lister (filtres : assignee, etat)
router.get('/', (req, res) => {
  const { assignee, etat } = req.query;
  let sql = 'SELECT * FROM taches WHERE 1=1';
  const params = [];
  if (assignee) {
    sql += ' AND assignee = ?';
    params.push(assignee);
  }
  if (etat) {
    sql += ' AND etat = ?';
    params.push(etat);
  }
  sql += ' ORDER BY (date_prevue_fin IS NULL), date_prevue_fin ASC, date_ouverture ASC';
  res.json(db.prepare(sql).all(...params));
});

// POST /api/taches - créer une tâche libre
router.post('/', (req, res) => {
  const {
    description,
    assignee = '',
    notes = '',
    date_ouverture = todayISO(),
    date_prevue_fin = null,
    etat = 'À faire',
    created_by = 'DSI',
  } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'La description est requise' });
  }

  const info = db
    .prepare(
      `INSERT INTO taches (description, assignee, notes, date_ouverture, date_prevue_fin, etat, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(description.trim(), assignee, notes, date_ouverture, date_prevue_fin, etat, created_by);

  logHistorique({
    entite_type: 'tache',
    entite_id: info.lastInsertRowid,
    action: 'create',
    champs_modifies: { description, assignee },
    auteur: created_by,
  });

  res.status(201).json(getTache(info.lastInsertRowid));
});

const CHAMPS_MODIFIABLES = [
  'description',
  'assignee',
  'notes',
  'date_ouverture',
  'date_prevue_fin',
  'etat',
];

// PATCH /api/taches/:id
router.patch('/:id', (req, res) => {
  const tache = getTache(req.params.id);
  if (!tache) return res.status(404).json({ error: 'Tâche introuvable' });

  const patch = {};
  for (const champ of CHAMPS_MODIFIABLES) {
    if (champ in req.body) patch[champ] = req.body[champ];
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
  }

  const setClause = Object.keys(patch)
    .map((k) => `${k} = @${k}`)
    .join(', ');
  db.prepare(
    `UPDATE taches SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`
  ).run({ ...patch, id: tache.id });

  logHistorique({
    entite_type: 'tache',
    entite_id: tache.id,
    action: 'update',
    champs_modifies: patch,
    auteur: req.body.auteur || 'DSI',
  });

  res.json(getTache(tache.id));
});

// DELETE /api/taches/:id
router.delete('/:id', (req, res) => {
  const tache = getTache(req.params.id);
  if (!tache) return res.status(404).json({ error: 'Tâche introuvable' });

  db.prepare('DELETE FROM taches WHERE id = ?').run(tache.id);

  logHistorique({
    entite_type: 'tache',
    entite_id: tache.id,
    action: 'delete',
    champs_modifies: { description: tache.description },
    auteur: 'DSI',
  });

  res.json({ success: true });
});

module.exports = router;
