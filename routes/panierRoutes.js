const express = require('express');
const router = express.Router();
const panierController = require('../controllers/panierController');

router.get('/:utilisateur_id', panierController.getPanier);
router.post('/ajouter', panierController.ajouterAuPanier);
router.put('/modifier/:detail_id', panierController.modifierQuantite);
router.delete('/supprimer/:detail_id', panierController.supprimerDuPanier);

module.exports = router;