import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarJogo } from '../js/jogo.js';
import { novoEstado } from '../js/estado.js';
import { serializar } from '../js/salvar.js';
import { CHAVE_SAVE, CHAVE_BACKUP } from '../js/config.js';
import { armazenamentoFalso } from './auxiliar.js';

function relogio(inicio = 0) {
  let t = inicio;
  return { agora: () => t, avancar: (ms) => { t += ms; } };
}

test('jogo novo: sem offline e sem aviso', () => {
  const j = criarJogo({ storage: armazenamentoFalso(), agora: relogio(1000).agora });
  assert.equal(j.origem, 'novo');
  assert.deepEqual(j.offline, { segundos: 0, dinheiro: 0 });
});

test('tocarArvore corta; derrubar rende toras no pátio', () => {
  const j = criarJogo({ storage: armazenamentoFalso(), agora: relogio().agora });
  for (let i = 0; i < 9; i++) assert.equal(j.tocarArvore(), false);
  assert.equal(j.tocarArvore(), true);
  assert.equal(j.estado.patio.toras, 2);
});

test('comprar salva o jogo; sem dinheiro não muda nada', () => {
  const s = armazenamentoFalso();
  const j = criarJogo({ storage: s, agora: relogio().agora });
  assert.equal(j.comprar('ajudantes'), false);
  assert.equal(s.getItem(CHAVE_SAVE), null);
  j.estado.dinheiro = 100;
  assert.equal(j.comprar('ajudantes'), true);
  assert.ok(s.getItem(CHAVE_SAVE).includes('"ajudantes":1'));
});

test('passo avança o tempo pelo relógio', () => {
  const r = relogio(0);
  const j = criarJogo({ storage: armazenamentoFalso(), agora: r.agora });
  j.estado.niveis.ajudantes = 2;
  r.avancar(2000);
  const { ganho, offline } = j.passo();
  assert.equal(ganho, 0);
  assert.equal(offline, null);
  assert.equal(j.estado.arvore.vida, 8);
});

test('passo com muito tempo parado vira ganho offline', () => {
  const r = relogio(0);
  const j = criarJogo({ storage: armazenamentoFalso(), agora: r.agora });
  j.estado.niveis.ajudantes = 2;
  r.avancar(100_000);
  const { offline } = j.passo();
  assert.equal(offline.dinheiro, 160);
  assert.equal(j.estado.dinheiro, 160);
});

test('relógio andando para trás não rende nada e não trava o passo seguinte', () => {
  const r = relogio(10_000);
  const j = criarJogo({ storage: armazenamentoFalso(), agora: r.agora });
  j.estado.niveis.ajudantes = 2;
  r.avancar(-5000);
  assert.deepEqual(j.passo(), { ganho: 0, offline: null });
  assert.equal(j.estado.dinheiro, 0);
  assert.equal(j.estado.arvore.vida, 10);
  r.avancar(1000);
  j.passo();
  assert.equal(j.estado.arvore.vida, 9);
});

test('ao abrir um save antigo, o ganho offline é aplicado', () => {
  const s = armazenamentoFalso();
  const antigo = novoEstado();
  antigo.niveis.ajudantes = 2;
  s.setItem(CHAVE_SAVE, serializar(antigo, 1000));
  const j = criarJogo({ storage: s, agora: relogio(1000 + 100_000).agora });
  assert.equal(j.origem, 'save');
  assert.equal(j.offline.dinheiro, 160);
  assert.equal(j.estado.dinheiro, 160);
});

test('save com a data no futuro não rende nada', () => {
  const s = armazenamentoFalso();
  const antigo = novoEstado();
  antigo.niveis.ajudantes = 2;
  s.setItem(CHAVE_SAVE, serializar(antigo, 9_999_999));
  const j = criarJogo({ storage: s, agora: relogio(1000).agora });
  assert.equal(j.offline.dinheiro, 0);
});

test('save corrompido: começa do zero e avisa', () => {
  const s = armazenamentoFalso();
  s.setItem(CHAVE_SAVE, '{lixo');
  const j = criarJogo({ storage: s, agora: relogio().agora });
  assert.equal(j.origem, 'corrompido');
  assert.equal(typeof j.motivo, 'string');
  assert.equal(s.getItem(CHAVE_BACKUP), '{lixo');
});

test('importar inválido não mexe no estado; válido troca no lugar', () => {
  const j = criarJogo({ storage: armazenamentoFalso(), agora: relogio().agora });
  const referencia = j.estado;
  j.estado.dinheiro = 5;
  assert.equal(j.importar('').ok, false);
  assert.equal(j.importar('{lixo').ok, false);
  assert.equal(j.estado.dinheiro, 5);

  const outro = novoEstado();
  outro.dinheiro = 999;
  assert.equal(j.importar(serializar(outro, 1)).ok, true);
  assert.equal(j.estado, referencia);
  assert.equal(j.estado.dinheiro, 999);
});

test('exportar gera um texto que o importar entende', () => {
  const a = criarJogo({ storage: armazenamentoFalso(), agora: relogio().agora });
  a.estado.dinheiro = 321;
  const b = criarJogo({ storage: armazenamentoFalso(), agora: relogio().agora });
  assert.equal(b.importar(a.exportar()).ok, true);
  assert.equal(b.estado.dinheiro, 321);
});

test('recomecar zera o jogo e guarda o save anterior como backup', () => {
  const s = armazenamentoFalso();
  const j = criarJogo({ storage: s, agora: relogio().agora });
  j.estado.dinheiro = 50;
  j.salvar();
  j.recomecar();
  assert.equal(j.estado.dinheiro, 0);
  assert.ok(s.getItem(CHAVE_BACKUP).includes('"dinheiro":50'));
});
