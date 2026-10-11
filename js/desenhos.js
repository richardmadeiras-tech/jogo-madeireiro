const NS = 'http://www.w3.org/2000/svg';
const COPA = { tauari: '#7bc96f', cumaru: '#2e7d32', ipe: '#e0559c' };
const X_PARADO = 100;
const X_SERRARIA = 250;
const FAIXAS_Y = [180, 194, 208];
const MAX_TORAS_VISIVEIS = 12;

function el(nome, atributos, pai) {
  const e = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, String(v));
  if (pai) pai.appendChild(e);
  return e;
}

function desenharCaminhao(pai) {
  const g = el('g', {}, pai);
  el('rect', { x: 0, y: 0, width: 26, height: 10, rx: 1, fill: '#d7c4a3', stroke: '#5d4037', 'stroke-width': 1 }, g);
  const carga = el('rect', { x: 1, y: 1, width: 0, height: 8, fill: '#8d5524' }, g);
  el('rect', { x: 26, y: 3, width: 10, height: 7, rx: 1.5, fill: '#e53935' }, g);
  el('circle', { cx: 6, cy: 11, r: 2.6, fill: '#222' }, g);
  el('circle', { cx: 30, cy: 11, r: 2.6, fill: '#222' }, g);
  return { g, carga };
}

export function montarCena(svg) {
  svg.setAttribute('viewBox', '0 0 360 230');
  el('rect', { width: 360, height: 230, fill: '#bfe6ff' }, svg);
  el('circle', { cx: 310, cy: 30, r: 16, fill: '#ffe082' }, svg);
  el('rect', { y: 140, width: 360, height: 90, fill: '#8bc34a' }, svg);
  el('rect', { y: 176, width: 360, height: 48, fill: '#6d6d6d' }, svg);

  const serraria = el('g', { transform: 'translate(292 98)' }, svg);
  el('rect', { x: 0, y: 24, width: 60, height: 52, fill: '#a1572b' }, serraria);
  el('polygon', { points: '-5,24 30,2 65,24', fill: '#7a3e1d' }, serraria);
  el('rect', { x: 22, y: 46, width: 16, height: 30, fill: '#4e2a12' }, serraria);

  const patio = el('g', { transform: 'translate(120 150)' }, svg);
  const toras = [];
  for (let i = 0; i < MAX_TORAS_VISIVEIS; i++) {
    const coluna = i % 6;
    const linha = Math.floor(i / 6);
    toras.push(el('circle', {
      cx: 6 + coluna * 11, cy: 20 - linha * 10, r: 5,
      fill: '#a5733a', stroke: '#5d4037', 'stroke-width': 1, display: 'none',
    }, patio));
  }

  const posicao = el('g', { transform: 'translate(55 140)' }, svg);
  const arvore = el('g', { class: 'arvore' }, posicao);
  el('rect', { x: -7, y: -50, width: 14, height: 50, fill: '#6d4c41' }, arvore);
  const copa = el('circle', { cx: 0, cy: -62, r: 32, fill: COPA.tauari }, arvore);
  el('rect', { x: -45, y: -100, width: 90, height: 110, fill: 'transparent' }, arvore);
  el('rect', { x: -30, y: -122, width: 60, height: 7, rx: 3.5, fill: 'rgba(0,0,0,0.25)' }, posicao);
  const barra = el('rect', { x: -30, y: -122, width: 60, height: 7, rx: 3.5, fill: '#e53935' }, posicao);

  const caminhoes = FAIXAS_Y.map(() => desenharCaminhao(svg));
  return { arvore, copa, barra, toras, caminhoes };
}

export function atualizarCena(refs, d) {
  const escala = 0.55 + 0.45 * d.vidaFrac;
  refs.barra.setAttribute('width', String(60 * d.vidaFrac));
  refs.copa.setAttribute('r', String(32 * escala));
  refs.copa.setAttribute('cy', String(-30 - 32 * escala));
  refs.copa.setAttribute('fill', COPA[d.especie]);

  const n = Math.min(MAX_TORAS_VISIVEIS, Math.floor(d.torasPatio));
  refs.toras.forEach((c, i) => c.setAttribute('display', i < n ? 'inline' : 'none'));

  refs.caminhoes.forEach((c, i) => {
    const dado = d.caminhoes[i];
    if (!dado) {
      c.g.setAttribute('display', 'none');
      return;
    }
    c.g.setAttribute('display', 'inline');
    const x = X_PARADO + (X_SERRARIA - X_PARADO) * (dado.viajando ? dado.progresso : 0);
    c.g.setAttribute('transform', `translate(${x.toFixed(1)} ${FAIXAS_Y[i]})`);
    c.carga.setAttribute('width', String(24 * Math.min(1, dado.cargaFrac)));
  });
}
