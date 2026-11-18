'use strict';

/** Statuts de commande (identiques à l'ENUM de la table `commandes`). */
const STATUTS = Object.freeze({
  EN_ATTENTE: 'En attente de paiement',
  CONFIRMEE: 'Confirmée',
  EN_PREPARATION: 'En préparation',
  EXPEDIEE: 'Expédiée',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
});

/** Une commande expédiée (ou livrée) ne peut plus être annulée directement par le client. */
const STATUTS_ANNULABLES = Object.freeze([STATUTS.EN_ATTENTE, STATUTS.CONFIRMEE, STATUTS.EN_PREPARATION]);

const STATUTS_LIVRAISON = Object.freeze({
  A_PREPARER: 'A_PREPARER',
  EN_PREPARATION: 'EN_PREPARATION',
  EXPEDIEE: 'EXPEDIEE',
  LIVREE: 'LIVREE',
  ANNULEE: 'ANNULEE',
});

const STATUTS_PAIEMENT = Object.freeze({ ACCEPTE: 'ACCEPTE', REFUSE: 'REFUSE', EXPIRE: 'EXPIRE' });
const TYPES_PAIEMENT = Object.freeze({ PAIEMENT: 'PAIEMENT', REMBOURSEMENT: 'REMBOURSEMENT' });

/**
 * Configuration lue dans l'environnement (.env) :
 *   TAUX_TAXE (0.13), FRAIS_LIVRAISON (8 $), LIVRAISON_GRATUITE_DES (0 = jamais gratuite),
 *   PAIEMENT_EXPIRATION_MINUTES (15).
 */
function getPricingConfig(env = process.env) {
  return {
    tauxTaxe: Number(env.TAUX_TAXE ?? 0.13),
    fraisLivraisonCents: Math.round(Number(env.FRAIS_LIVRAISON ?? 8) * 100),
    seuilLivraisonGratuiteCents: Math.round(Number(env.LIVRAISON_GRATUITE_DES ?? 0) * 100),
  };
}

const getReservationMinutes = (env = process.env) => Number(env.PAIEMENT_EXPIRATION_MINUTES ?? 15);

module.exports = {
  STATUTS, STATUTS_ANNULABLES, STATUTS_LIVRAISON, STATUTS_PAIEMENT, TYPES_PAIEMENT,
  getPricingConfig, getReservationMinutes,
};
