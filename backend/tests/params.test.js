'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { idValide } = require('../src/utils/params');

test('idValide accepte les entiers positifs', () => {
  assert.equal(idValide('12'), 12);
});
test('idValide rejette le reste', () => {
  for (const v of ['0', '-1', 'abc', '1.5', '', undefined]) assert.throws(() => idValide(v), (e) => e.status === 400);
});
