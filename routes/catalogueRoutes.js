const express = require('express');
const router = express.Router();
const catalogueController = require('../controllers/catalogueController');

router.get('/produits', catalogueController.getProduits);
router.get('/produits/:id', catalogueController.getProduitById);
router.get('/categories', catalogueController.getCategories);
router.get('/marques', catalogueController.getMarques);

module.exports = router;