const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/statistiques', adminController.getStatistiques);
router.get('/utilisateurs', adminController.getUtilisateurs);
router.patch('/utilisateurs/:id/role', adminController.modifierRoleUtilisateur);
router.get('/historique', adminController.getHistorique);

module.exports = router;