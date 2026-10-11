import { ESPECIES, MELHORIAS, ORDEM_MELHORIAS, VERSAO_SAVE } from './config.js';

export function novoCaminhao() {
  return { carga: { toras: 0, valor: 0 }, viajando: false, tempo: 0 };
}

export function novoEstado() {
  const niveis = {};
  for (const id of ORDEM_MELHORIAS) niveis[id] = 0;
  return {
    versao: VERSAO_SAVE,
    dinheiro: 0,
    niveis,
    especie: 'tauari',
    arvore: { vida: ESPECIES.tauari.vida },
    patio: { toras: 0, valor: 0 },
    caminhoes: [novoCaminhao()],
    salvoEm: 0,
  };
}

export function nivelMaximo(id) {
  const m = MELHORIAS[id];
  return m.custos ? m.custos.length : m.max;
}
