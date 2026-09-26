const express = require('express');
const { db, logHistorique } = require('../db/database');

const router = express.Router();

function getAgent(id) {
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
}

function compterReferences(nom) {
  const affectations = db
    .prepare('SELECT COUNT(*) AS n FROM affectations WHERE agent = ?')
    .get(nom).n;
  const actions = db.prepare('SELECT COUNT(*) AS n FROM actions WHERE assignee = ?').get(nom).n;
  const responsable = db
    .prepare('SELECT COUNT(*) AS n FROM projets WHERE responsable = ?')
    .get(nom).n;
  const taches = db.prepare('SELECT COUNT(*) AS n FROM taches WHERE assignee = ?').get(nom).n;
  return affectations + actions + responsable + taches;
}

// GET /api/agents - lister les agents (actifs par défaut, ?tous=1 pour tout voir)
router.get('/', (req, res) => {
  const { equipe, tous } = req.query;
  let sql = 'SELECT * FROM agents WHERE 1=1';
  const params = [];
  if (!tous || tous === '0') {
    sql += ' AND actif = 1';
  }
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
  if (!nom || !nom.trim()) return res.status(400).json({ error: 'Le nom est requis' });
  if (!equipe || !String(equipe).trim()) return res.status(400).json({ error: "L'équipe est requise" });
  try {
    const info = db
      .prepare('INSERT INTO agents (nom, equipe, email) VALUES (?, ?, ?)')
      .run(nom.trim(), equipe, email);
    res.status(201).json(getAgent(info.lastInsertRowid));
  } catch (err) {
    res.status(409).json({ error: 'Un agent avec ce nom existe déjà' });
  }
});

// PATCH /api/agents/:id - mettre à jour (nom, équipe, email, actif)
router.patch('/:id', (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent introuvable' });

  const { nom, equipe, email, actif } = req.body;

  const nouveauNom = nom && nom.trim() ? nom.trim() : agent.nom;
  const nouvelleEquipe = equipe && String(equipe).trim() ? equipe : agent.equipe;
  const nouvelEmail = email !== undefined ? email : agent.email;
  const nouvelActif = actif !== undefined ? (actif ? 1 : 0) : agent.actif;

  const tx = db.transaction(() => {
    if (nouveauNom !== agent.nom) {
      // Propage le renommage vers les références textuelles existantes.
      db.prepare('UPDATE projets SET responsable = ? WHERE responsable = ?').run(nouveauNom, agent.nom);
      db.prepare('UPDATE actions SET assignee = ? WHERE assignee = ?').run(nouveauNom, agent.nom);
      db.prepare('UPDATE affectations SET agent = ? WHERE agent = ?').run(nouveauNom, agent.nom);
      db.prepare('UPDATE taches SET assignee = ? WHERE assignee = ?').run(nouveauNom, agent.nom);
    }
    db.prepare(
      'UPDATE agents SET nom = ?, equipe = ?, email = ?, actif = ? WHERE id = ?'
    ).run(nouveauNom, nouvelleEquipe, nouvelEmail, nouvelActif, agent.id);
  });

  try {
    tx();
  } catch (err) {
    return res.status(409).json({ error: 'Un agent avec ce nom existe déjà' });
  }

  logHistorique({
    entite_type: 'agent',
    entite_id: agent.id,
    action: 'update',
    champs_modifies: { nom: [agent.nom, nouveauNom], actif: [agent.actif, nouvelActif] },
    auteur: 'DSI',
  });

  res.json(getAgent(agent.id));
});

// DELETE /api/agents/:id - suppression définitive (uniquement si aucune référence)
router.delete('/:id', (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent introuvable' });

  if (compterReferences(agent.nom) > 0) {
    return res.status(409).json({
      error:
        "Cet agent est référencé dans des projets, actions ou affectations. Désactivez-le plutôt que de le supprimer.",
    });
  }

  db.prepare('DELETE FROM agents WHERE id = ?').run(agent.id);
  res.json({ success: true });
});

module.exports = router;
