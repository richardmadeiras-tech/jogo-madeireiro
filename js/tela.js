import { ESPECIES, ORDEM_ESPECIES, MELHORIAS, ORDEM_MELHORIAS, FERRAMENTAS } from './config.js';
import * as R from './regras.js';
import { formatarReais } from './formato.js';
import { montarCena, atualizarCena } from './desenhos.js';

const $ = (id) => document.getElementById(id);
const decimal = (n) => n.toFixed(1).replace('.', ',');

function descricao(e, id) {
  const n = e.niveis[id];
  switch (id) {
    case 'ferramenta': return `${FERRAMENTAS[n]} · ${R.danoPorToque(e)} de dano por toque`;
    case 'ajudantes': return `${n} ajudante${n === 1 ? '' : 's'} · ${decimal(R.danoAjudantes(e))} de dano por segundo`;
    case 'caminhoes': return `${R.quantidadeCaminhoes(e)} caminhão(ões)`;
    case 'capacidade': return `Cada caminhão leva ${R.capacidadeCaminhao(e)} toras`;
    case 'velocidade': return `Viagem de ${decimal(R.tempoViagem(e))} s`;
    case 'patio': return `Pátio com ${R.capacidadePatio(e)} toras`;
    default: return '';
  }
}

export function criarTela(jogo) {
  const e = jogo.estado;
  const refs = montarCena($('cena'));
  let temporizadorAviso = null;

  // espécies
  const botoesEspecie = {};
  for (const id of ORDEM_ESPECIES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.especie = id;
    botoesEspecie[id] = b;
    $('especies').append(b);
  }
  $('especies').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-especie]');
    if (b && jogo.escolherEspecie(b.dataset.especie)) atualizar();
  });

  // loja
  const itens = {};
  for (const id of ORDEM_MELHORIAS) {
    const linha = document.createElement('div');
    linha.className = 'item';
    const texto = document.createElement('div');
    texto.className = 'texto';
    const nome = document.createElement('strong');
    nome.textContent = MELHORIAS[id].nome;
    const desc = document.createElement('span');
    texto.append(nome, desc);
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.dataset.id = id;
    linha.append(texto, botao);
    $('loja').append(linha);
    itens[id] = { desc, botao };
  }
  $('loja').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-id]');
    if (b && jogo.comprar(b.dataset.id)) atualizar();
  });

  // toques
  refs.arvore.addEventListener('pointerdown', () => {
    if (R.patioCheio(e)) mostrarAviso('Pátio cheio! Carregue o caminhão ou melhore o pátio.', 2500);
    else jogo.tocarArvore();
    refs.arvore.classList.remove('bate');
    void refs.arvore.getBoundingClientRect();
    refs.arvore.classList.add('bate');
    atualizar();
  });
  $('btn-carga').addEventListener('click', () => {
    jogo.tocarCarga();
    atualizar();
  });

  // exportar / importar
  const dialogo = $('dialogo');
  let aoConfirmar = null;
  function abrirDialogo({ titulo, texto, somenteLeitura, rotuloOk, confirmar }) {
    $('dialogo-titulo').textContent = titulo;
    const area = $('dialogo-texto');
    area.value = texto;
    area.readOnly = somenteLeitura;
    $('dialogo-erro').hidden = true;
    $('dialogo-ok').textContent = rotuloOk;
    aoConfirmar = confirmar;
    dialogo.showModal();
    if (somenteLeitura) area.select();
  }
  $('dialogo-fechar').addEventListener('click', () => dialogo.close());
  $('dialogo-ok').addEventListener('click', () => {
    const erro = aoConfirmar($('dialogo-texto').value);
    if (erro === 'manter') return;
    if (erro) {
      $('dialogo-erro').textContent = erro;
      $('dialogo-erro').hidden = false;
    } else {
      dialogo.close();
    }
  });
  $('btn-exportar').addEventListener('click', () => abrirDialogo({
    titulo: 'Copie este texto e guarde. Para voltar ao jogo, use "Importar save".',
    texto: jogo.exportar(),
    somenteLeitura: true,
    rotuloOk: 'Copiar',
    confirmar: (texto) => {
      const falha = () => {
        $('dialogo-erro').textContent = 'Não consegui copiar. Selecione o texto e copie manualmente.';
        $('dialogo-erro').hidden = false;
      };
      if (!navigator.clipboard?.writeText) {
        falha();
        return 'manter';
      }
      navigator.clipboard.writeText(texto).then(() => {
        mostrarAviso('Copiado!', 2000);
        dialogo.close();
      }, falha);
      return 'manter';
    },
  }));
  $('btn-importar').addEventListener('click', () => abrirDialogo({
    titulo: 'Cole aqui o texto do save. Isso substitui o jogo atual.',
    texto: '',
    somenteLeitura: false,
    rotuloOk: 'Importar',
    confirmar: (texto) => {
      const r = jogo.importar(texto);
      if (!r.ok) return r.motivo;
      mostrarAviso('Save importado!');
      atualizar();
      return null;
    },
  }));

  function mostrarAviso(texto, ms = 6000) {
    const aviso = $('aviso');
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, ms);
  }

  function atualizar() {
    $('dinheiro').textContent = formatarReais(e.dinheiro);
    const info = $('info-patio');
    info.textContent = `Pátio ${Math.floor(e.patio.toras)}/${R.capacidadePatio(e)}`;
    info.classList.toggle('cheio', R.patioCheio(e));

    for (const id of ORDEM_ESPECIES) {
      const esp = ESPECIES[id];
      const b = botoesEspecie[id];
      const livre = R.especieDesbloqueada(e, id);
      b.disabled = !livre;
      b.classList.toggle('ativa', id === e.especie);
      b.textContent = livre
        ? `${esp.emoji} ${esp.nome} · ${formatarReais(esp.preco)}/tora`
        : `🔒 ${esp.nome} (${FERRAMENTAS[esp.ferramentaMin]})`;
    }

    for (const id of ORDEM_MELHORIAS) {
      const custo = R.custoProximo(e, id);
      itens[id].desc.textContent = descricao(e, id);
      itens[id].botao.textContent = custo === null ? 'Máximo' : `Comprar ${formatarReais(custo)}`;
      itens[id].botao.disabled = custo === null || e.dinheiro < custo;
    }

    const esp = ESPECIES[e.especie];
    const tempoViagem = R.tempoViagem(e);
    const cap = R.capacidadeCaminhao(e);
    atualizarCena(refs, {
      vidaFrac: Math.max(0, Math.min(1, e.arvore.vida / esp.vida)),
      especie: e.especie,
      torasPatio: e.patio.toras,
      caminhoes: e.caminhoes.map((c) => ({
        viajando: c.viajando,
        progresso: Math.min(1, c.tempo / tempoViagem),
        cargaFrac: c.carga.toras / cap,
      })),
    });
  }

  atualizar();
  return { atualizar, mostrarAviso };
}
