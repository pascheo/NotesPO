const express = require('express');
const cors = require('cors');

require('./db/database'); // initialise la base au démarrage

const projetsRouter = require('./routes/projets');
const actionsRouter = require('./routes/actions');
const affectationsRouter = require('./routes/affectations');
const agentsRouter = require('./routes/agents');
const historiqueRouter = require('./routes/historique');
const dependancesRouter = require('./routes/dependances');
const statsRouter = require('./routes/stats');
const rechercheRouter = require('./routes/recherche');
const exportRouter = require('./routes/export');
const tachesRouter = require('./routes/taches');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`);
  });
  next();
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/projets', projetsRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/affectations', affectationsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/historique', historiqueRouter);
app.use('/api/dependances', dependancesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/recherche', rechercheRouter);
app.use('/api/export', exportRouter);
app.use('/api/taches', tachesRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
  console.log(`API de suivi de projets démarrée sur http://localhost:${PORT}`);
});
