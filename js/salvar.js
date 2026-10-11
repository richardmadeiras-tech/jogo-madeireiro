import { CHAVE_SAVE, CHAVE_BACKUP, ESPECIES, ORDEM_MELHORIAS, VERSAO_SAVE } from './config.js';
import { novoEstado, nivelMaximo } from './estado.js';
import {
  especieDesbloqueada, quantidadeCaminhoes, capacidadeCaminhao, sincronizarCaminhoes,
} from './regras.js';

// MIGRACOES[n] converte um save da versão n para a versão n+1.
const MIGRACOES = {};

const numero = (x, padrao = 0) => (Number.isFinite(x) && x >= 0 ? x : padrao);

export function serializar(estado, agoraMs) {
  return JSON.stringify({ ...estado, versao: VERSAO_SAVE, salvoEm: agoraMs });
}

export function migrar(obj, migracoes = MIGRACOES, alvo = VERSAO_SAVE) {
  let v = obj.versao;
  if (!Number.isInteger(v) || v < 1 || v > alvo) return null;
  let atual = obj;
  while (v < alvo) {
    const passo = migracoes[v];
    if (!passo) return null;
    atual = passo(atual);
    v += 1;
    atual.versao = v;
  }
  return atual;
}

export function sanear(obj) {
  const e = novoEstado();
  e.dinheiro = numero(obj.dinheiro);

  const niveis = obj.niveis && typeof obj.niveis === 'object' ? obj.niveis : {};
  for (const id of ORDEM_MELHORIAS) {
    e.niveis[id] = Math.min(Math.floor(numero(niveis[id])), nivelMaximo(id));
  }

  e.especie = ESPECIES[obj.especie] && especieDesbloqueada(e, obj.especie) ? obj.especie : 'tauari';
  const vidaMax = ESPECIES[e.especie].vida;
  const vida = obj.arvore && obj.arvore.vida;
  e.arvore.vida = Number.isFinite(vida) && vida > 0 ? Math.min(vida, vidaMax) : vidaMax;

  const patio = obj.patio || {};
  e.patio = { toras: numero(patio.toras), valor: numero(patio.valor) };

  const lista = Array.isArray(obj.caminhoes) ? obj.caminhoes : [];
  const cap = capacidadeCaminhao(e);
  e.caminhoes = lista.slice(0, quantidadeCaminhoes(e)).map((c) => ({
    carga: {
      toras: Math.min(numero(c && c.carga && c.carga.toras), cap),
      valor: numero(c && c.carga && c.carga.valor),
    },
    viajando: !!c && c.viajando === true,
    tempo: numero(c && c.tempo),
  }));
  sincronizarCaminhoes(e);

  e.salvoEm = numero(obj.salvoEm);
  return e;
}

export function desserializar(texto) {
  let obj;
  try {
    obj = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: 'O save não é um JSON válido.' };
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, motivo: 'O save está num formato desconhecido.' };
  }
  const migrado = migrar(obj);
  if (!migrado) return { ok: false, motivo: 'Esse save é de uma versão que o jogo não entende.' };
  return { ok: true, estado: sanear(migrado) };
}

export function salvarLocal(storage, estado, agoraMs) {
  try {
    storage.setItem(CHAVE_SAVE, serializar(estado, agoraMs));
    return true;
  } catch {
    return false;
  }
}

export function carregarLocal(storage) {
  let texto;
  try {
    texto = storage.getItem(CHAVE_SAVE);
  } catch {
    return { origem: 'novo', estado: novoEstado() };
  }
  if (texto == null) return { origem: 'novo', estado: novoEstado() };
  const r = desserializar(texto);
  if (r.ok) return { origem: 'save', estado: r.estado };
  try {
    storage.setItem(CHAVE_BACKUP, texto);
  } catch {
    // sem espaço para o backup: segue assim mesmo
  }
  return { origem: 'corrompido', estado: novoEstado(), motivo: r.motivo };
}

export function armazenamentoSeguro(obterStorage) {
  try {
    const s = obterStorage();
    s.setItem('__teste', '1');
    s.removeItem('__teste');
    return s;
  } catch {
    const memoria = new Map();
    return {
      getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
      setItem: (k, v) => { memoria.set(k, String(v)); },
      removeItem: (k) => { memoria.delete(k); },
    };
  }
}
