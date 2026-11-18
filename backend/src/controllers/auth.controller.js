'use strict';
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { badRequest, unauthorized, conflict } = require('../utils/httpError');
const { validerInscription, validerEmail } = require('../utils/validators');
const { signerToken } = require('../middleware/auth');

const BCRYPT_ROUNDS = 12;
// Hash factice : on compare toujours un mot de passe, même si l'email n'existe pas (anti-énumération par timing).
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice-1', 10);

/** POST /api/auth/register : crée toujours un compte « client » (jamais de rôle choisi par l'appelant). */
async function inscrire(req, res) {
  const erreurs = validerInscription(req.body);
  if (erreurs.length) throw badRequest('Données invalides.', erreurs);

  const { nom, prenom, mot_de_passe } = req.body;
  const email = req.body.email.trim().toLowerCase();

  const [existants] = await pool.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
  if (existants.length) throw conflict('Un compte existe déjà avec cet email.');

  const hash = await bcrypt.hash(mot_de_passe, BCRYPT_ROUNDS);
  let id;
  try {
    const [r] = await pool.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role_id)
       VALUES (?, ?, ?, ?, (SELECT id FROM roles WHERE nom = 'client'))`,
      [nom.trim(), prenom.trim(), email, hash]
    );
    id = r.insertId;
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw conflict('Un compte existe déjà avec cet email.');
    throw e;
  }

  const utilisateur = { id, nom: nom.trim(), prenom: prenom.trim(), email, role: 'client' };
  res.status(201).json({ utilisateur, token: signerToken(utilisateur) });
}

/** POST /api/auth/login */
async function connecter(req, res) {
  const { email, mot_de_passe } = req.body || {};
  if (!validerEmail(email) || typeof mot_de_passe !== 'string') throw badRequest('Email et mot de passe requis.');

  const [rows] = await pool.query(
    `SELECT u.id, u.nom, u.prenom, u.email, u.mot_de_passe_hash, u.actif, r.nom AS role
       FROM utilisateurs u JOIN roles r ON r.id = u.role_id
      WHERE u.email = ?`,
    [email.trim().toLowerCase()]
  );
  const u = rows[0];
  const ok = await bcrypt.compare(mot_de_passe, u ? u.mot_de_passe_hash : DUMMY_HASH);
  if (!u || !ok || !u.actif) throw unauthorized('Identifiants invalides.');

  const utilisateur = { id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role };
  res.json({ utilisateur, token: signerToken(utilisateur) });
}

/** GET /api/auth/me */
async function profil(req, res) {
  const [rows] = await pool.query(
    `SELECT u.id, u.nom, u.prenom, u.email, r.nom AS role, u.date_creation
       FROM utilisateurs u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
    [req.user.id]
  );
  res.json({ utilisateur: rows[0] });
}

module.exports = { inscrire, connecter, profil };
