const express = require('express');
const {
  db,
  EQUIPES,
  PRIORITES,
  withEtatEffectif,
  etatEffectif,
  logHistorique,
} = require('../db/database');

const router = express.Router();

function getProjetRow(id) {
  return db.prepare('SELECT * FROM projets WHERE id = ?').get(id);
}

function serializeProjet(row) {
  return withEtatEffectif(row);
}

function diffChamps(oldRow, patch) {
  const diffs = {};
  for (const key of Object.keys(patch)) {
    if (!(key in oldRow)) continue;
    if (String(oldRow[key]) !== String(patch[key])) {
      diffs[key] = [oldRow[key], patch[key]];
    }
  }
  return diffs;
}

// GET /api/projets - liste avec filtres et tri
router.get('/', (req, res) => {
  const { equipe, etat, priorite, archived, sort } = req.query;
  let sql = 'SELECT * FROM projets WHERE 1=1';
  const params = [];

  sql += ' AND archived = ?';
  params.push(archived === '1' ? 1 : 0);

  if (equipe) {
    sql += ' AND equipe = ?';
    params.push(equipe);
  }
  if (priorite) {
    sql += ' AND priorite = ?';
    params.push(priorite);
  }

  let rows = db.prepare(sql).all(...params).map(serializeProjet);

  if (etat) {
    rows = rows.filter((p) => p.etat === etat);
  }

  switch (sort) {
    case 'deadline':
      rows.sort((a, b) => (a.date_limite || '').localeCompare(b.date_limite || ''));
      break;
    case 'progression':
      rows.sort((a, b) => a.progression_global - b.progression_global);
      break;
    case 'charge': {
      const chargeParEquipe = calculerChargeParEquipe();
      rows.sort(
        (a, b) => (chargeParEquipe[b.equipe] || 0) - (chargeParEquipe[a.equipe] || 0)
      );
      break;
    }
    default:
      rows.sort((a, b) => (a.date_limite || '').localeCompare(b.date_limite || ''));
  }

  res.json(rows);
});

function calculerChargeParEquipe() {
  const rows = db
    .prepare(
      `SELECT p.equipe, aff.allocation_pourcentage
       FROM affectations aff
       JOIN projets p ON p.id = aff.projet_id
       WHERE p.archived = 0`
    )
    .all();
  const totals = {};
  const counts = {};
  for (const r of rows) {
    totals[r.equipe] = (totals[r.equipe] || 0) + r.allocation_pourcentage;
    counts[r.equipe] = (counts[r.equipe] || 0) + 1;
  }
  const moyenne = {};
  for (const equipe of EQUIPES) {
    moyenne[equipe] = counts[equipe] ? Math.round(totals[equipe] / counts[equipe]) : 0;
  }
  return moyenne;
}

// GET /api/projets/_meta/referentiels (référentiel équipes/priorités) - utilitaire front
router.get('/_meta/referentiels', (req, res) => {
  res.json({ EQUIPES, PRIORITES });
});

// GET /api/projets/:id - détail complet
router.get('/:id', (req, res) => {
  const projet = getProjetRow(req.params.id);
  if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

  const actions = db
    .prepare('SELECT * FROM actions WHERE projet_id = ? ORDER BY ordre ASC, id ASC')
    .all(projet.id);
  const affectations = db
    .prepare('SELECT * FROM affectations WHERE projet_id = ? ORDER BY id ASC')
    .all(projet.id);
  const bloquePar = db
    .prepare(
      `SELECT d.id, d.projet_cible AS projet_id, p.nom, p.etat, p.progression_global
       FROM dependances d JOIN projets p ON p.id = d.projet_cible
       WHERE d.projet_source = ? AND d.type = 'bloque_par'`
    )
    .all(projet.id);
  const bloque = db
    .prepare(
      `SELECT d.id, d.projet_cible AS projet_id, p.nom, p.etat, p.progression_global
       FROM dependances d JOIN projets p ON p.id = d.projet_cible
       WHERE d.projet_source = ? AND d.type = 'bloque'`
    )
    .all(projet.id);

  res.json({
    ...serializeProjet(projet),
    actions,
    affectations,
    dependances: { bloque_par: bloquePar, bloque },
  });
});

// POST /api/projets - créer
router.post('/', (req, res) => {
  const {
    nom,
    equipe,
    description = '',
    date_debut = null,
    date_limite,
    priorite = 'Normale',
    etat = 'À faire',
    progression_global = 0,
    responsable = '',
    notes = '',
    created_by = 'DSI',
  } = req.body;

  if (!nom || !nom.trim()) return res.status(400).json({ error: 'Le nom du projet est requis' });
  if (!EQUIPES.includes(equipe)) return res.status(400).json({ error: 'Équipe invalide' });
  if (!date_limite) return res.status(400).json({ error: 'La date limite est requise' });
  if (!PRIORITES.includes(priorite)) return res.status(400).json({ error: 'Priorité invalide' });

  const info = db
    .prepare(
      `INSERT INTO projets
        (nom, equipe, description, date_debut, date_limite, priorite, etat,
         progression_global, responsable, notes, created_by)
       VALUES (@nom, @equipe, @description, @date_debut, @date_limite, @priorite, @etat,
               @progression_global, @responsable, @notes, @created_by)`
    )
    .run({
      nom: nom.trim(),
      equipe,
      description,
      date_debut,
      date_limite,
      priorite,
      etat,
      progression_global,
      responsable,
      notes,
      created_by,
    });

  logHistorique({
    entite_type: 'projet',
    entite_id: info.lastInsertRowid,
    action: 'create',
    champs_modifies: { nom, equipe },
    auteur: created_by,
  });

  res.status(201).json(serializeProjet(getProjetRow(info.lastInsertRowid)));
});

const CHAMPS_MODIFIABLES = [
  'nom',
  'equipe',
  'description',
  'date_debut',
  'date_limite',
  'priorite',
  'etat',
  'progression_global',
  'responsable',
  'notes',
];

// PATCH /api/projets/:id - mise à jour
router.patch('/:id', (req, res) => {
  const projet = getProjetRow(req.params.id);
  if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

  if (req.body.equipe && !EQUIPES.includes(req.body.equipe)) {
    return res.status(400).json({ error: 'Équipe invalide' });
  }
  if (req.body.priorite && !PRIORITES.includes(req.body.priorite)) {
    return res.status(400).json({ error: 'Priorité invalide' });
  }

  const patch = {};
  for (const champ of CHAMPS_MODIFIABLES) {
    if (champ in req.body) patch[champ] = req.body[champ];
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
  }

  const diffs = diffChamps(projet, patch);
  const setClause = Object.keys(patch)
    .map((k) => `${k} = @${k}`)
    .join(', ');
  db.prepare(
    `UPDATE projets SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`
  ).run({ ...patch, id: projet.id });

  if (Object.keys(diffs).length > 0) {
    logHistorique({
      entite_type: 'projet',
      entite_id: projet.id,
      action: 'update',
      champs_modifies: diffs,
      auteur: req.body.auteur || 'DSI',
    });
  }

  res.json(serializeProjet(getProjetRow(projet.id)));
});

// DELETE /api/projets/:id - soft delete (archivage)
router.delete('/:id', (req, res) => {
  const projet = getProjetRow(req.params.id);
  if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

  db.prepare(
    'UPDATE projets SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(projet.id);

  logHistorique({
    entite_type: 'projet',
    entite_id: projet.id,
    action: 'archive',
    champs_modifies: { archived: [0, 1] },
    auteur: req.body?.auteur || 'DSI',
  });

  res.json({ success: true });
});

// POST /api/projets/:id/actions - créer une action
router.post('/:id/actions', (req, res) => {
  const projet = getProjetRow(req.params.id);
  if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

  const { description, assignee = '', progression = 0, etat = 'À faire' } = req.body;
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'La description est requise' });
  }

  const maxOrdre = db
    .prepare('SELECT COALESCE(MAX(ordre), -1) AS m FROM actions WHERE projet_id = ?')
    .get(projet.id).m;

  const info = db
    .prepare(
      `INSERT INTO actions (projet_id, description, assignee, progression, etat, ordre)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(projet.id, description.trim(), assignee, progression, etat, maxOrdre + 1);

  logHistorique({
    entite_type: 'action',
    entite_id: info.lastInsertRowid,
    action: 'create',
    champs_modifies: { description },
    auteur: 'DSI',
  });

  res.status(201).json(db.prepare('SELECT * FROM actions WHERE id = ?').get(info.lastInsertRowid));
});

module.exports = router;
module.exports.calculerChargeParEquipe = calculerChargeParEquipe;
