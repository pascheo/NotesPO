const express = require('express');
const { db, EQUIPES, etatEffectif } = require('../db/database');
const { calculerChargeParEquipe } = require('./projets');

const router = express.Router();

const POIDS_PRIORITE = { Faible: 1, Normale: 2, Haute: 3, Critique: 4 };

// GET /api/stats - indicateurs du dashboard (Vue Synthétique)
router.get('/', (req, res) => {
  const projets = db.prepare('SELECT * FROM projets WHERE archived = 0').all();
  const enrichis = projets.map((p) => ({ ...p, etat_effectif: etatEffectif(p) }));

  let sommePonderee = 0;
  let sommePoids = 0;
  for (const p of enrichis) {
    const poids = POIDS_PRIORITE[p.priorite] || 1;
    sommePonderee += p.progression_global * poids;
    sommePoids += poids;
  }
  const progressionGlobale = sommePoids ? Math.round(sommePonderee / sommePoids) : 0;

  const projetsEnCours = enrichis.filter((p) => p.etat_effectif === 'En cours').length;

  const projetsEnRetardIds = enrichis
    .filter((p) => p.etat_effectif === 'En retard')
    .map((p) => p.id);
  let actionsEnRetard = 0;
  if (projetsEnRetardIds.length > 0) {
    const placeholders = projetsEnRetardIds.map(() => '?').join(',');
    actionsEnRetard = db
      .prepare(
        `SELECT COUNT(*) AS n FROM actions
         WHERE projet_id IN (${placeholders}) AND etat != 'Terminé'`
      )
      .get(...projetsEnRetardIds).n;
  }

  const chargeParEquipe = calculerChargeParEquipe();
  const valeurs = EQUIPES.map((e) => chargeParEquipe[e] || 0);
  const chargeMoyenne = valeurs.length
    ? Math.round(valeurs.reduce((a, b) => a + b, 0) / valeurs.length)
    : 0;

  res.json({
    progression_globale: progressionGlobale,
    projets_en_cours: projetsEnCours,
    actions_en_retard: actionsEnRetard,
    charge_moyenne_equipe: chargeMoyenne,
    charge_par_equipe: chargeParEquipe,
    total_projets: enrichis.length,
    projets_en_retard: projetsEnRetardIds.length,
  });
});

module.exports = router;
