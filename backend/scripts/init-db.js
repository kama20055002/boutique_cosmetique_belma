'use strict';
// Crée la base et les tables à partir de database/schema.sql (ATTENTION : supprime les tables existantes).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8');
  const base = process.env.DB_NAME || 'boutique_cosmetique';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${base}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${base}\``);
    await conn.query(sql);
    console.log('Schéma créé avec succès.');
  } finally {
    await conn.end();
  }
})().catch((e) => { console.error('Échec :', e.message); process.exit(1); });
