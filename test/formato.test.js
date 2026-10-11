import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarReais } from '../js/formato.js';

test('formata reais com ponto de milhar e sem centavos', () => {
  assert.equal(formatarReais(0), 'R$ 0');
  assert.equal(formatarReais(1234.9), 'R$ 1.234');
  assert.equal(formatarReais(999999), 'R$ 999.999');
});

test('abrevia milhões', () => {
  assert.equal(formatarReais(1500000), 'R$ 1,5 mi');
});

test('valores inválidos viram zero', () => {
  assert.equal(formatarReais(NaN), 'R$ 0');
  assert.equal(formatarReais(-5), 'R$ 0');
  assert.equal(formatarReais(undefined), 'R$ 0');
});
