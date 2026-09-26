const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

// GET /api/agents - lister les agents
router.get('/', (req, res) => {
  const { equipe } = req.query;
  let sql = 'SELECT * FROM agents WHERE actif = 1';
  const params = [];
  if (equipe) {
    sql += ' AND equipe = ?';
    params.push(equipe);
  }
  sql += ' ORDER BY nom ASC';
  res.json(db.prepare(sql).all(...params));
});

// POST /api/agents - créer un agent
router.post('/', (req, res) => {
  const { nom, equipe, email = '' } = req.body;
  if (!nom || !equipe) return res.status(400).json({ error: 'nom et equipe sont requis' });
  try {
    const info = db
      .prepare('INSERT INTO agents (nom, equipe, email) VALUES (?, ?, ?)')
      .run(nom.trim(), equipe, email);
    res.status(201).json(db.prepare('SELECT * FROM agents WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    res.status(409).json({ error: 'Un agent avec ce nom existe déjà' });
  }
});

module.exports = router;
