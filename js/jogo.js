import { carregarLocal, salvarLocal, serializar, desserializar } from './salvar.js';
import * as R from './regras.js';
import { novoEstado } from './estado.js';
import { OFFLINE_MINIMO_S, CHAVE_BACKUP } from './config.js';

const PASSO_MAX_S = 0.5;

function substituir(destino, origem) {
  for (const k of Object.keys(destino)) delete destino[k];
  Object.assign(destino, origem);
}

export function criarJogo({ storage, agora = () => Date.now() }) {
  const carregado = carregarLocal(storage);
  const estado = carregado.estado;
  let ultimo = agora();

  let offline = { segundos: 0, dinheiro: 0 };
  if (carregado.origem === 'save') {
    offline = R.aplicarOffline(estado, (ultimo - estado.salvoEm) / 1000);
  }

  const jogo = {
    estado,
    origem: carregado.origem,
    motivo: carregado.motivo,
    offline,

    tocarArvore: () => R.cortar(estado, R.danoPorToque(estado)),
    tocarCarga: () => R.tocarCarga(estado),
    escolherEspecie: (id) => R.trocarEspecie(estado, id),

    comprar(id) {
      const ok = R.comprar(estado, id);
      if (ok) jogo.salvar();
      return ok;
    },

    passo() {
      const t = agora();
      const dt = (t - ultimo) / 1000;
      ultimo = t;
      if (!(dt > 0)) return { ganho: 0, offline: null };
      if (dt >= OFFLINE_MINIMO_S) return { ganho: 0, offline: R.aplicarOffline(estado, dt) };
      let ganho = 0;
      let resto = dt;
      while (resto > 1e-9) {
        const parte = Math.min(resto, PASSO_MAX_S);
        ganho += R.avancar(estado, parte);
        resto -= parte;
      }
      return { ganho, offline: null };
    },

    salvar: () => salvarLocal(storage, estado, agora()),
    exportar: () => serializar(estado, agora()),

    importar(texto) {
      const r = desserializar(texto);
      if (!r.ok) return r;
      substituir(estado, r.estado);
      jogo.salvar();
      return { ok: true };
    },

    recomecar() {
      try {
        storage.setItem(CHAVE_BACKUP, serializar(estado, agora()));
      } catch {
        // sem espaço para o backup: recomeça assim mesmo
      }
      substituir(estado, novoEstado());
      jogo.salvar();
    },
  };
  return jogo;
}
