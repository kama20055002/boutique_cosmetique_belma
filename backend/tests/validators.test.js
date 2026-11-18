'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validerEmail, validerMotDePasse, validerInscription } = require('../src/utils/validators');

test('email valide / invalide', () => {
  assert.equal(validerEmail('a@b.com'), true);
  assert.equal(validerEmail('pas-un-email'), false);
  assert.equal(validerEmail(''), false);
  assert.equal(validerEmail(null), false);
});

test('mot de passe : 8 caractères, lettre et chiffre', () => {
  assert.equal(validerMotDePasse('abc12345'), true);
  assert.equal(validerMotDePasse('abcdefgh'), false);
  assert.equal(validerMotDePasse('12345678'), false);
  assert.equal(validerMotDePasse('a1'), false);
  assert.equal(validerMotDePasse('a1'.repeat(40)), false); // > 72
});

test('inscription : retourne les erreurs', () => {
  assert.deepEqual(validerInscription({ nom: 'A', prenom: 'B', email: 'a@b.com', mot_de_passe: 'abc12345' }), []);
  assert.equal(validerInscription({}).length, 4);
});
