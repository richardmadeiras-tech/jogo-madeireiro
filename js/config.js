export const VERSAO_SAVE = 1;
export const CHAVE_SAVE = 'jogo-madeireiro-save';
export const CHAVE_BACKUP = 'jogo-madeireiro-save-backup';

export const CRESCIMENTO_CUSTO = 1.15;
export const LIMITE_OFFLINE_S = 8 * 3600;
export const OFFLINE_MINIMO_S = 10;

export const CARGA_POR_S = 3;
export const TORAS_POR_TOQUE_CARGA = 2;
export const PATIO_BASE = 10;
export const PATIO_POR_NIVEL = 5;
export const CAPACIDADE_BASE = 6;
export const CAPACIDADE_POR_NIVEL = 2;
export const VIAGEM_BASE_S = 12;
export const VIAGEM_FATOR = 0.92;
export const VIAGEM_MIN_S = 2;
export const DANO_AJUDANTE_S = 0.5;

export const FERRAMENTAS = ['Machado', 'Serra manual', 'Motosserra'];
export const DANO_FERRAMENTA = [1, 4, 12];

export const ESPECIES = {
  tauari: { nome: 'Tauari', emoji: '🌿', vida: 10, toras: 2, preco: 8, ferramentaMin: 0 },
  cumaru: { nome: 'Cumaru', emoji: '🌳', vida: 40, toras: 3, preco: 30, ferramentaMin: 1 },
  ipe: { nome: 'Ipê', emoji: '🌸', vida: 120, toras: 4, preco: 90, ferramentaMin: 2 },
};
export const ORDEM_ESPECIES = ['tauari', 'cumaru', 'ipe'];

// `custos`: preço de cada nível (índice = nível atual). `base` + `max`: custo cresce com CRESCIMENTO_CUSTO.
export const MELHORIAS = {
  ferramenta: { nome: 'Ferramenta', custos: [100, 1500] },
  ajudantes: { nome: 'Ajudantes', base: 50, max: 20 },
  caminhoes: { nome: 'Caminhões', custos: [400, 2500] },
  capacidade: { nome: 'Capacidade do caminhão', base: 60, max: 15 },
  velocidade: { nome: 'Velocidade do caminhão', base: 90, max: 10 },
  patio: { nome: 'Pátio', base: 40, max: 15 },
};
export const ORDEM_MELHORIAS = ['ferramenta', 'ajudantes', 'caminhoes', 'capacidade', 'velocidade', 'patio'];
