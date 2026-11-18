'use strict';
const { badRequest } = require('./httpError');

/** Convertit un paramètre d'URL en entier positif, sinon 400. */
function idValide(valeur, nom = 'id') {
  const n = Number(valeur);
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`${nom} invalide.`);
  return n;
}

module.exports = { idValide };
