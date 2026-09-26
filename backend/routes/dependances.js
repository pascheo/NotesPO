const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

// POST /api/dependances - créer un lien de dépendance entre deux projets
router.post('/', (req, res) => {
  const { projet_source, projet_cible, type = 'bloque' } = req.body;
  if (!projet_source || !projet_cible) {
    return res.status(400).json({ error: 'projet_source et projet_cible sont requis' });
  }
  if (Number(projet_source) === Number(projet_cible)) {
    return res.status(400).json({ error: "Un projet ne peut pas dépendre de lui-même" });
  }

  const info = db
    .prepare('INSERT INTO dependances (projet_source, projet_cible, type) VALUES (?, ?, ?)')
    .run(projet_source, projet_cible, type);

  res.status(201).json(db.prepare('SELECT * FROM dependances WHERE id = ?').get(info.lastInsertRowid));
});

// DELETE /api/dependances/:id
router.delete('/:id', (req, res) => {
  const dep = db.prepare('SELECT * FROM dependances WHERE id = ?').get(req.params.id);
  if (!dep) return res.status(404).json({ error: 'Dépendance introuvable' });
  db.prepare('DELETE FROM dependances WHERE id = ?').run(dep.id);
  res.json({ success: true });
});

module.exports = router;
