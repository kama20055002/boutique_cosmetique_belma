'use strict';

/**
 * Ajoute une ligne au journal (historique des commandes et transactions).
 * `conn` = connexion de la transaction en cours, pour que le journal soit validé ou annulé avec le reste.
 */
async function ajouterHistorique(conn, { commandeId, paiementId = null, utilisateurId = null, type, ancienStatut = null, nouveauStatut = null, description = null }) {
  await conn.query(
    `INSERT INTO historique (commande_id, paiement_id, utilisateur_id, type_evenement, ancien_statut, nouveau_statut, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [commandeId, paiementId, utilisateurId, type, ancienStatut, nouveauStatut, description]
  );
}

module.exports = { ajouterHistorique };
