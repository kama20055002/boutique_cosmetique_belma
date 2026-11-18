-- ============================================================
-- Projet 6 - Boutique cosmétique en ligne
-- Schéma MySQL / MariaDB (InnoDB, utf8mb4)
-- Exécution : npm run db:init (local) ou automatiquement au 1er démarrage de Docker
-- ============================================================

-- La base est créée par Docker (MYSQL_DATABASE) ou par `npm run db:init` (DB_NAME).

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS historique, paiements, livraisons, details_commande, commandes,
  details_panier, paniers, produits, marques, categories_produit, utilisateurs, roles;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Rôle : client, gestionnaire, administrateur
-- ------------------------------------------------------------
CREATE TABLE roles (
  id   TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom  VARCHAR(30) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_nom (nom)
) ENGINE=InnoDB;

INSERT INTO roles (nom) VALUES ('client'), ('gestionnaire'), ('administrateur');

-- ------------------------------------------------------------
-- Utilisateur (client ou personnel)
-- ------------------------------------------------------------
CREATE TABLE utilisateurs (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom                VARCHAR(80)  NOT NULL,
  prenom             VARCHAR(80)  NOT NULL,
  email              VARCHAR(190) NOT NULL,
  mot_de_passe_hash  VARCHAR(255) NOT NULL,
  role_id            TINYINT UNSIGNED NOT NULL,
  actif              TINYINT(1)   NOT NULL DEFAULT 1,
  date_creation      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_utilisateurs_email (email),
  KEY idx_utilisateurs_role (role_id),
  CONSTRAINT fk_utilisateurs_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- CatégorieProduit et Marque
-- ------------------------------------------------------------
CREATE TABLE categories_produit (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom          VARCHAR(100) NOT NULL,
  description  VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_nom (nom)
) ENGINE=InnoDB;

CREATE TABLE marques (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom  VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_marques_nom (nom)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Produit
--   quantite_stock    : unités physiquement en stock
--   quantite_reservee : unités réservées temporairement pendant un paiement
--   disponible = quantite_stock - quantite_reservee
-- ------------------------------------------------------------
CREATE TABLE produits (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom                VARCHAR(150) NOT NULL,
  description        TEXT NULL,
  prix               DECIMAL(10,2) NOT NULL,
  image_url          VARCHAR(500) NULL,
  quantite_stock     INT UNSIGNED NOT NULL DEFAULT 0,
  quantite_reservee  INT UNSIGNED NOT NULL DEFAULT 0,
  actif              TINYINT(1) NOT NULL DEFAULT 1,
  categorie_id       INT UNSIGNED NOT NULL,
  marque_id          INT UNSIGNED NULL,
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_produits_nom (nom),
  KEY idx_produits_categorie (categorie_id),
  KEY idx_produits_marque (marque_id),
  KEY idx_produits_prix (prix),
  CONSTRAINT fk_produits_categorie FOREIGN KEY (categorie_id) REFERENCES categories_produit (id),
  CONSTRAINT fk_produits_marque    FOREIGN KEY (marque_id)    REFERENCES marques (id) ON DELETE SET NULL,
  CONSTRAINT chk_produits_prix     CHECK (prix > 0),
  CONSTRAINT chk_produits_reserve  CHECK (quantite_reservee <= quantite_stock)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Panier (un panier par client) et DétailPanier
-- ------------------------------------------------------------
CREATE TABLE paniers (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  utilisateur_id     INT UNSIGNED NOT NULL,
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_paniers_utilisateur (utilisateur_id),
  CONSTRAINT fk_paniers_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE details_panier (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  panier_id       INT UNSIGNED NOT NULL,
  produit_id      INT UNSIGNED NOT NULL,
  quantite        INT UNSIGNED NOT NULL,
  prix_affiche    DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_details_panier (panier_id, produit_id),
  KEY idx_details_panier_produit (produit_id),
  CONSTRAINT fk_dpanier_panier  FOREIGN KEY (panier_id)  REFERENCES paniers (id)  ON DELETE CASCADE,
  CONSTRAINT fk_dpanier_produit FOREIGN KEY (produit_id) REFERENCES produits (id),
  CONSTRAINT chk_dpanier_quantite CHECK (quantite > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Commande et DétailCommande
--   stock_reserve : 1 si des quantités sont actuellement réservées pour cette commande
--   reservation_expire_le : fin de la réservation temporaire
-- ------------------------------------------------------------
CREATE TABLE commandes (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  utilisateur_id         INT UNSIGNED NOT NULL,
  statut                 ENUM('En attente de paiement','Confirmée','En préparation','Expédiée','Livrée','Annulée')
                         NOT NULL DEFAULT 'En attente de paiement',
  sous_total             DECIMAL(10,2) NOT NULL,
  taxes                  DECIMAL(10,2) NOT NULL,
  frais_livraison        DECIMAL(10,2) NOT NULL,
  montant_total          DECIMAL(10,2) NOT NULL,
  stock_reserve          TINYINT(1) NOT NULL DEFAULT 0,
  reservation_expire_le  DATETIME NULL,
  date_commande          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_commandes_utilisateur (utilisateur_id),
  KEY idx_commandes_statut (statut),
  KEY idx_commandes_reservation (stock_reserve, reservation_expire_le),
  CONSTRAINT fk_commandes_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs (id),
  CONSTRAINT chk_commandes_montants CHECK (sous_total >= 0 AND taxes >= 0 AND frais_livraison >= 0 AND montant_total >= 0)
) ENGINE=InnoDB;

CREATE TABLE details_commande (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  commande_id    INT UNSIGNED NOT NULL,
  produit_id     INT UNSIGNED NOT NULL,
  quantite       INT UNSIGNED NOT NULL,
  prix_unitaire  DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_details_commande (commande_id, produit_id),
  KEY idx_dcommande_produit (produit_id),
  CONSTRAINT fk_dcommande_commande FOREIGN KEY (commande_id) REFERENCES commandes (id) ON DELETE CASCADE,
  CONSTRAINT fk_dcommande_produit  FOREIGN KEY (produit_id)  REFERENCES produits (id),
  CONSTRAINT chk_dcommande_quantite CHECK (quantite > 0),
  CONSTRAINT chk_dcommande_prix CHECK (prix_unitaire > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Paiement (transactions : paiements et remboursements simulés)
--   Chaque paiement est obligatoirement associé à une commande.
--   Aucune donnée bancaire complète n'est stockée (4 derniers chiffres seulement).
-- ------------------------------------------------------------
CREATE TABLE paiements (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  commande_id       INT UNSIGNED NOT NULL,
  type              ENUM('PAIEMENT','REMBOURSEMENT') NOT NULL DEFAULT 'PAIEMENT',
  montant           DECIMAL(10,2) NOT NULL,
  mode              VARCHAR(30) NOT NULL DEFAULT 'CARTE_SIMULEE',
  statut            ENUM('ACCEPTE','REFUSE','EXPIRE') NOT NULL,
  reference         VARCHAR(40) NOT NULL,
  carte_derniers4   CHAR(4) NULL,
  motif             VARCHAR(255) NULL,
  date_paiement     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_paiements_reference (reference),
  KEY idx_paiements_commande (commande_id),
  KEY idx_paiements_statut (statut),
  CONSTRAINT fk_paiements_commande FOREIGN KEY (commande_id) REFERENCES commandes (id),
  CONSTRAINT chk_paiements_montant CHECK (montant >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Livraison (une par commande)
-- ------------------------------------------------------------
CREATE TABLE livraisons (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  commande_id        INT UNSIGNED NOT NULL,
  destinataire       VARCHAR(160) NOT NULL,
  adresse            VARCHAR(255) NOT NULL,
  ville              VARCHAR(100) NOT NULL,
  province           VARCHAR(100) NOT NULL,
  code_postal        VARCHAR(12)  NOT NULL,
  pays               VARCHAR(80)  NOT NULL DEFAULT 'Canada',
  statut             ENUM('A_PREPARER','EN_PREPARATION','EXPEDIEE','LIVREE','ANNULEE') NOT NULL DEFAULT 'A_PREPARER',
  date_expedition    DATETIME NULL,
  date_livraison     DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_livraisons_commande (commande_id),
  CONSTRAINT fk_livraisons_commande FOREIGN KEY (commande_id) REFERENCES commandes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Historique : journal des commandes et des transactions (jamais supprimé)
-- ------------------------------------------------------------
CREATE TABLE historique (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  commande_id      INT UNSIGNED NOT NULL,
  paiement_id      INT UNSIGNED NULL,
  utilisateur_id   INT UNSIGNED NULL,
  type_evenement   VARCHAR(40) NOT NULL,
  ancien_statut    VARCHAR(40) NULL,
  nouveau_statut   VARCHAR(40) NULL,
  description      VARCHAR(255) NULL,
  date_evenement   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_historique_commande (commande_id),
  KEY idx_historique_date (date_evenement),
  CONSTRAINT fk_historique_commande    FOREIGN KEY (commande_id)    REFERENCES commandes (id),
  CONSTRAINT fk_historique_paiement    FOREIGN KEY (paiement_id)    REFERENCES paiements (id) ON DELETE SET NULL,
  CONSTRAINT fk_historique_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs (id) ON DELETE SET NULL
) ENGINE=InnoDB;
