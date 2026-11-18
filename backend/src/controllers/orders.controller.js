'use strict';
const orderService = require('../services/order.service');
const paymentService = require('../services/payment.service');
const cancellationService = require('../services/cancellation.service');
const { idValide } = require('../utils/params');

/** POST /api/orders : crée la commande à partir du panier. Corps = adresse de livraison. */
async function creer(req, res) {
  const commande = await orderService.creerCommande(req.user.id, req.body);
  res.status(201).json({ commande });
}

/** POST /api/orders/:id/reserve : réserve le stock à l'ouverture de la page de paiement. */
async function reserver(req, res) {
  const r = await paymentService.reserverStock(idValide(req.params.id), req.user.id);
  res.json(r);
}

/** POST /api/orders/:id/pay : paiement simulé. Corps = { carte: { numero, expiration, cvv } }. */
async function payer(req, res) {
  const r = await paymentService.payerCommande(idValide(req.params.id), req.user.id, req.body && req.body.carte);
  // 200 si accepté ; 402 (paiement requis) si refusé : le client peut réessayer.
  res.status(r.accepte ? 200 : 402).json(r);
}

/** POST /api/orders/:id/cancel : annulation avant expédition. Corps optionnel = { motif }. */
async function annuler(req, res) {
  const motif = req.body && typeof req.body.motif === 'string' ? req.body.motif.trim().slice(0, 255) || null : null;
  const r = await cancellationService.annulerCommande(idValide(req.params.id), req.user, motif);
  res.json(r);
}

/** GET /api/orders : historique des achats du client connecté. */
async function lister(req, res) {
  const commandes = await orderService.listerCommandes(req.user.id, { limite: req.query.limite, decalage: req.query.decalage });
  res.json({ commandes });
}

/** GET /api/orders/:id : détail, statut, paiements et historique d'une commande. */
async function detail(req, res) {
  const commande = await orderService.obtenirCommande(idValide(req.params.id), req.user);
  res.json({ commande });
}

module.exports = { creer, reserver, payer, annuler, lister, detail };
