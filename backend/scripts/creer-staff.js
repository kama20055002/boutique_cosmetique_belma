'use strict';
// Crée (ou met à jour) un compte du personnel. Le mot de passe vient de la variable STAFF_PASSWORD
// (jamais en argument de ligne de commande, pour ne pas apparaître dans l'historique du shell).
//   STAFF_PASSWORD='MotDePasse123' node scripts/creer-staff.js admin@exemple.com Prenom Nom administrateur
// Rôle : administrateur (défaut) ou gestionnaire.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');
const { validerEmail, validerMotDePasse } = require('../src/utils/validators');

(async () => {
  const [email, prenom, nom, role = 'administrateur'] = process.argv.slice(2);
  const mdp = process.env.STAFF_PASSWORD;
  if (!validerEmail(email) || !prenom || !nom || !validerMotDePasse(mdp) || !['administrateur', 'gestionnaire'].includes(role)) {
    console.error("Usage : STAFF_PASSWORD='...' node scripts/creer-staff.js <email> <prenom> <nom> [administrateur|gestionnaire]");
    console.error('Le mot de passe doit contenir 8 caractères minimum, avec une lettre et un chiffre.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(mdp, 12);
  await pool.query(
    `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role_id)
     VALUES (?, ?, ?, ?, (SELECT id FROM roles WHERE nom = ?))
     ON DUPLICATE KEY UPDATE role_id = VALUES(role_id), mot_de_passe_hash = VALUES(mot_de_passe_hash)`,
    [nom, prenom, email.toLowerCase(), hash, role]
  );
  console.log(`Compte ${role} prêt : ${email}`);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
