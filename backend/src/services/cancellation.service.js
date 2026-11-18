'use strict';
const { withTransaction } = require('../config/db');
const { evaluerAnnulation } = require('../utils/cancellationRules');
const { notFound, forbidden, conflict } = require('../utils/httpError');
const { toCents, fromCents } = require('../utils/money');
const { STATUTS, STATUTS_LIVRAISON, STATUTS_PAIEMENT, TYPES_PAIEMENT } = require('../config/constants');
const { ajouterHistorique } = require('./historique.service');
const stock = require('./stock.service');
const { enregistrerTransaction } = require('./payment.service');

/** Remet en stock les quantités d'une commande déjà payée (le stock avait été déduit à la confirmation). */
async function restituerStock(conn, commandeId) {
  const [lignes] = await conn.query('SELECT produit_id, quantite FROM details_commande WHERE commande_id = ? ORDER BY produit_id', [commandeId]);
  const ids = lignes.map((l) => l.produit_id);
  if (ids.length) await conn.query('SELECT id FROM produits WHERE id IN (?) ORDER BY id FOR UPDATE', [ids]);
  for (const l of lignes) {
    await conn.query('UPDATE produits SET quantite_stock = quantite_stock + ? WHERE id = ?', [l.quantite, l.produit_id]);
  }
}

/**
 * Annule une commande avant son expédition, rétablit le stock et enregistre le remboursement simulé.
 *  - non payée : libère la réservation éventuelle, aucun remboursement
 *  - payée     : remet les quantités en stock + ligne REMBOURSEMENT (montant total de la commande)
 */
async function annulerCommande(commandeId, user, motif = null) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM commandes WHERE id = ? FOR UPDATE', [commandeId]);
    const cmd = rows[0];
    if (!cmd) throw notFound('Commande introuvable.');

    const verdict = evaluerAnnulation(cmd, user);
    if (!verdict.autorise) throw (verdict.code === 403 ? forbidden(verdict.raison) : conflict(verdict.raison));

    let remboursement = null;
    if (verdict.rembourser) {
      await restituerStock(conn, commandeId);
      const montantCents = toCents(cmd.montant_total);
      remboursement = await enregistrerTransaction(conn, {
        commandeId, type: TYPES_PAIEMENT.REMBOURSEMENT, montantCents, statut: STATUTS_PAIEMENT.ACCEPTE,
        motif: motif || 'Annulation de la commande (remboursement simulé).',
      });
      remboursement.montant = fromCents(montantCents);
      await ajouterHistorique(conn, {
        commandeId, paiementId: remboursement.id, utilisateurId: user.id, type: 'REMBOURSEMENT',
        description: `Remboursement simulé de ${remboursement.montant} $.`,
      });
    } else if (cmd.stock_reserve === 1) {
      await stock.liberer(conn, commandeId);
    }

    await conn.query('UPDATE commandes SET statut = ?, stock_reserve = 0, reservation_expire_le = NULL WHERE id = ?', [STATUTS.ANNULEE, commandeId]);
    await conn.query('UPDATE livraisons SET statut = ? WHERE commande_id = ?', [STATUTS_LIVRAISON.ANNULEE, commandeId]);
    await ajouterHistorique(conn, {
      commandeId, utilisateurId: user.id, type: 'COMMANDE_ANNULEE',
      ancienStatut: cmd.statut, nouveauStatut: STATUTS.ANNULEE, description: motif || 'Commande annulée.',
    });

    return {
      commande_id: commandeId,
      statut: STATUTS.ANNULEE,
      rembourse: Boolean(remboursement),
      remboursement: remboursement ? { reference: remboursement.reference, montant: remboursement.montant } : null,
    };
  });
}

module.exports = { annulerCommande };
