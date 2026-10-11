import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado, novoCaminhao, nivelMaximo } from '../js/estado.js';
import { ESPECIES, ORDEM_ESPECIES, ORDEM_MELHORIAS, MELHORIAS } from '../js/config.js';

test('estado novo começa zerado, com um caminhão e árvore de tauari inteira', () => {
  const e = novoEstado();
  assert.equal(e.dinheiro, 0);
  assert.equal(e.especie, 'tauari');
  assert.equal(e.arvore.vida, ESPECIES.tauari.vida);
  assert.deepEqual(e.patio, { toras: 0, valor: 0 });
  assert.equal(e.caminhoes.length, 1);
  assert.deepEqual(e.caminhoes[0], { carga: { toras: 0, valor: 0 }, viajando: false, tempo: 0 });
  for (const id of ORDEM_MELHORIAS) assert.equal(e.niveis[id], 0);
});

test('cada chamada devolve objetos independentes', () => {
  const a = novoEstado();
  const b = novoEstado();
  a.niveis.ajudantes = 5;
  a.caminhoes[0].carga.toras = 3;
  assert.equal(b.niveis.ajudantes, 0);
  assert.equal(b.caminhoes[0].carga.toras, 0);
  assert.notEqual(novoCaminhao(), novoCaminhao());
});

test('nivelMaximo usa a tabela de custos quando existe, senão max', () => {
  assert.equal(nivelMaximo('ferramenta'), 2);
  assert.equal(nivelMaximo('caminhoes'), 2);
  assert.equal(nivelMaximo('ajudantes'), 20);
});

test('espécies: preço e ferramenta mínima crescem na ordem de progressão', () => {
  for (let i = 1; i < ORDEM_ESPECIES.length; i++) {
    const antes = ESPECIES[ORDEM_ESPECIES[i - 1]];
    const depois = ESPECIES[ORDEM_ESPECIES[i]];
    assert.ok(depois.preco > antes.preco);
    assert.ok(depois.vida > antes.vida);
    assert.ok(depois.ferramentaMin > antes.ferramentaMin);
  }
  assert.ok(MELHORIAS.ferramenta.custos.length >= ESPECIES.ipe.ferramentaMin);
});
