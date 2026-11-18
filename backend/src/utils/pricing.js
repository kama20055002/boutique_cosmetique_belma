'use strict';
const { getPricingConfig } = require('../config/constants');

/**
 * Calcule les montants d'une commande. Fonction pure, utilisée UNIQUEMENT côté serveur
 * à partir des prix en base (jamais des prix envoyés par le navigateur).
 *
 * @param {{prix_cents:number, quantite:number}[]} lignes
 * @param {object} [config] voir getPricingConfig()
 * @returns {{sous_total:number, taxes:number, frais_livraison:number, montant_total:number}} en cents
 *
 * Sous-total = Somme(prix unitaire × quantité)
 * Taxes      = sous-total × TAUX_TAXE (frais de livraison non taxés)
 * Livraison  = FRAIS_LIVRAISON, gratuits dès LIVRAISON_GRATUITE_DES (0 = jamais gratuits)
 */
function calculerMontants(lignes, config = getPricingConfig()) {
  if (!Array.isArray(lignes) || lignes.length === 0) throw new RangeError('Aucune ligne à calculer.');

  let sousTotal = 0;
  for (const l of lignes) {
    if (!Number.isInteger(l.prix_cents) || l.prix_cents <= 0) throw new RangeError('Prix unitaire invalide.');
    if (!Number.isInteger(l.quantite) || l.quantite <= 0) throw new RangeError('Quantité invalide.');
    sousTotal += l.prix_cents * l.quantite;
  }

  const taxes = Math.round(sousTotal * config.tauxTaxe);
  const gratuite = config.seuilLivraisonGratuiteCents > 0 && sousTotal >= config.seuilLivraisonGratuiteCents;
  const frais = gratuite ? 0 : config.fraisLivraisonCents;

  return { sous_total: sousTotal, taxes, frais_livraison: frais, montant_total: sousTotal + taxes + frais };
}

module.exports = { calculerMontants };
