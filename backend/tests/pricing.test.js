'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculerMontants } = require('../src/utils/pricing');
const { toCents, fromCents } = require('../src/utils/money');
const { validerAdresse } = require('../src/utils/address');

const CFG = { tauxTaxe: 0.13, fraisLivraisonCents: 800, seuilLivraisonGratuiteCents: 0 };

test("exemple du cahier des charges : sous-total de 103 $", () => {
  const m = calculerMontants(
    [{ prix_cents: 2500, quantite: 2 }, { prix_cents: 3500, quantite: 1 }, { prix_cents: 1800, quantite: 1 }],
    CFG
  );
  assert.equal(m.sous_total, 10300);
  assert.equal(m.taxes, 1339); // 13 %
  assert.equal(m.frais_livraison, 800);
  assert.equal(m.montant_total, 12439);
});

test('livraison gratuite dès le seuil (0 = jamais)', () => {
  const cfg = { ...CFG, seuilLivraisonGratuiteCents: 7500 };
  assert.equal(calculerMontants([{ prix_cents: 10300, quantite: 1 }], cfg).frais_livraison, 0);
  assert.equal(calculerMontants([{ prix_cents: 1800, quantite: 1 }], cfg).frais_livraison, 800);
  assert.equal(calculerMontants([{ prix_cents: 999999, quantite: 1 }], CFG).frais_livraison, 800);
});

test('entrées invalides rejetées', () => {
  assert.throws(() => calculerMontants([], CFG), RangeError);
  assert.throws(() => calculerMontants([{ prix_cents: 100, quantite: 0 }], CFG), RangeError);
  assert.throws(() => calculerMontants([{ prix_cents: -5, quantite: 1 }], CFG), RangeError);
  assert.throws(() => calculerMontants([{ prix_cents: 10.5, quantite: 1 }], CFG), RangeError);
});

test('conversion cents', () => {
  assert.equal(toCents('25.00'), 2500);
  assert.equal(toCents('19.99'), 1999);
  assert.equal(fromCents(1999), '19.99');
  assert.equal(fromCents(5), '0.05');
  assert.equal(fromCents(10300), '103.00');
  assert.throws(() => toCents('abc'), TypeError);
});

test('adresse : valide et invalide', () => {
  const ok = validerAdresse({ destinataire: 'A B', adresse: '1 rue X', ville: 'Montréal', province: 'QC', code_postal: 'h2x 1y4' });
  assert.deepEqual(ok.erreurs, []);
  assert.equal(ok.valeur.code_postal, 'H2X 1Y4');
  assert.equal(ok.valeur.pays, 'Canada');
  assert.ok(validerAdresse({}).erreurs.length >= 5);
  assert.ok(validerAdresse({ destinataire: 'A', adresse: 'x', ville: 'v', province: 'p', code_postal: '12345' }).erreurs.length === 1);
});
