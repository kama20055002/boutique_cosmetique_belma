# Schéma de la base de données

12 tables : `roles`, `utilisateurs`, `categories_produit`, `marques`, `produits`, `paniers`,
`details_panier`, `commandes`, `details_commande`, `paiements`, `livraisons`, `historique`.

Points clés
- `produits.quantite_reservee` : réservation temporaire pendant le paiement (disponible = stock − réservé).
- `commandes.stock_reserve` / `reservation_expire_le` : suivent la réservation de la commande.
- `paiements.type` : `PAIEMENT` ou `REMBOURSEMENT` (le remboursement simulé est une ligne de plus).
- `historique` : journal permanent des commandes et transactions.
- Contraintes : clés étrangères, `CHECK` (prix > 0, quantités > 0, réservé ≤ stock), emails uniques.
- Les `CHECK` sont appliqués par MySQL ≥ 8.0.16 et MariaDB ≥ 10.2.1.

Commande : `npm run db:init`
