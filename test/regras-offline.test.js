import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado } from '../js/estado.js';
import { ganhoOffline, aplicarOffline } from '../js/regras.js';

test('sem ajudantes não rende nada offline', () => {
  const e = novoEstado();
  assert.deepEqual(ganhoOffline(e, 3600), { segundos: 3600, dinheiro: 0 });
});

test('o corte é o limite: 2 ajudantes em tauari rendem R$ 1,60 por segundo', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  assert.equal(ganhoOffline(e, 100).dinheiro, 160);
});

test('o caminhão é o limite quando o corte é rápido demais', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 20;
  assert.equal(ganhoOffline(e, 100).dinheiro, 342);
  e.niveis.caminhoes = 2;
  assert.ok(ganhoOffline(e, 100).dinheiro > 342);
});

test('o ganho offline é limitado a 8 horas', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  const limite = ganhoOffline(e, 8 * 3600);
  assert.equal(limite.segundos, 28800);
  assert.deepEqual(ganhoOffline(e, 8 * 3600 * 50), limite);
});

test('tempo negativo, inválido ou muito curto não rende nada', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 5;
  for (const s of [-1000, 0, 5, NaN, undefined, Infinity]) {
    assert.deepEqual(ganhoOffline(e, s), { segundos: 0, dinheiro: 0 });
  }
});

test('aplicarOffline soma ao dinheiro e devolve o resumo', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  e.dinheiro = 10;
  const r = aplicarOffline(e, 100);
  assert.equal(r.dinheiro, 160);
  assert.equal(e.dinheiro, 170);
});

test('limite do mínimo: 9,99 s não rende; 10 s exatos rendem', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  assert.deepEqual(ganhoOffline(e, 9.99), { segundos: 0, dinheiro: 0 });
  assert.deepEqual(ganhoOffline(e, 10), { segundos: 10, dinheiro: 16 });
});
