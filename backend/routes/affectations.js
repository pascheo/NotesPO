const express = require('express');
const { db, logHistorique } = require('../db/database');

const router = express.Router();

// GET /api/affectations/charge - allocation par agent (utilisé par Vue Gantt)
router.get('/charge', (req, res) => {
  const affectations = db
    .prepare(
      `SELECT aff.id, aff.agent, aff.allocation_pourcentage, aff.role,
              p.id AS projet_id, p.nom AS projet_nom, p.equipe, p.archived
       FROM affectations aff
       JOIN projets p ON p.id = aff.projet_id
       WHERE p.archived = 0
       ORDER BY aff.agent ASC`
    )
    .all();

  const agents = db.prepare('SELECT nom, equipe FROM agents WHERE actif = 1').all();

  const parAgent = {};
  for (const agent of agents) {
    parAgent[agent.nom] = { agent: agent.nom, equipe: agent.equipe, projets: [], allocation_totale: 0 };
  }
  for (const a of affectations) {
    if (!parAgent[a.agent]) {
      parAgent[a.agent] = { agent: a.agent, equipe: a.equipe, projets: [], allocation_totale: 0 };
    }
    parAgent[a.agent].projets.push({
      projet_id: a.projet_id,
      nom: a.projet_nom,
      allocation: a.allocation_pourcentage,
      role: a.role,
    });
    parAgent[a.agent].allocation_totale += a.allocation_pourcentage;
  }

  res.json(Object.values(parAgent));
});

// POST /api/affectations - assigner un agent à un projet
router.post('/', (req, res) => {
  const { projet_id, agent, allocation_pourcentage = 50, role = 'Contributeur' } = req.body;
  if (!projet_id || !agent) {
    return res.status(400).json({ error: 'projet_id et agent sont requis' });
  }
  const projet = db.prepare('SELECT id FROM projets WHERE id = ?').get(projet_id);
  if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

  const info = db
    .prepare(
      `INSERT INTO affectations (projet_id, agent, allocation_pourcentage, role)
       VALUES (?, ?, ?, ?)`
    )
    .run(projet_id, agent, allocation_pourcentage, role);

  logHistorique({
    entite_type: 'projet',
    entite_id: projet_id,
    action: 'update',
    champs_modifies: { affectation_ajoutee: agent },
    auteur: 'DSI',
  });

  res.status(201).json(db.prepare('SELECT * FROM affectations WHERE id = ?').get(info.lastInsertRowid));
});

// PATCH /api/affectations/:id
router.patch('/:id', (req, res) => {
  const affectation = db.prepare('SELECT * FROM affectations WHERE id = ?').get(req.params.id);
  if (!affectation) return res.status(404).json({ error: 'Affectation introuvable' });

  const { allocation_pourcentage, role } = req.body;
  db.prepare(
    `UPDATE affectations SET
       allocation_pourcentage = COALESCE(@allocation_pourcentage, allocation_pourcentage),
       role = COALESCE(@role, role)
     WHERE id = @id`
  ).run({ allocation_pourcentage, role, id: affectation.id });

  res.json(db.prepare('SELECT * FROM affectations WHERE id = ?').get(affectation.id));
});

// DELETE /api/affectations/:id
router.delete('/:id', (req, res) => {
  const affectation = db.prepare('SELECT * FROM affectations WHERE id = ?').get(req.params.id);
  if (!affectation) return res.status(404).json({ error: 'Affectation introuvable' });

  db.prepare('DELETE FROM affectations WHERE id = ?').run(affectation.id);
  res.json({ success: true });
});

module.exports = router;
