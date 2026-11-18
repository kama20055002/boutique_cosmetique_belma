const express = require('express');
const router = express.Router();
const gestionController = require('../controllers/gestionController');

// Routes produits & stock
router.get('/produits', gestionController.getTousLesProduits);
router.post('/produits', gestionController.ajouterProduit);
router.put('/produits/:id', gestionController.modifierProduit);
router.patch('/produits/:id/stock', gestionController.modifierStock);
router.patch('/produits/:id/statut', gestionController.changerStatutProduit);

// Routes livraisons
router.get('/livraisons', gestionController.getLivraisons);
router.patch('/livraisons/:id/statut', gestionController.modifierStatutLivraison);

module.exports = router;