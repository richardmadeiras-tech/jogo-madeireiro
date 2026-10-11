import { criarJogo } from './jogo.js';
import { criarTela } from './tela.js';
import { armazenamentoSeguro } from './salvar.js';
import { formatarReais } from './formato.js';

const storage = armazenamentoSeguro(() => window.localStorage);
const jogo = criarJogo({ storage });
const tela = criarTela(jogo);

function avisarOffline(offline) {
  if (offline && offline.dinheiro > 0) {
    tela.mostrarAviso(`Enquanto você estava fora, ganhou ${formatarReais(offline.dinheiro)}!`, 8000);
  }
}

if (jogo.origem === 'corrompido') {
  tela.mostrarAviso(`Não consegui ler o save (${jogo.motivo}) Começamos do zero; a cópia antiga foi guardada.`, 12000);
} else {
  avisarOffline(jogo.offline);
}

setInterval(() => {
  const { offline } = jogo.passo();
  avisarOffline(offline);
  tela.atualizar();
}, 100);

setInterval(() => jogo.salvar(), 5000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') jogo.salvar();
});
window.addEventListener('pagehide', () => jogo.salvar());

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
