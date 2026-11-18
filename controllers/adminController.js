const db = require('../config/db');

// 1. Récupérer les statistiques globales du tableau de bord
exports.getStatistiques = (req, res) => {
    const sqlCA = `
        SELECT 
            COALESCE(SUM(CASE WHEN statut = 'Accepté' THEN montant ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN statut = 'Remboursé' THEN montant ELSE 0 END), 0) AS chiffre_affaires_net
        FROM paiements
    `;

    const sqlTopProduits = `
        SELECT p.id, p.nom, SUM(dc.quantite) AS total_vendu, SUM(dc.quantite * dc.prix_unitaire) AS revenus
        FROM details_commande dc
        JOIN produits p ON dc.produit_id = p.id
        JOIN commandes c ON dc.commande_id = c.id
        WHERE c.statut IN ('Confirmée', 'En préparation', 'Expédiée', 'Livrée')
        GROUP BY p.id, p.nom
        ORDER BY total_vendu DESC
        LIMIT 5
    `;

    const sqlVentesCategorie = `
        SELECT cat.nom AS categorie, COALESCE(SUM(dc.quantite * dc.prix_unitaire), 0) AS total_ventes
        FROM categories cat
        LEFT JOIN produits p ON p.categorie_id = cat.id
        LEFT JOIN details_commande dc ON dc.produit_id = p.id
        LEFT JOIN commandes c ON dc.commande_id = c.id 
            AND c.statut IN ('Confirmée', 'En préparation', 'Expédiée', 'Livrée')
        GROUP BY cat.id, cat.nom
        ORDER BY total_ventes DESC
    `;

    const sqlCommandesStatut = `
        SELECT statut, COUNT(*) AS nombre_commandes
        FROM commandes
        GROUP BY statut
    `;

    db.query(sqlCA, (err, caRes) => {
        if (err) return res.status(500).json({ message: 'Erreur calcul CA', error: err.message });

        db.query(sqlTopProduits, (err, topRes) => {
            if (err) return res.status(500).json({ message: 'Erreur top produits', error: err.message });

            db.query(sqlVentesCategorie, (err, catRes) => {
                if (err) return res.status(500).json({ message: 'Erreur ventes catégorie', error: err.message });

                db.query(sqlCommandesStatut, (err, statRes) => {
                    if (err) return res.status(500).json({ message: 'Erreur statuts commandes', error: err.message });

                    res.status(200).json({
                        chiffre_affaires_net: Number(caRes[0].chiffre_affaires_net),
                        produits_plus_vendus: topRes,
                        ventes_par_categorie: catRes,
                        commandes_par_statut: statRes
                    });
                });
            });
        });
    });
};

// 2. Lister tous les utilisateurs avec leur rôle
exports.getUtilisateurs = (req, res) => {
    const sql = `
        SELECT u.id, u.nom, u.email, u.role_id, r.nom AS role_nom, u.date_creation
        FROM utilisateurs u
        JOIN roles r ON u.role_id = r.id
        ORDER BY u.id ASC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur récupération utilisateurs', error: err.message });
        res.status(200).json(results);
    });
};

// 3. Modifier le rôle d'un utilisateur
exports.modifierRoleUtilisateur = (req, res) => {
    const { id } = req.params;
    const { role_id } = req.body; // 1 = client, 2 = gestionnaire, 3 = administrateur

    if (![1, 2, 3].includes(Number(role_id))) {
        return res.status(400).json({ message: 'role_id invalide (1: client, 2: gestionnaire, 3: administrateur).' });
    }

    db.query('UPDATE utilisateurs SET role_id = ? WHERE id = ?', [Number(role_id), id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erreur modification rôle', error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });

        // Enregistrement dans la table historique
        db.query(
            'INSERT INTO historique (utilisateur_id, action, description) VALUES (?, ?, ?)',
            [id, 'MODIFICATION_ROLE', `Rôle mis à jour vers role_id = ${role_id}`]
        );

        res.status(200).json({ message: 'Rôle de l\'utilisateur mis à jour avec succès.' });
    });
};

// 4. Consulter le journal d'historique
exports.getHistorique = (req, res) => {
    const sql = `
        SELECT h.id, h.action, h.description, h.date_action,
               u.nom AS utilisateur_nom, h.commande_id, h.paiement_id
        FROM historique h
        LEFT JOIN utilisateurs u ON h.utilisateur_id = u.id
        ORDER BY h.date_action DESC
        LIMIT 50
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur récupération historique', error: err.message });
        res.status(200).json(results);
    });
};