'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { pool } = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1); // derrière Caddy / Nginx / le proxy de l'hébergeur (HTTPS)
app.disable('x-powered-by');

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : false }));
app.use(express.json({ limit: '10kb' }));

// Sonde de santé (healthcheck Docker, vérification de la mise en ligne)
app.get('/api/sante', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ statut: 'ok', base_de_donnees: 'ok' });
  } catch (_) {
    res.status(503).json({ statut: 'erreur', base_de_donnees: 'indisponible' });
  }
});

/**
 * Montage AUTOMATIQUE des routes : chaque fichier src/routes/<nom>.routes.js est exposé sur /api/<nom>.
 *   auth.routes.js      -> /api/auth        (Kama)
 *   orders.routes.js    -> /api/orders      (Kama)
 *   catalogue.routes.js -> /api/catalogue   (Gradie)
 *   cart.routes.js      -> /api/cart        (Gradie)
 * Personne n'a besoin de modifier app.js : on évite les conflits Git entre branches.
 */
const routesDir = path.join(__dirname, 'routes');
for (const fichier of fs.readdirSync(routesDir).sort()) {
  const m = fichier.match(/^(.+)\.routes\.js$/);
  if (!m) continue;
  app.use(`/api/${m[1]}`, require(path.join(routesDir, fichier)));
}

// Le frontend (dossier frontend/dist) est servi par Caddy : l'API ne sert que /api/*.

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
