const db = require('../config/db');

// 1. Lister les produits actifs avec recherche et filtres
exports.getProduits = (req, res) => {
    const { search, categorie_id, marque_id, prix_min, prix_max } = req.query;

    // Règle de gestion : afficher uniquement les produits actifs
    let sql = `
        SELECT p.id, p.nom, p.description, p.prix, p.image, p.quantite_stock,
               p.categorie_id, c.nom AS categorie_nom,
               p.marque_id, m.nom AS marque_nom
        FROM produits p
        JOIN categories c ON p.categorie_id = c.id
        LEFT JOIN marques m ON p.marque_id = m.id
        WHERE p.actif = TRUE
    `;
    const params = [];

    if (search) {
        sql += ` AND p.nom LIKE ?`;
        params.push(`%${search}%`);
    }
    if (categorie_id) {
        sql += ` AND p.categorie_id = ?`;
        params.push(categorie_id);
    }
    if (marque_id) {
        sql += ` AND p.marque_id = ?`;
        params.push(marque_id);
    }
    if (prix_min) {
        sql += ` AND p.prix >= ?`;
        params.push(Number(prix_min));
    }
    if (prix_max) {
        sql += ` AND p.prix <= ?`;
        params.push(Number(prix_max));
    }

    sql += ` ORDER BY p.date_creation DESC`;

    db.query(sql, params, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur lors de la récupération du catalogue', error: err.message });
        }
        res.status(200).json(results);
    });
};

// 2. Consulter les détails d'un produit précis
exports.getProduitById = (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT p.id, p.nom, p.description, p.prix, p.image, p.quantite_stock,
               c.nom AS categorie_nom, m.nom AS marque_nom
        FROM produits p
        JOIN categories c ON p.categorie_id = c.id
        LEFT JOIN marques m ON p.marque_id = m.id
        WHERE p.id = ? AND p.actif = TRUE
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur serveur', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Produit introuvable ou indisponible.' });
        }
        res.status(200).json(results[0]);
    });
};

// 3. Lister toutes les catégories
exports.getCategories = (req, res) => {
    db.query('SELECT id, nom, description FROM categories ORDER BY nom ASC', (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur lors de la récupération des catégories', error: err.message });
        }
        res.status(200).json(results);
    });
};

// 4. Lister toutes les marques
exports.getMarques = (req, res) => {
    db.query('SELECT id, nom FROM marques ORDER BY nom ASC', (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur lors de la récupération des marques', error: err.message });
        }
        res.status(200).json(results);
    });
};