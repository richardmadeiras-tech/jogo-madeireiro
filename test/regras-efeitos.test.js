import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado } from '../js/estado.js';
import * as R from '../js/regras.js';

test('valores iniciais', () => {
  const e = novoEstado();
  assert.equal(R.danoPorToque(e), 1);
  assert.equal(R.danoAjudantes(e), 0);
  assert.equal(R.capacidadeCaminhao(e), 6);
  assert.equal(R.capacidadePatio(e), 10);
  assert.equal(R.quantidadeCaminhoes(e), 1);
  assert.equal(R.tempoViagem(e), 12);
});

test('os níveis aumentam os efeitos', () => {
  const e = novoEstado();
  e.niveis.ferramenta = 2;
  e.niveis.ajudantes = 4;
  e.niveis.capacidade = 3;
  e.niveis.patio = 2;
  e.niveis.caminhoes = 2;
  assert.equal(R.danoPorToque(e), 12);
  assert.equal(R.danoAjudantes(e), 2);
  assert.equal(R.capacidadeCaminhao(e), 12);
  assert.equal(R.capacidadePatio(e), 20);
  assert.equal(R.quantidadeCaminhoes(e), 3);
});

test('a viagem encurta com a velocidade, mas nunca abaixo do mínimo', () => {
  const e = novoEstado();
  e.niveis.velocidade = 1;
  assert.ok(R.tempoViagem(e) < 12);
  e.niveis.velocidade = 1000;
  assert.equal(R.tempoViagem(e), 2);
});

test('custoProximo: tabela explícita, crescimento de 15% e nível máximo', () => {
  const e = novoEstado();
  assert.equal(R.custoProximo(e, 'ferramenta'), 100);
  e.niveis.ferramenta = 1;
  assert.equal(R.custoProximo(e, 'ferramenta'), 1500);
  e.niveis.ferramenta = 2;
  assert.equal(R.custoProximo(e, 'ferramenta'), null);

  assert.equal(R.custoProximo(e, 'ajudantes'), 50);
  e.niveis.ajudantes = 1;
  assert.equal(R.custoProximo(e, 'ajudantes'), 58);
  e.niveis.ajudantes = 2;
  assert.equal(R.custoProximo(e, 'ajudantes'), 67);
  e.niveis.ajudantes = 20;
  assert.equal(R.custoProximo(e, 'ajudantes'), null);
});

test('a ferramenta libera as espécies melhores', () => {
  const e = novoEstado();
  assert.equal(R.especieDesbloqueada(e, 'tauari'), true);
  assert.equal(R.especieDesbloqueada(e, 'cumaru'), false);
  e.niveis.ferramenta = 1;
  assert.equal(R.especieDesbloqueada(e, 'cumaru'), true);
  assert.equal(R.especieDesbloqueada(e, 'ipe'), false);
  e.niveis.ferramenta = 2;
  assert.equal(R.especieDesbloqueada(e, 'ipe'), true);
});

test('sincronizarCaminhoes cria os caminhões que faltam e não mexe nos existentes', () => {
  const e = novoEstado();
  e.caminhoes[0].carga.toras = 4;
  e.niveis.caminhoes = 2;
  R.sincronizarCaminhoes(e);
  assert.equal(e.caminhoes.length, 3);
  assert.equal(e.caminhoes[0].carga.toras, 4);
  assert.equal(e.caminhoes[2].carga.toras, 0);
});
