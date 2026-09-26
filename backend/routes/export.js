const express = require('express');
const ExcelJS = require('exceljs');
const { db, EQUIPES, withEtatEffectif } = require('../db/database');

const router = express.Router();

const COLONNES = [
  { header: 'Nom du projet', key: 'nom', width: 40 },
  { header: 'Équipe', key: 'equipe', width: 16 },
  { header: 'Priorité', key: 'priorite', width: 12 },
  { header: 'État', key: 'etat', width: 14 },
  { header: 'Progression (%)', key: 'progression_global', width: 16 },
  { header: 'Date de début', key: 'date_debut', width: 14 },
  { header: 'Date limite', key: 'date_limite', width: 14 },
  { header: 'Responsable', key: 'responsable', width: 20 },
  { header: 'Description', key: 'description', width: 50 },
];

function remplirFeuille(feuille, projets) {
  feuille.columns = COLONNES;
  feuille.getRow(1).font = { bold: true };
  feuille.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1C202B' },
  };
  feuille.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  projets.forEach((p) => feuille.addRow(p));
  feuille.autoFilter = { from: 'A1', to: `I${projets.length + 1}` };
}

// GET /api/export/projets?equipe=Infrastructure (optionnel)
router.get('/projets', async (req, res) => {
  const { equipe, archived } = req.query;

  if (equipe && !EQUIPES.includes(equipe)) {
    return res.status(400).json({ error: 'Équipe invalide' });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Suivi de Projets - DSI Yvelines';
  workbook.created = new Date();

  const archivedFlag = archived === '1' ? 1 : 0;

  if (equipe) {
    const projets = db
      .prepare('SELECT * FROM projets WHERE equipe = ? AND archived = ? ORDER BY date_limite ASC')
      .all(equipe, archivedFlag)
      .map(withEtatEffectif);
    remplirFeuille(workbook.addWorksheet(equipe), projets);
  } else {
    for (const e of EQUIPES) {
      const projets = db
        .prepare('SELECT * FROM projets WHERE equipe = ? AND archived = ? ORDER BY date_limite ASC')
        .all(e, archivedFlag)
        .map(withEtatEffectif);
      remplirFeuille(workbook.addWorksheet(e), projets);
    }
    const tous = db
      .prepare('SELECT * FROM projets WHERE archived = ? ORDER BY equipe ASC, date_limite ASC')
      .all(archivedFlag)
      .map(withEtatEffectif);
    remplirFeuille(workbook.addWorksheet('Tous les projets'), tous);
  }

  const nomFichier = equipe
    ? `projets_${equipe.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`
    : `projets_toutes_equipes_${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);

  await workbook.xlsx.write(res);
  res.end();
});

module.exports = router;
