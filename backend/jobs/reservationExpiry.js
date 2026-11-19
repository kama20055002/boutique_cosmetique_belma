'use strict';
const { pool } = require('../config/db');

const INTERVALLE_MS = 60 * 1000; // vérification chaque minute

async function expirerReservations() {
  try {
    // À adapter à ta base : table, colonnes et statuts
    // const [res] = await pool.query(
    //   "UPDATE reservations SET statut = 'expiree' WHERE statut = 'en_attente' AND expire_le < NOW()"
    // );
    // if (res.affectedRows) console.log(`${res.affectedRows} réservation(s) expirée(s)`);
  } catch (err) {
    console.error('Erreur expiration réservations :', err.message);
  }
}

function demarrerExpirationReservations() {
  expirerReservations();
  return setInterval(expirerReservations, INTERVALLE_MS);
}

module.exports = { demarrerExpirationReservations };