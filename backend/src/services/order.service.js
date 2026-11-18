'use strict';
const { pool, withTransaction } = require('../config/db');
const { badRequest, conflict, notFound } = require('../utils/httpError');
const { toCents, fromCents } = require('../utils/money');
const { calculerMontants } = require('../utils/pricing');
const { validerAdresse } = require('../utils/address');
const { STATUTS, STATUTS_LIVRAISON } = require('../config/constants');
const { ajouterHistorique } = require('./historique.service');

const estPersonnel = (user) => user && (user.role === 'gestionnaire' || user.role === 'administrateur');

/**
 * Crée une commande « En attente de paiement » à partir du panier du client.
 *  1. valide le panier (non vide, produits actifs)
 *  2. vérifie le stock disponible (stock - réservations en cours)
 *  3. RECALCULE tous les montants côté serveur depuis les prix en base
 *  4. crée commande + détails + livraison + historique, puis vide le panier
 * Le stock n'est PAS réservé ici : la réservation se fait au moment du paiement (tâche paymant_stock).
 */
async function creerCommande(userId, adresseBrute) {
  const { valeur: adresse, erreurs } = validerAdresse(adresseBrute);
  if (erreurs.length) throw badRequest('Adresse de livraison invalide.', erreurs);

  return withTransaction(async (conn) => {
    const [paniers] = await conn.query('SELECT id FROM paniers WHERE utilisateur_id = ?', [userId]);
    if (!paniers.length) throw badRequest('Votre panier est vide.');
    const panierId = paniers[0].id;

    const [lignes] = await conn.query(
      `SELECT dp.produit_id, dp.quantite, p.nom, p.prix, p.actif, p.quantite_stock, p.quantite_reservee
         FROM details_panier dp
         JOIN produits p ON p.id = dp.produit_id
        WHERE dp.panier_id = ?
        ORDER BY dp.produit_id`,
      [panierId]
    );
    if (!lignes.length) throw badRequest('Votre panier est vide.');

    const problemes = [];
    for (const l of lignes) {
      const disponible = l.quantite_stock - l.quantite_reservee;
      if (!l.actif) problemes.push({ produit_id: l.produit_id, nom: l.nom, probleme: 'Produit indisponible.' });
      else if (disponible <= 0) problemes.push({ produit_id: l.produit_id, nom: l.nom, probleme: 'Produit en rupture de stock.' });
      else if (l.quantite > disponible) {
        problemes.push({ produit_id: l.produit_id, nom: l.nom, probleme: `Stock insuffisant (disponible : ${disponible}).`, disponible });
      }
    }
    if (problemes.length) throw conflict('Certains produits du panier ne sont pas disponibles.', problemes);

    // Prix = prix ACTUEL en base (prix_affiche du panier est ignoré).
    const lignesCalcul = lignes.map((l) => ({ prix_cents: toCents(l.prix), quantite: l.quantite }));
    const m = calculerMontants(lignesCalcul);

    const [cmd] = await conn.query(
      `INSERT INTO commandes (utilisateur_id, statut, sous_total, taxes, frais_livraison, montant_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, STATUTS.EN_ATTENTE, fromCents(m.sous_total), fromCents(m.taxes), fromCents(m.frais_livraison), fromCents(m.montant_total)]
    );
    const commandeId = cmd.insertId;

    await conn.query(
      'INSERT INTO details_commande (commande_id, produit_id, quantite, prix_unitaire) VALUES ?',
      [lignes.map((l) => [commandeId, l.produit_id, l.quantite, fromCents(toCents(l.prix))])]
    );

    await conn.query(
      `INSERT INTO livraisons (commande_id, destinataire, adresse, ville, province, code_postal, pays, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [commandeId, adresse.destinataire, adresse.adresse, adresse.ville, adresse.province, adresse.code_postal, adresse.pays, STATUTS_LIVRAISON.A_PREPARER]
    );

    await ajouterHistorique(conn, {
      commandeId, utilisateurId: userId, type: 'COMMANDE_CREEE',
      nouveauStatut: STATUTS.EN_ATTENTE, description: `Commande créée, total ${fromCents(m.montant_total)} $.`,
    });

    await conn.query('DELETE FROM details_panier WHERE panier_id = ?', [panierId]);

    return chargerCommande(conn, commandeId);
  });
}

/** Charge une commande complète : lignes, livraison, paiements, historique. */
async function chargerCommande(db, commandeId) {
  const [cmds] = await db.query('SELECT * FROM commandes WHERE id = ?', [commandeId]);
  if (!cmds.length) return null;
  const [lignes] = await db.query(
    `SELECT dc.produit_id, p.nom, dc.quantite, dc.prix_unitaire,
            (dc.quantite * dc.prix_unitaire) AS total_ligne
       FROM details_commande dc JOIN produits p ON p.id = dc.produit_id
      WHERE dc.commande_id = ? ORDER BY dc.id`,
    [commandeId]
  );
  const [livraisons] = await db.query('SELECT * FROM livraisons WHERE commande_id = ?', [commandeId]);
  const [paiements] = await db.query(
    `SELECT id, type, montant, mode, statut, reference, carte_derniers4, motif, date_paiement
       FROM paiements WHERE commande_id = ? ORDER BY id`,
    [commandeId]
  );
  const [historique] = await db.query(
    `SELECT type_evenement, ancien_statut, nouveau_statut, description, date_evenement
       FROM historique WHERE commande_id = ? ORDER BY id`,
    [commandeId]
  );
  return { ...cmds[0], lignes, livraison: livraisons[0] || null, paiements, historique };
}

/** Consulter une commande : le client ne voit que les siennes, le personnel voit tout. */
async function obtenirCommande(commandeId, user) {
  const commande = await chargerCommande(pool, commandeId);
  if (!commande) throw notFound('Commande introuvable.');
  if (commande.utilisateur_id !== user.id && !estPersonnel(user)) throw notFound('Commande introuvable.'); // 404 : ne révèle pas l'existence des commandes des autres
  return commande;
}

/** Historique des achats du client (plus récentes d'abord), pagination simple. */
async function listerCommandes(userId, { limite = 20, decalage = 0 } = {}) {
  const lim = Math.min(Math.max(parseInt(limite, 10) || 20, 1), 100);
  const dec = Math.max(parseInt(decalage, 10) || 0, 0);
  const [rows] = await pool.query(
    `SELECT id, statut, sous_total, taxes, frais_livraison, montant_total, date_commande
       FROM commandes WHERE utilisateur_id = ? ORDER BY date_commande DESC, id DESC LIMIT ? OFFSET ?`,
    [userId, lim, dec]
  );
  return rows;
}

module.exports = { creerCommande, chargerCommande, obtenirCommande, listerCommandes, estPersonnel };
