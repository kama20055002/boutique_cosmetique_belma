'use strict';
const { STATUTS, STATUTS_ANNULABLES } = require('../config/constants');

const estPersonnel = (u) => u && (u.role === 'gestionnaire' || u.role === 'administrateur');

/**
 * Règles d'annulation (fonction pure, testable) :
 *  - le client ne peut annuler que SES commandes ; le personnel peut annuler n'importe laquelle ;
 *  - seules les commandes non expédiées peuvent être annulées (En attente, Confirmée, En préparation) ;
 *  - un remboursement est dû seulement si la commande a été payée (statut ≠ En attente de paiement).
 * @returns {{autorise:boolean, raison?:string, rembourser?:boolean}}
 */
function evaluerAnnulation(commande, user) {
  if (commande.utilisateur_id !== user.id && !estPersonnel(user)) {
    return { autorise: false, raison: 'Cette commande ne vous appartient pas.', code: 403 };
  }
  if (commande.statut === STATUTS.ANNULEE) return { autorise: false, raison: 'La commande est déjà annulée.', code: 409 };
  if (!STATUTS_ANNULABLES.includes(commande.statut)) {
    return { autorise: false, raison: `Une commande « ${commande.statut} » ne peut plus être annulée.`, code: 409 };
  }
  return { autorise: true, rembourser: commande.statut !== STATUTS.EN_ATTENTE };
}

module.exports = { evaluerAnnulation };
