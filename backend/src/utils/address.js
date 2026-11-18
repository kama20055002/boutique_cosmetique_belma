'use strict';

const CP_CANADA = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
const CP_GENERIQUE = /^[A-Za-z0-9][A-Za-z0-9 -]{2,10}$/;

/**
 * Valide et normalise l'adresse de livraison.
 * @returns {{valeur?: object, erreurs: string[]}}
 */
function validerAdresse(a = {}) {
  const erreurs = [];
  const txt = (v, max) => (typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null);

  const destinataire = txt(a.destinataire, 160);
  const adresse = txt(a.adresse, 255);
  const ville = txt(a.ville, 100);
  const province = txt(a.province, 100);
  const pays = a.pays === undefined ? 'Canada' : txt(a.pays, 80);
  const codePostal = txt(a.code_postal, 12);

  if (!destinataire) erreurs.push('destinataire : requis.');
  if (!adresse) erreurs.push('adresse : requise.');
  if (!ville) erreurs.push('ville : requise.');
  if (!province) erreurs.push('province : requise.');
  if (!pays) erreurs.push('pays : invalide.');
  if (!codePostal) {
    erreurs.push('code_postal : requis.');
  } else if (pays && pays.toLowerCase() === 'canada' ? !CP_CANADA.test(codePostal) : !CP_GENERIQUE.test(codePostal)) {
    erreurs.push('code_postal : format invalide.');
  }

  if (erreurs.length) return { erreurs };
  return {
    erreurs,
    valeur: { destinataire, adresse, ville, province, pays, code_postal: codePostal.toUpperCase() },
  };
}

module.exports = { validerAdresse };
