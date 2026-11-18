'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluerAnnulation } = require('../src/utils/cancellationRules');

const client = { id: 1, role: 'client' };
const autre = { id: 2, role: 'client' };
const admin = { id: 9, role: 'administrateur' };
const cmd = (statut) => ({ utilisateur_id: 1, statut });

test('commande en attente : annulable, sans remboursement', () => {
  assert.deepEqual(evaluerAnnulation(cmd('En attente de paiement'), client), { autorise: true, rembourser: false });
});
test('commande confirmée ou en préparation : annulable avec remboursement', () => {
  assert.equal(evaluerAnnulation(cmd('Confirmée'), client).rembourser, true);
  assert.equal(evaluerAnnulation(cmd('En préparation'), client).rembourser, true);
});
test('commande expédiée, livrée ou déjà annulée : refusée', () => {
  for (const s of ['Expédiée', 'Livrée', 'Annulée']) assert.equal(evaluerAnnulation(cmd(s), client).autorise, false);
});
test("un client ne peut pas annuler la commande d'un autre, le personnel oui", () => {
  assert.equal(evaluerAnnulation(cmd('Confirmée'), autre).autorise, false);
  assert.equal(evaluerAnnulation(cmd('Confirmée'), autre).code, 403);
  assert.equal(evaluerAnnulation(cmd('Confirmée'), admin).autorise, true);
});
