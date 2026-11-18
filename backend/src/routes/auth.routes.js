'use strict';
// Monté automatiquement sur /api/auth par src/app.js (voir la tâche orders_payment_api).
const express = require('express');
const rateLimit = require('express-rate-limit');
const { asyncHandler } = require('../utils/httpError');
const { authentifier } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

// Limite les tentatives (force brute) : 20 requêtes / 15 min / IP sur login et register.
const limiteur = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erreur: 'Trop de tentatives, réessayez plus tard.' },
});

router.post('/register', limiteur, asyncHandler(ctrl.inscrire));
router.post('/login', limiteur, asyncHandler(ctrl.connecter));
router.get('/me', authentifier, asyncHandler(ctrl.profil));

module.exports = router;
