'use strict';
require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET manquant ou trop court (32 caractères minimum). Vérifiez votre fichier .env.');
  process.exit(1);
}

const app = require('./app');
const { pool } = require('./config/db');
const { demarrerExpirationReservations } = require('./jobs/reservationExpiry');

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => console.log(`Serveur démarré sur le port ${port}`));
const timer = demarrerExpirationReservations();

function arreter(signal) {
  console.log(`${signal} reçu : arrêt en cours...`);
  clearInterval(timer);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGTERM', () => arreter('SIGTERM'));
process.on('SIGINT', () => arreter('SIGINT'));
