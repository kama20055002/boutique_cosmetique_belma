const db = require('../config/db');

// 1. Consulter le panier d'un utilisateur et calculer le sous-total
exports.getPanier = (req, res) => {
    const { utilisateur_id } = req.params;

    const sql = `
        SELECT dp.id AS detail_id, dp.produit_id, p.nom, p.image, 
               dp.quantite, p.prix AS prix_unitaire, 
               (dp.quantite * p.prix) AS total_ligne,
               p.quantite_stock
        FROM paniers pa
        JOIN details_panier dp ON pa.id = dp.panier_id
        JOIN produits p ON dp.produit_id = p.id
        WHERE pa.utilisateur_id = ?
    `;

    db.query(sql, [utilisateur_id], (err, items) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur lors de la récupération du panier', error: err.message });
        }

        // Calcul du sous-total côté serveur
        const sous_total = items.reduce((somme, item) => somme + Number(item.total_ligne), 0);

        res.status(200).json({
            utilisateur_id: Number(utilisateur_id),
            articles: items,
            sous_total: Number(sous_total.toFixed(2))
        });
    });
};

// 2. Ajouter un produit au panier
exports.ajouterAuPanier = (req, res) => {
    const { utilisateur_id, produit_id, quantite } = req.body;
    const qteAjout = Number(quantite) || 1;

    if (qteAjout <= 0) {
        return res.status(400).json({ message: 'La quantité doit être supérieure à 0.' });
    }

    // Étape A : Vérifier le produit et son stock
    db.query('SELECT id, prix, quantite_stock, actif FROM produits WHERE id = ?', [produit_id], (err, produits) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err.message });
        if (produits.length === 0 || !produits[0].actif) {
            return res.status(404).json({ message: 'Produit introuvable ou indisponible.' });
        }

        const produit = produits[0];
        if (produit.quantite_stock === 0) {
            return res.status(400).json({ message: 'Ce produit est en rupture de stock.' });
        }

        // Étape B : Trouver ou créer le panier de l'utilisateur
        db.query('SELECT id FROM paniers WHERE utilisateur_id = ?', [utilisateur_id], (err, paniers) => {
            if (err) return res.status(500).json({ message: 'Erreur serveur', error: err.message });

            const gererDetailsPanier = (panierId) => {
                db.query(
                    'SELECT id, quantite FROM details_panier WHERE panier_id = ? AND produit_id = ?',
                    [panierId, produit_id],
                    (err, details) => {
                        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err.message });

                        const nouvelleQuantite = details.length > 0 ? details[0].quantite + qteAjout : qteAjout;

                        // Règle de gestion : ne pas dépasser le stock disponible
                        if (nouvelleQuantite > produit.quantite_stock) {
                            return res.status(400).json({
                                message: `Stock insuffisant. Maximum disponible : ${produit.quantite_stock}`
                            });
                        }

                        if (details.length > 0) {
                            db.query(
                                'UPDATE details_panier SET quantite = ?, prix_unitaire = ? WHERE id = ?',
                                [nouvelleQuantite, produit.prix, details[0].id],
                                (err) => {
                                    if (err) return res.status(500).json({ message: 'Erreur mise à jour', error: err.message });
                                    res.status(200).json({ message: 'Quantité mise à jour dans le panier.' });
                                }
                            );
                        } else {
                            db.query(
                                'INSERT INTO details_panier (panier_id, produit_id, quantite, prix_unitaire) VALUES (?, ?, ?, ?)',
                                [panierId, produit_id, qteAjout, produit.prix],
                                (err) => {
                                    if (err) return res.status(500).json({ message: 'Erreur ajout', error: err.message });
                                    res.status(201).json({ message: 'Produit ajouté au panier.' });
                                }
                            );
                        }
                    }
                );
            };

            if (paniers.length > 0) {
                gererDetailsPanier(paniers[0].id);
            } else {
                db.query('INSERT INTO paniers (utilisateur_id) VALUES (?)', [utilisateur_id], (err, result) => {
                    if (err) return res.status(500).json({ message: 'Erreur création panier', error: err.message });
                    gererDetailsPanier(result.insertId);
                });
            }
        });
    });
};

// 3. Modifier la quantité d'un produit dans le panier
exports.modifierQuantite = (req, res) => {
    const { detail_id } = req.params;
    const { quantite } = req.body;
    const nouvelleQte = Number(quantite);

    if (nouvelleQte <= 0) {
        // Si quantité <= 0, on supprime la ligne du panier
        return db.query('DELETE FROM details_panier WHERE id = ?', [detail_id], (err) => {
            if (err) return res.status(500).json({ message: 'Erreur suppression', error: err.message });
            res.status(200).json({ message: 'Article retiré du panier.' });
        });
    }

    // Vérifier le stock disponible pour ce produit
    const sqlStock = `
        SELECT p.quantite_stock 
        FROM details_panier dp 
        JOIN produits p ON dp.produit_id = p.id 
        WHERE dp.id = ?
    `;

    db.query(sqlStock, [detail_id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err.message });
        if (rows.length === 0) return res.status(404).json({ message: 'Article non trouvé dans le panier.' });

        if (nouvelleQte > rows[0].quantite_stock) {
            return res.status(400).json({
                message: `Stock insuffisant. Maximum disponible : ${rows[0].quantite_stock}`
            });
        }

        db.query('UPDATE details_panier SET quantite = ? WHERE id = ?', [nouvelleQte, detail_id], (err) => {
            if (err) return res.status(500).json({ message: 'Erreur modification quantité', error: err.message });
            res.status(200).json({ message: 'Quantité modifiée avec succès.' });
        });
    });
};

// 4. Supprimer un produit du panier
exports.supprimerDuPanier = (req, res) => {
    const { detail_id } = req.params;

    db.query('DELETE FROM details_panier WHERE id = ?', [detail_id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erreur lors de la suppression', error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Article introuvable.' });

        res.status(200).json({ message: 'Produit supprimé du panier.' });
    });
};