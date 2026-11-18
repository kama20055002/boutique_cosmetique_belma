'use strict';
// Monté automatiquement sur /api/paiements par src/app.js
const express = require('express');
const { asyncHandler } = require('../utils/httpError');
const { authentifier } = require('../middleware/auth');
const { listerTransactions } = require('../services/payment.service');

const router = express.Router();
router.use(authentifier);

/** GET /api/paiements : transactions (paiements + remboursements) du client ; toutes pour le personnel. */
router.get('/', asyncHandler(async (req, res) => {
  const paiements = await listerTransactions(req.user, { limite: req.query.limite, decalage: req.query.decalage });
  res.json({ paiements });
}));

module.exports = router;
