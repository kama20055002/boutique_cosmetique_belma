'use strict';
// Tous les calculs d'argent se font en cents (entiers) pour éviter les erreurs de virgule flottante.

/** "25.00" | 25 | "25" -> 2500 */
function toCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(`Montant invalide : ${value}`);
  return Math.round(n * 100);
}

/** 2500 -> "25.00" (format attendu par les colonnes DECIMAL(10,2)) */
function fromCents(cents) {
  if (!Number.isInteger(cents)) throw new TypeError(`Cents invalides : ${cents}`);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

module.exports = { toCents, fromCents };
