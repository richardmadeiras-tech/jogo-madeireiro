import * as C from './config.js';
import { nivelMaximo, novoCaminhao } from './estado.js';

export function danoPorToque(e) {
  return C.DANO_FERRAMENTA[e.niveis.ferramenta];
}

export function danoAjudantes(e) {
  return e.niveis.ajudantes * C.DANO_AJUDANTE_S;
}

export function capacidadeCaminhao(e) {
  return C.CAPACIDADE_BASE + C.CAPACIDADE_POR_NIVEL * e.niveis.capacidade;
}

export function capacidadePatio(e) {
  return C.PATIO_BASE + C.PATIO_POR_NIVEL * e.niveis.patio;
}

export function tempoViagem(e) {
  return Math.max(C.VIAGEM_MIN_S, C.VIAGEM_BASE_S * C.VIAGEM_FATOR ** e.niveis.velocidade);
}

export function quantidadeCaminhoes(e) {
  return 1 + e.niveis.caminhoes;
}

export function especieDesbloqueada(e, id) {
  return e.niveis.ferramenta >= C.ESPECIES[id].ferramentaMin;
}

export function custoProximo(e, id) {
  const m = C.MELHORIAS[id];
  const n = e.niveis[id];
  if (n >= nivelMaximo(id)) return null;
  return m.custos ? m.custos[n] : Math.ceil(m.base * C.CRESCIMENTO_CUSTO ** n);
}

export function sincronizarCaminhoes(e) {
  while (e.caminhoes.length < quantidadeCaminhoes(e)) e.caminhoes.push(novoCaminhao());
}
