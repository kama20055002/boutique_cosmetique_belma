'use strict';
const { HttpError } = require('../utils/httpError');

function notFoundHandler(req, res) {
  res.status(404).json({ erreur: `Route introuvable : ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ erreur: err.message, ...(err.details ? { details: err.details } : {}) });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erreur: 'Corps JSON invalide.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ erreur: 'Requête trop volumineuse.' });

  // Erreur inattendue : on journalise côté serveur, on ne révèle rien au client.
  console.error('[erreur]', err);
  res.status(500).json({ erreur: 'Erreur interne du serveur.' });
}

module.exports = { notFoundHandler, errorHandler };
