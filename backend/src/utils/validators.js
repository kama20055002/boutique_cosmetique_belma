'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validerEmail(email) {
  return typeof email === 'string' && email.length <= 190 && EMAIL_RE.test(email.trim());
}

/** Mot de passe : 8 à 72 caractères (limite bcrypt), au moins une lettre et un chiffre. */
function validerMotDePasse(mdp) {
  return typeof mdp === 'string' && mdp.length >= 8 && mdp.length <= 72 && /[A-Za-z]/.test(mdp) && /\d/.test(mdp);
}

function validerNom(valeur) {
  return typeof valeur === 'string' && valeur.trim().length >= 1 && valeur.trim().length <= 80;
}

/** Valide le corps d'une inscription ; retourne la liste des erreurs (vide si OK). */
function validerInscription(body = {}) {
  const erreurs = [];
  if (!validerNom(body.nom)) erreurs.push('nom : requis (1 à 80 caractères).');
  if (!validerNom(body.prenom)) erreurs.push('prenom : requis (1 à 80 caractères).');
  if (!validerEmail(body.email)) erreurs.push('email : adresse invalide.');
  if (!validerMotDePasse(body.mot_de_passe)) {
    erreurs.push('mot_de_passe : 8 à 72 caractères avec au moins une lettre et un chiffre.');
  }
  return erreurs;
}

module.exports = { validerEmail, validerMotDePasse, validerNom, validerInscription };
