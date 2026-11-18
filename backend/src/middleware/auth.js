'use strict';
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { unauthorized, forbidden, asyncHandler } = require('../utils/httpError');

const ROLES = Object.freeze({ CLIENT: 'client', GESTIONNAIRE: 'gestionnaire', ADMIN: 'administrateur' });

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET manquant ou trop court (32 caractères minimum).');
  }
  return secret;
}

function signerToken(utilisateur) {
  return jwt.sign({ sub: utilisateur.id, role: utilisateur.role }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRATION || '2h',
  });
}

/**
 * Vérifie le jeton « Authorization: Bearer <jwt> » puis recharge l'utilisateur en base
 * (un compte désactivé ou dont le rôle a changé est pris en compte immédiatement).
 * Place { id, email, role } dans req.user.
 */
const authentifier = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, getSecret());
  } catch (_) {
    throw unauthorized('Jeton invalide ou expiré.');
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.actif, r.nom AS role
       FROM utilisateurs u JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?`,
    [payload.sub]
  );
  const u = rows[0];
  if (!u || !u.actif) throw unauthorized('Compte introuvable ou désactivé.');
  req.user = { id: u.id, email: u.email, role: u.role };
  next();
});

/** Contrôle d'accès par rôle : router.get('/x', authentifier, autoriser('administrateur')) */
const autoriser = (...rolesAutorises) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!rolesAutorises.includes(req.user.role)) return next(forbidden('Rôle insuffisant pour cette action.'));
  next();
};

const estPersonnel = (user) => user && (user.role === ROLES.GESTIONNAIRE || user.role === ROLES.ADMIN);

module.exports = { ROLES, signerToken, authentifier, autoriser, estPersonnel };
