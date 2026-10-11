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

export function patioCheio(e) {
  return e.patio.toras >= capacidadePatio(e);
}

export function cortar(e, dano) {
  if (!(dano > 0) || !Number.isFinite(dano) || patioCheio(e)) return false;
  const esp = C.ESPECIES[e.especie];
  e.arvore.vida -= dano;
  if (e.arvore.vida > 0) return false;
  e.patio.toras += esp.toras;
  e.patio.valor += esp.toras * esp.preco;
  e.arvore.vida = esp.vida;
  return true;
}

export function trocarEspecie(e, id) {
  if (!C.ESPECIES[id] || id === e.especie || !especieDesbloqueada(e, id)) return false;
  e.especie = id;
  e.arvore.vida = C.ESPECIES[id].vida;
  return true;
}

function moverToras(origem, destino, qtd) {
  const n = Math.min(qtd, origem.toras);
  if (!(n > 0)) return 0;
  const valor = origem.valor * (n / origem.toras);
  origem.toras -= n;
  origem.valor -= valor;
  destino.toras += n;
  destino.valor += valor;
  if (origem.toras <= 1e-9) {
    origem.toras = 0;
    origem.valor = 0;
  }
  return n;
}

export function carregarCaminhao(e, caminhao, qtd) {
  const cap = capacidadeCaminhao(e);
  const espaco = cap - caminhao.carga.toras;
  moverToras(e.patio, caminhao.carga, Math.min(qtd, espaco));
  if (caminhao.carga.toras >= cap - 1e-9) {
    caminhao.viajando = true;
    caminhao.tempo = 0;
  }
}

export function tocarCarga(e) {
  const caminhao = e.caminhoes.find((c) => !c.viajando);
  if (!caminhao) return false;
  carregarCaminhao(e, caminhao, C.TORAS_POR_TOQUE_CARGA);
  return true;
}

export function avancar(e, dt) {
  if (!(dt > 0) || !Number.isFinite(dt)) return 0;
  let ganho = 0;
  cortar(e, danoAjudantes(e) * dt);
  for (const c of e.caminhoes) {
    if (!c.viajando) {
      carregarCaminhao(e, c, C.CARGA_POR_S * dt);
    } else {
      c.tempo += dt;
      if (c.tempo >= tempoViagem(e)) {
        ganho += c.carga.valor;
        c.carga = { toras: 0, valor: 0 };
        c.viajando = false;
        c.tempo = 0;
      }
    }
  }
  e.dinheiro += ganho;
  return ganho;
}

export function comprar(e, id) {
  if (!C.MELHORIAS[id]) return false;
  const custo = custoProximo(e, id);
  if (custo === null || e.dinheiro < custo) return false;
  e.dinheiro -= custo;
  e.niveis[id] += 1;
  if (id === 'caminhoes') sincronizarCaminhoes(e);
  return true;
}
