const { db, EQUIPES } = require('./database');

const AGENTS = [
  { nom: 'Marc Lefevre', equipe: 'Infrastructure', email: 'marc.lefevre@yvelines.fr' },
  { nom: 'Sophie Nguyen', equipe: 'Infrastructure', email: 'sophie.nguyen@yvelines.fr' },
  { nom: 'Karim Benali', equipe: 'Développement', email: 'karim.benali@yvelines.fr' },
  { nom: 'Julie Marchand', equipe: 'Développement', email: 'julie.marchand@yvelines.fr' },
  { nom: 'Thomas Girard', equipe: 'Développement', email: 'thomas.girard@yvelines.fr' },
  { nom: 'Élodie Faure', equipe: 'Réseau', email: 'elodie.faure@yvelines.fr' },
  { nom: 'Nicolas Petit', equipe: 'Réseau', email: 'nicolas.petit@yvelines.fr' },
  { nom: 'Camille Roussel', equipe: 'Exploitation', email: 'camille.roussel@yvelines.fr' },
  { nom: 'Yann Dubreuil', equipe: 'Exploitation', email: 'yann.dubreuil@yvelines.fr' },
];

// Plan d'affectations conçu pour illustrer les 4 paliers de charge agent
// (surcharge >100%, élevée 75-100%, optimale 20-75%, sous-utilisé <20%).
const AFFECTATIONS_PLAN = {
  Infrastructure: [
    [{ agent: 'Marc Lefevre', allocation: 30, role: 'Responsable' }, { agent: 'Sophie Nguyen', allocation: 25, role: 'Contributeur' }],
    [{ agent: 'Marc Lefevre', allocation: 30, role: 'Responsable' }],
    [{ agent: 'Marc Lefevre', allocation: 30, role: 'Responsable' }],
    [{ agent: 'Marc Lefevre', allocation: 30, role: 'Responsable' }],
    [{ agent: 'Sophie Nguyen', allocation: 20, role: 'Responsable' }],
  ],
  'Développement': [
    [{ agent: 'Karim Benali', allocation: 45, role: 'Responsable' }],
    [{ agent: 'Karim Benali', allocation: 45, role: 'Responsable' }],
    [{ agent: 'Julie Marchand', allocation: 20, role: 'Responsable' }],
    [{ agent: 'Julie Marchand', allocation: 20, role: 'Responsable' }],
    [{ agent: 'Thomas Girard', allocation: 10, role: 'Contributeur' }],
  ],
  'Réseau': [
    [{ agent: 'Élodie Faure', allocation: 25, role: 'Responsable' }, { agent: 'Nicolas Petit', allocation: 15, role: 'Contributeur' }],
    [{ agent: 'Élodie Faure', allocation: 25, role: 'Responsable' }],
    [{ agent: 'Élodie Faure', allocation: 25, role: 'Responsable' }],
    [{ agent: 'Élodie Faure', allocation: 25, role: 'Responsable' }],
    [{ agent: 'Élodie Faure', allocation: 25, role: 'Responsable' }],
  ],
  Exploitation: [
    [{ agent: 'Camille Roussel', allocation: 30, role: 'Responsable' }],
    [{ agent: 'Camille Roussel', allocation: 30, role: 'Responsable' }],
    [{ agent: 'Camille Roussel', allocation: 30, role: 'Responsable' }],
    [{ agent: 'Yann Dubreuil', allocation: 20, role: 'Responsable' }],
    [{ agent: 'Yann Dubreuil', allocation: 20, role: 'Responsable' }],
  ],
};

const PRIORITES = ['Faible', 'Normale', 'Haute', 'Critique'];
// "En retard" n'est jamais saisi manuellement : il est dérivé de la date limite (cf. etatEffectif).
const ETATS_SAISIS = ['À faire', 'En cours'];
const PROGRESSIONS = [0, 25, 50, 75, 100];

const PROJETS_PAR_EQUIPE = {
  Infrastructure: [
    'Migration serveurs vers datacenter secondaire',
    'Renouvellement parc de baies de stockage',
    'Mise à niveau hyperviseurs VMware',
    "Plan de continuité d'activité (PCA)",
    'Refonte de la salle serveurs du siège',
  ],
  'Développement': [
    'Portail agents - module congés',
    'Refonte intranet départemental',
    "API d'interconnexion état civil",
    'Application mobile collège connecté',
    'Migration applicative vers .NET 8',
  ],
  'Réseau': [
    'Déploiement Wi-Fi collèges (phase 2)',
    'Renouvellement liens fibre inter-sites',
    'Segmentation réseau et VLAN sécurité',
    'Migration téléphonie vers ToIP',
    'Audit et durcissement pare-feux',
  ],
  Exploitation: [
    'Supervision unifiée des infrastructures',
    'Automatisation des sauvegardes',
    'Plan de reprise d\'activité (PRA) annuel',
    'Gestion des incidents - refonte process ITSM',
    'Optimisation des coûts cloud',
  ],
};

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function seed() {
  const tx = db.transaction(() => {
    db.exec(`
      DELETE FROM historique;
      DELETE FROM dependances;
      DELETE FROM affectations;
      DELETE FROM actions;
      DELETE FROM projets;
      DELETE FROM agents;
    `);
    const hasSequenceTable = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
      .get();
    if (hasSequenceTable) {
      db.exec(
        "DELETE FROM sqlite_sequence WHERE name IN ('projets','actions','affectations','dependances','historique','agents');"
      );
    }

    const insertAgent = db.prepare(
      'INSERT INTO agents (nom, equipe, email, actif) VALUES (?, ?, ?, 1)'
    );
    for (const a of AGENTS) insertAgent.run(a.nom, a.equipe, a.email);

    const insertProjet = db.prepare(`
      INSERT INTO projets
        (nom, equipe, description, date_debut, date_limite, priorite, etat,
         progression_global, responsable, notes, created_by)
      VALUES (@nom, @equipe, @description, @date_debut, @date_limite, @priorite, @etat,
              @progression_global, @responsable, @notes, @created_by)
    `);
    const insertAction = db.prepare(`
      INSERT INTO actions (projet_id, description, assignee, progression, etat, ordre)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertAffectation = db.prepare(`
      INSERT INTO affectations (projet_id, agent, allocation_pourcentage, role)
      VALUES (?, ?, ?, ?)
    `);

    const today = new Date();
    const projetIdsByEquipe = {};

    let offset = 0;
    for (const equipe of EQUIPES) {
      projetIdsByEquipe[equipe] = [];
      const agentsEquipe = AGENTS.filter((a) => a.equipe === equipe);
      const noms = PROJETS_PAR_EQUIPE[equipe];

      noms.forEach((nom, idx) => {
        offset += 1;
        const priorite = PRIORITES[(idx + offset) % PRIORITES.length];
        const progression = PROGRESSIONS[idx % PROGRESSIONS.length];
        const etat = progression === 100 ? 'Terminé' : ETATS_SAISIS[idx % ETATS_SAISIS.length];
        // Décale les échéances pour obtenir un mélange projets en retard / à venir
        const dateDebut = addDays(today, -30 + idx * 5);
        const dateLimite =
          idx === 0 ? addDays(today, -5) : addDays(today, 15 + idx * 12);
        const planAffectations = AFFECTATIONS_PLAN[equipe][idx];
        const responsable =
          planAffectations.find((a) => a.role === 'Responsable')?.agent ?? planAffectations[0].agent;

        const info = insertProjet.run({
          nom,
          equipe,
          description: `Projet ${nom.toLowerCase()} porté par l'équipe ${equipe}.`,
          date_debut: dateDebut,
          date_limite: dateLimite,
          priorite,
          etat,
          progression_global: progression,
          responsable,
          notes: '',
          created_by: 'DSI',
        });
        const projetId = info.lastInsertRowid;
        projetIdsByEquipe[equipe].push(projetId);

        const sousActions = [
          'Cadrage et recueil des besoins',
          'Mise en œuvre technique',
          'Tests et validation',
          'Déploiement et clôture',
        ];
        sousActions.forEach((desc, aIdx) => {
          const actionProgress = aIdx * 33 <= progression ? Math.min(100, progression) : 0;
          insertAction.run(
            projetId,
            desc,
            agentsEquipe[aIdx % agentsEquipe.length].nom,
            PROGRESSIONS[Math.min(4, Math.round(actionProgress / 25))],
            actionProgress >= 100 ? 'Terminé' : actionProgress > 0 ? 'En cours' : 'À faire',
            aIdx
          );
        });

        planAffectations.forEach((a) => {
          insertAffectation.run(projetId, a.agent, a.allocation, a.role);
        });
      });
    }

    // Quelques dépendances inter-projets illustratives
    const infra = projetIdsByEquipe['Infrastructure'];
    const dev = projetIdsByEquipe['Développement'];
    const reseau = projetIdsByEquipe['Réseau'];
    const insertDep = db.prepare(
      'INSERT INTO dependances (projet_source, projet_cible, type) VALUES (?, ?, ?)'
    );
    if (infra[0] && dev[1]) insertDep.run(dev[1], infra[0], 'bloque_par');
    if (reseau[0] && infra[2]) insertDep.run(infra[2], reseau[0], 'bloque_par');
  });

  tx();
  console.log('Base de données initialisée avec les données de test (20 projets, 4 équipes).');
}

seed();
