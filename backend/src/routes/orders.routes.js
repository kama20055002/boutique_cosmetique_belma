'use strict';
// Monté automatiquement sur /api/orders par src/app.js
const express = require('express');
const { asyncHandler } = require('../utils/httpError');
const { authentifier, autoriser, ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/orders.controller');

const router = express.Router();

// Toutes les routes exigent un utilisateur connecté.
router.use(authentifier);

// Le client achète ; le personnel peut consulter et annuler (règles fines dans les services).
router.post('/', autoriser(ROLES.CLIENT), asyncHandler(ctrl.creer));
router.post('/:id/reserve', autoriser(ROLES.CLIENT), asyncHandler(ctrl.reserver));
router.post('/:id/pay', autoriser(ROLES.CLIENT), asyncHandler(ctrl.payer));
router.post('/:id/cancel', asyncHandler(ctrl.annuler));
router.get('/', autoriser(ROLES.CLIENT), asyncHandler(ctrl.lister));
router.get('/:id', asyncHandler(ctrl.detail));

module.exports = router;
