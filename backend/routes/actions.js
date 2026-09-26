const express = require('express');
const { db, logHistorique } = require('../db/database');

const router = express.Router();

const CHAMPS_MODIFIABLES = ['description', 'assignee', 'progression', 'etat', 'ordre'];

// PATCH /api/actions/:id
router.patch('/:id', (req, res) => {
  const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id);
  if (!action) return res.status(404).json({ error: 'Action introuvable' });

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
    `UPDATE actions SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`
  ).run({ ...patch, id: action.id });

  logHistorique({
    entite_type: 'action',
    entite_id: action.id,
    action: 'update',
    champs_modifies: patch,
    auteur: req.body.auteur || 'DSI',
  });

  res.json(db.prepare('SELECT * FROM actions WHERE id = ?').get(action.id));
});

// DELETE /api/actions/:id
router.delete('/:id', (req, res) => {
  const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id);
  if (!action) return res.status(404).json({ error: 'Action introuvable' });

  db.prepare('DELETE FROM actions WHERE id = ?').run(action.id);

  logHistorique({
    entite_type: 'action',
    entite_id: action.id,
    action: 'delete',
    champs_modifies: { description: action.description },
    auteur: 'DSI',
  });

  res.json({ success: true });
});

module.exports = router;
