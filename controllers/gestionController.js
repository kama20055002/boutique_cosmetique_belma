const db = require('../config/db');

// 1. Lister TOUS les produits (actifs et inactifs) avec indicateur de stock faible
exports.getTousLesProduits = (req, res) => {
    const sql = `
        SELECT p.id, p.nom, p.description, p.prix, p.image, p.quantite_stock,
               p.actif, p.categorie_id, c.nom AS categorie_nom,
               p.marque_id, m.nom AS marque_nom,
               CASE 
                   WHEN p.quantite_stock = 0 THEN 'Rupture'
                   WHEN p.quantite_stock <= 5 THEN 'Stock faible'
                   ELSE 'En stock'
               END AS etat_stock
        FROM produits p
        JOIN categories c ON p.categorie_id = c.id
        LEFT JOIN marques m ON p.marque_id = m.id
        ORDER BY p.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur récupération produits', error: err.message });
        res.status(200).json(results);
    });
};

// 2. Ajouter un nouveau produit
exports.ajouterProduit = (req, res) => {
    const { nom, description, prix, image, quantite_stock, categorie_id, marque_id } = req.body;

    if (!nom || prix === undefined || !categorie_id) {
        return res.status(400).json({ message: 'Les champs nom, prix et categorie_id sont obligatoires.' });
    }

    const sql = `
        INSERT INTO produits (nom, description, prix, image, quantite_stock, categorie_id, marque_id, actif)
        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
    `;
    const params = [
        nom,
        description || '',
        Number(prix),
        image || 'default.jpg',
        Number(quantite_stock) || 0,
        categorie_id,
        marque_id || null
    ];

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ message: 'Erreur lors de l\'ajout du produit', error: err.message });
        res.status(201).json({ message: 'Produit créé avec succès.', produit_id: result.insertId });
    });
};

// 3. Modifier les informations d'un produit
exports.modifierProduit = (req, res) => {
    const { id } = req.params;
    const { nom, description, prix, image, quantite_stock, categorie_id, marque_id } = req.body;

    const sql = `
        UPDATE produits
        SET nom = ?, description = ?, prix = ?, image = ?, quantite_stock = ?, categorie_id = ?, marque_id = ?
        WHERE id = ?
    `;
    const params = [nom, description, Number(prix), image, Number(quantite_stock), categorie_id, marque_id || null, id];

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ message: 'Erreur modification produit', error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Produit introuvable.' });

        res.status(200).json({ message: 'Produit mis à jour avec succès.' });
    });
};

// 4. Mettre à jour uniquement le stock d'un produit
exports.modifierStock = (req, res) => {
    const { id } = req.params;
    const { quantite_stock } = req.body;

    if (quantite_stock === undefined || Number(quantite_stock) < 0) {
        return res.status(400).json({ message: 'La quantité en stock doit être supérieure ou égale à 0.' });
    }

    db.query('UPDATE produits SET quantite_stock = ? WHERE id = ?', [Number(quantite_stock), id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erreur mise à jour stock', error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Produit introuvable.' });

        res.status(200).json({ message: 'Stock mis à jour avec succès.' });
    });
};

// 5. Retirer (désactiver) ou réactiver un produit (suppression logique)
exports.changerStatutProduit = (req, res) => {
    const { id } = req.params;
    const { actif } = req.body; // true ou false

    db.query('UPDATE produits SET actif = ? WHERE id = ?', [Boolean(actif), id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erreur changement statut', error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Produit introuvable.' });

        const etat = actif ? 'activé' : 'retiré du catalogue';
        res.status(200).json({ message: `Produit ${etat} avec succès.` });
    });
};

// 6. Lister toutes les livraisons avec les infos de commande et client
exports.getLivraisons = (req, res) => {
    const sql = `
        SELECT l.id AS livraison_id, l.commande_id, l.adresse, l.date_expedition, l.date_livraison,
               l.statut AS statut_livraison, c.montant_total, c.statut AS statut_commande,
               u.nom AS client_nom, u.email AS client_email
        FROM livraisons l
        JOIN commandes c ON l.commande_id = c.id
        JOIN utilisateurs u ON c.utilisateur_id = u.id
        ORDER BY l.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur récupération livraisons', error: err.message });
        res.status(200).json(results);
    });
};

// 7. Mettre à jour le statut d'une livraison (et synchroniser la commande)
exports.modifierStatutLivraison = (req, res) => {
    const { id } = req.params; // ID de la livraison
    const { statut } = req.body; // 'En attente', 'En préparation', 'Expédiée', 'Livrée'

    const statutsValides = ['En attente', 'En préparation', 'Expédiée', 'Livrée'];
    if (!statutsValides.includes(statut)) {
        return res.status(400).json({ message: 'Statut de livraison invalide.' });
    }

    let sql = 'UPDATE livraisons SET statut = ?';
    if (statut === 'Expédiée') {
        sql += ', date_expedition = NOW()';
    } else if (statut === 'Livrée') {
        sql += ', date_livraison = NOW()';
    }
    sql += ' WHERE id = ?';

    db.query(sql, [statut, id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erreur mise à jour livraison', error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Livraison introuvable.' });

        // Synchroniser le statut de la commande associée si Expédiée ou Livrée
        if (statut === 'En préparation' || statut === 'Expédiée' || statut === 'Livrée') {
            db.query(
                'UPDATE commandes SET statut = ? WHERE id = (SELECT commande_id FROM livraisons WHERE id = ?)',
                [statut, id]
            );
        }

        res.status(200).json({ message: `Statut de livraison mis à jour : ${statut}` });
    });
};