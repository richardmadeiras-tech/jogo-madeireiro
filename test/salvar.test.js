import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado } from '../js/estado.js';
import { CHAVE_SAVE, CHAVE_BACKUP, ESPECIES } from '../js/config.js';
import {
  serializar, desserializar, migrar, sanear,
  salvarLocal, carregarLocal, armazenamentoSeguro,
} from '../js/salvar.js';
import { armazenamentoFalso } from './auxiliar.js';

test('ida e volta preserva o estado', () => {
  const e = novoEstado();
  e.dinheiro = 123;
  e.niveis.ajudantes = 3;
  e.patio = { toras: 4, valor: 60 };
  const r = desserializar(serializar(e, 5000));
  assert.equal(r.ok, true);
  assert.equal(r.estado.dinheiro, 123);
  assert.equal(r.estado.niveis.ajudantes, 3);
  assert.deepEqual(r.estado.patio, { toras: 4, valor: 60 });
  assert.equal(r.estado.salvoEm, 5000);
});

test('texto quebrado, vazio ou de outro formato é recusado com motivo', () => {
  for (const texto of ['', '{quebrado', 'null', '[]', '"texto"', '42']) {
    const r = desserializar(texto);
    assert.equal(r.ok, false, `deveria recusar: ${texto}`);
    assert.equal(typeof r.motivo, 'string');
  }
});

test('versão futura ou ausente é recusada', () => {
  assert.equal(desserializar(JSON.stringify({ versao: 99, dinheiro: 5 })).ok, false);
  assert.equal(desserializar(JSON.stringify({ dinheiro: 5 })).ok, false);
});

test('migrar aplica as migrações em ordem; sem migração devolve null', () => {
  const migracoes = { 1: (o) => ({ ...o, b: 2 }), 2: (o) => ({ ...o, c: 3 }) };
  assert.deepEqual(migrar({ versao: 1, a: 1 }, migracoes, 3), { versao: 3, a: 1, b: 2, c: 3 });
  assert.equal(migrar({ versao: 1 }, {}, 2), null);
  assert.equal(migrar({ versao: 3 }, {}, 2), null);
});

test('sanear corrige valores absurdos sem gerar NaN', () => {
  const lixo = {
    versao: 1,
    dinheiro: null,
    niveis: { ajudantes: 9999, ferramenta: -3, capacidade: 2.7, patio: 'abc', velocidade: null },
    especie: 'jatoba',
    arvore: { vida: null },
    patio: { toras: -4, valor: 'x' },
    caminhoes: 'nao-lista',
  };
  const e = sanear(lixo);
  assert.equal(e.dinheiro, 0);
  assert.equal(e.niveis.ajudantes, 20);
  assert.equal(e.niveis.ferramenta, 0);
  assert.equal(e.niveis.capacidade, 2);
  assert.equal(e.niveis.patio, 0);
  assert.equal(e.niveis.velocidade, 0);
  assert.equal(e.especie, 'tauari');
  assert.equal(e.arvore.vida, ESPECIES.tauari.vida);
  assert.deepEqual(e.patio, { toras: 0, valor: 0 });
  assert.equal(e.caminhoes.length, 1);
  assert.equal(sanear({}).dinheiro, 0);
});

test('sanear: espécie bloqueada volta para tauari; liberada é mantida', () => {
  assert.equal(sanear({ versao: 1, especie: 'ipe', niveis: { ferramenta: 0 } }).especie, 'tauari');
  assert.equal(sanear({ versao: 1, especie: 'ipe', niveis: { ferramenta: 2 } }).especie, 'ipe');
});

test('sanear: a vida da árvore fica entre 0 e o máximo da espécie', () => {
  assert.equal(sanear({ arvore: { vida: 9999 } }).arvore.vida, ESPECIES.tauari.vida);
  assert.equal(sanear({ arvore: { vida: -5 } }).arvore.vida, ESPECIES.tauari.vida);
  assert.equal(sanear({ arvore: { vida: 4 } }).arvore.vida, 4);
});

test('sanear: a quantidade de caminhões acompanha o nível', () => {
  const sobra = sanear({ niveis: { caminhoes: 0 }, caminhoes: [{}, {}, {}, {}] });
  assert.equal(sobra.caminhoes.length, 1);
  const falta = sanear({ niveis: { caminhoes: 2 }, caminhoes: [] });
  assert.equal(falta.caminhoes.length, 3);
});

test('sanear: a carga do caminhão não passa da capacidade', () => {
  const e = sanear({ caminhoes: [{ carga: { toras: 500, valor: 10 }, viajando: true, tempo: -3 }] });
  assert.equal(e.caminhoes[0].carga.toras, 6);
  assert.equal(e.caminhoes[0].viajando, true);
  assert.equal(e.caminhoes[0].tempo, 0);
});

test('carregarLocal: sem save, com save e com save corrompido', () => {
  const s = armazenamentoFalso();
  assert.equal(carregarLocal(s).origem, 'novo');

  const e = novoEstado();
  e.dinheiro = 77;
  assert.equal(salvarLocal(s, e, 1000), true);
  const lido = carregarLocal(s);
  assert.equal(lido.origem, 'save');
  assert.equal(lido.estado.dinheiro, 77);

  s.setItem(CHAVE_SAVE, '{lixo');
  const ruim = carregarLocal(s);
  assert.equal(ruim.origem, 'corrompido');
  assert.equal(ruim.estado.dinheiro, 0);
  assert.equal(typeof ruim.motivo, 'string');
  assert.equal(s.getItem(CHAVE_BACKUP), '{lixo');
});

test('armazenamento que lança erro não derruba o jogo', () => {
  const quebrado = {
    getItem() { throw new Error('bloqueado'); },
    setItem() { throw new Error('cheio'); },
    removeItem() { throw new Error('bloqueado'); },
  };
  assert.equal(carregarLocal(quebrado).origem, 'novo');
  assert.equal(salvarLocal(quebrado, novoEstado(), 1), false);
});

test('armazenamentoSeguro cai para memória quando o localStorage falha', () => {
  const s = armazenamentoSeguro(() => { throw new Error('sem acesso'); });
  s.setItem('a', '1');
  assert.equal(s.getItem('a'), '1');
  assert.equal(s.getItem('b'), null);
  s.removeItem('a');
  assert.equal(s.getItem('a'), null);

  const bom = armazenamentoFalso();
  assert.equal(armazenamentoSeguro(() => bom), bom);
});
