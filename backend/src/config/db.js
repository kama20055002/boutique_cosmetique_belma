'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'boutique',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'boutique_cosmetique',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: 'Z',
  decimalNumbers: false, // DECIMAL reste une chaîne : on convertit en cents (voir utils/money.js)
});

/**
 * Exécute `fn(conn)` dans une transaction. COMMIT si succès, ROLLBACK si erreur.
 * Toutes les opérations sensibles (commande, paiement, stock) passent par ici.
 */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* connexion déjà perdue */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction };
