const express = require('express');
const { db, withEtatEffectif } = require('../db/database');

const router = express.Router();

// GET /api/recherche?q=... - recherche globale (projets + actions)
router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({ projets: [], actions: [] });
  }
  const like = `%${q}%`;

  const projets = db
    .prepare(
      `SELECT * FROM projets
       WHERE archived = 0
         AND (nom LIKE ? OR description LIKE ? OR responsable LIKE ? OR notes LIKE ?)
       ORDER BY nom ASC
       LIMIT 20`
    )
    .all(like, like, like, like)
    .map(withEtatEffectif);

  const actions = db
    .prepare(
      `SELECT a.*, p.nom AS projet_nom, p.equipe AS projet_equipe
       FROM actions a
       JOIN projets p ON p.id = a.projet_id
       WHERE p.archived = 0 AND (a.description LIKE ? OR a.assignee LIKE ?)
       ORDER BY a.description ASC
       LIMIT 20`
    )
    .all(like, like);

  res.json({ projets, actions });
});

module.exports = router;
