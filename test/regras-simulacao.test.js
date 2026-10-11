import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado } from '../js/estado.js';
import * as R from '../js/regras.js';

const perto = (a, b) => Math.abs(a - b) < 1e-9;

test('cortar: a árvore só cai quando a vida zera, e vira toras no pátio', () => {
  const e = novoEstado();
  assert.equal(R.cortar(e, 4), false);
  assert.equal(R.cortar(e, 4), false);
  assert.equal(e.patio.toras, 0);
  assert.equal(R.cortar(e, 2), true);
  assert.equal(e.patio.toras, 2);
  assert.equal(e.patio.valor, 16);
  assert.equal(e.arvore.vida, 10);
});

test('cortar com o pátio cheio não faz nada e não perde a árvore', () => {
  const e = novoEstado();
  e.patio = { toras: 10, valor: 80 };
  e.arvore.vida = 5;
  assert.equal(R.cortar(e, 3), false);
  assert.equal(e.arvore.vida, 5);
  assert.equal(e.patio.toras, 10);
  assert.equal(e.patio.valor, 80);
});

test('cortar ignora dano zero, negativo ou inválido', () => {
  const e = novoEstado();
  for (const dano of [0, -2, NaN, undefined, Infinity * 0]) {
    assert.equal(R.cortar(e, dano), false);
    assert.equal(e.arvore.vida, 10);
  }
});

test('trocarEspecie: bloqueada não troca; liberada troca e renova a árvore', () => {
  const e = novoEstado();
  assert.equal(R.trocarEspecie(e, 'cumaru'), false);
  assert.equal(R.trocarEspecie(e, 'jatoba'), false);
  e.niveis.ferramenta = 1;
  e.arvore.vida = 3;
  assert.equal(R.trocarEspecie(e, 'cumaru'), true);
  assert.equal(e.especie, 'cumaru');
  assert.equal(e.arvore.vida, 40);
  assert.equal(R.trocarEspecie(e, 'cumaru'), false);
});

test('tocarCarga leva duas toras do pátio ao caminhão, com o valor proporcional', () => {
  const e = novoEstado();
  e.patio = { toras: 4, valor: 100 };
  assert.equal(R.tocarCarga(e), true);
  assert.equal(e.caminhoes[0].carga.toras, 2);
  assert.equal(e.caminhoes[0].carga.valor, 50);
  assert.deepEqual(e.patio, { toras: 2, valor: 50 });
});

test('tocarCarga com pátio vazio ou sem caminhão parado não muda nada', () => {
  const e = novoEstado();
  assert.equal(R.tocarCarga(e), true);
  assert.deepEqual(e.caminhoes[0].carga, { toras: 0, valor: 0 });
  e.caminhoes[0].viajando = true;
  e.patio = { toras: 4, valor: 100 };
  assert.equal(R.tocarCarga(e), false);
  assert.deepEqual(e.patio, { toras: 4, valor: 100 });
});

test('avancar: o caminhão enche, viaja e paga na chegada', () => {
  const e = novoEstado();
  e.patio = { toras: 6, valor: 48 };
  assert.equal(R.avancar(e, 2), 0);
  assert.equal(e.caminhoes[0].viajando, true);
  assert.equal(e.patio.toras, 0);
  assert.equal(R.avancar(e, 11), 0);
  assert.equal(e.dinheiro, 0);
  assert.equal(R.avancar(e, 1), 48);
  assert.equal(e.dinheiro, 48);
  assert.equal(e.caminhoes[0].viajando, false);
  assert.deepEqual(e.caminhoes[0].carga, { toras: 0, valor: 0 });
});

test('avancar: ajudantes cortam sozinhos e as toras seguem para o caminhão', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  R.avancar(e, 10);
  const total = e.patio.toras + e.caminhoes[0].carga.toras;
  assert.ok(perto(total, 2));
});

test('avancar ignora tempo inválido', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  for (const dt of [0, -1, NaN, undefined]) assert.equal(R.avancar(e, dt), 0);
  assert.equal(e.arvore.vida, 10);
  assert.equal(e.patio.toras, 0);
});

test('comprar: sem dinheiro ou no nível máximo nada muda', () => {
  const e = novoEstado();
  e.dinheiro = 49;
  assert.equal(R.comprar(e, 'ajudantes'), false);
  assert.equal(e.dinheiro, 49);
  assert.equal(e.niveis.ajudantes, 0);
  assert.equal(R.comprar(e, 'inexistente'), false);

  e.dinheiro = 1e9;
  e.niveis.ferramenta = 2;
  assert.equal(R.comprar(e, 'ferramenta'), false);
  assert.equal(e.dinheiro, 1e9);
  assert.equal(e.niveis.ferramenta, 2);
});

test('comprar desconta o custo e sobe o nível; comprar caminhão cria o caminhão', () => {
  const e = novoEstado();
  e.dinheiro = 500;
  assert.equal(R.comprar(e, 'ajudantes'), true);
  assert.equal(e.dinheiro, 450);
  assert.equal(e.niveis.ajudantes, 1);
  assert.equal(R.comprar(e, 'caminhoes'), true);
  assert.equal(e.dinheiro, 50);
  assert.equal(e.caminhoes.length, 2);
});

test('ids com chaves de protótipo são recusados', () => {
  const e = novoEstado();
  const antes = JSON.stringify(e);
  assert.equal(R.trocarEspecie(e, 'constructor'), false);
  assert.equal(R.trocarEspecie(e, 'toString'), false);
  assert.equal(R.comprar(e, 'constructor'), false);
  assert.equal(R.comprar(e, '__proto__'), false);
  assert.equal(JSON.stringify(e), antes);
});

test('cortar: dano sobrando passa para a próxima árvore', () => {
  const e = novoEstado();
  e.especie = 'tauari';
  e.arvore.vida = 10;
  assert.equal(R.cortar(e, 25), true);
  assert.equal(e.patio.toras, 4);
  assert.equal(e.patio.valor, 32);
  assert.ok(perto(e.arvore.vida, 5));
});

test('cortar: dano enorme para quando o pátio enche, sem NaN', () => {
  const e = novoEstado();
  assert.equal(R.cortar(e, 1e9), true);
  assert.ok(e.patio.toras >= 10);
  assert.ok(Number.isFinite(e.patio.toras) && Number.isFinite(e.patio.valor) && Number.isFinite(e.arvore.vida));
});

test('avancar: dois caminhões entregam e pagam tudo', () => {
  const e = novoEstado();
  e.niveis.caminhoes = 1;
  R.sincronizarCaminhoes(e);
  e.patio = { toras: 12, valor: 96 };
  for (let i = 0; i < 4; i++) R.avancar(e, 0.5);
  assert.ok(e.caminhoes.every((c) => c.viajando));
  for (let i = 0; i < 24; i++) R.avancar(e, 0.5);
  assert.ok(e.caminhoes.every((c) => !c.viajando));
  assert.ok(perto(e.dinheiro, 96));
});
