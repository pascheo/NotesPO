const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

// GET /api/historique - audit trail, filtrable par entité
router.get('/', (req, res) => {
  const { entite_type, entite_id, limit = 100 } = req.query;
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
  res.json(rows);
});

module.exports = router;
