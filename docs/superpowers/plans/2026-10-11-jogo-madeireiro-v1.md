# Jogo Madeireiro v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a v1 do Jogo Madeireiro: um idle/tycoon de celular (cortar → carregar → entregar → melhorar) que roda no navegador, salva sozinho, ganha dinheiro offline e funciona em modo avião.

**Architecture:** JavaScript puro (módulos ES), HTML e SVG, sem framework e sem servidor. A lógica do jogo (`config`, `estado`, `regras`, `salvar`, `jogo`) não toca em DOM e é coberta por testes do Node; a camada de tela (`desenhos`, `tela`, `main`) só desenha e repassa toques. Um service worker deixa o jogo offline.

**Tech Stack:** JavaScript ES modules, HTML/CSS/SVG, `node --test` (Node 24, sem dependências), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-11-jogo-madeireiro-design.md`

## Global Constraints

- Sem dependências externas e sem build: nenhum `npm install` de pacote; só `node --test` para testes.
- Todo número de balanceamento mora em `js/config.js`; nenhum número solto nas regras.
- Arquivos de código em `js/` (a lista do spec, só que dentro dessa pasta); `index.html`, `estilo.css`, `sw.js`, `manifest.webmanifest` e `icone.svg` na raiz.
- A lógica (`config`, `estado`, `regras`, `salvar`, `jogo`, `formato`) não pode referenciar `document`, `window` nem `localStorage` diretamente (o armazenamento e o relógio entram por parâmetro).
- Textos do jogo em português do Brasil.
- Chave do save: `jogo-madeireiro-save`; backup: `jogo-madeireiro-save-backup`; versão do formato: `1`.
- Ganho offline: limite de 8 horas (`28800` s); tempo negativo é ignorado.
- Custo do próximo nível cresce 15% por compra (`1.15`), arredondado para cima.
- Espécies da v1: Tauari, Cumaru, Ipê. Fora da v1: serraria, cubagem, anúncios, compras reais, ranking, vários mapas, moedas extras.
- Cada commit termina com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Save corrompido (texto vazio, JSON quebrado, `null`, lista, versão futura): o jogo abre do zero, guarda cópia em `jogo-madeireiro-save-backup` e não quebra.
2. Save com valores absurdos (`null`, negativos, texto, níveis acima do máximo, espécie inexistente ou ainda bloqueada, caminhões demais ou de menos): é saneado, nunca gera `NaN` nem trava.
3. Relógio do celular mexido ou aba parada por muito tempo: tempo negativo não rende nada, e o ganho offline nunca passa de 8 horas.
4. Tocar na árvore com o pátio cheio: nada acontece e nada se perde; tocar sem caminhão disponível para carregar também não faz nada.
5. Comprar sem dinheiro suficiente ou em nível máximo: nada muda (nem dinheiro nem nível).

---

### Task 1: Esqueleto do projeto e servidor de desenvolvimento

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `servir.js`
- Create: `.claude/launch.json`
- Create: `test/auxiliar.js`

**Interfaces:**
- Produces: `npm test` (roda `node --test`); `node servir.js` serve a pasta em `http://localhost:8080`; `test/auxiliar.js` exporta `armazenamentoFalso()` com `getItem`, `setItem`, `removeItem` e `_mapa` (um `Map`).

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "jogo-madeireiro",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "start": "node servir.js"
  }
}
```

- [ ] **Step 2: Criar `.gitignore`**

```
node_modules/
.DS_Store
```

- [ ] **Step 3: Criar `servir.js`** (servidor estático mínimo, necessário porque módulos ES não abrem por `file://`)

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('.', import.meta.url));
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};
const porta = Number(process.env.PORT) || 8080;

createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arquivo = normalize(join(raiz, caminho === '/' ? 'index.html' : caminho));
  if (!arquivo.startsWith(raiz)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, {
      'Content-Type': tipos[extname(arquivo)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(dados);
  } catch {
    res.writeHead(404).end('não encontrado');
  }
}).listen(porta, () => console.log(`http://localhost:${porta}`));
```

- [ ] **Step 4: Criar `.claude/launch.json`**

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "jogo", "runtimeExecutable": "node", "runtimeArgs": ["servir.js"], "port": 8080 }
  ]
}
```

- [ ] **Step 5: Criar `test/auxiliar.js`**

```js
export function armazenamentoFalso() {
  const mapa = new Map();
  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => { mapa.set(k, String(v)); },
    removeItem: (k) => { mapa.delete(k); },
    _mapa: mapa,
  };
}
```

- [ ] **Step 6: Verificar**

Run: `npm test`
Expected: termina com código 0 (nenhum teste ainda; `pass 0`).

Run (em segundo plano): `node servir.js` e depois `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/nao-existe`
Expected: `404`. Pare o servidor.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: esqueleto do projeto, servidor local e auxiliar de testes"
```

---

### Task 2: Configuração e estado inicial

**Files:**
- Create: `js/config.js`
- Create: `js/estado.js`
- Test: `test/estado.test.js`

**Interfaces:**
- Produces (`config.js`): constantes `VERSAO_SAVE`, `CHAVE_SAVE`, `CHAVE_BACKUP`, `CRESCIMENTO_CUSTO`, `LIMITE_OFFLINE_S`, `OFFLINE_MINIMO_S`, `CARGA_POR_S`, `TORAS_POR_TOQUE_CARGA`, `PATIO_BASE`, `PATIO_POR_NIVEL`, `CAPACIDADE_BASE`, `CAPACIDADE_POR_NIVEL`, `VIAGEM_BASE_S`, `VIAGEM_FATOR`, `VIAGEM_MIN_S`, `DANO_AJUDANTE_S`, `DANO_FERRAMENTA` (array), `FERRAMENTAS` (nomes), `ESPECIES` (objeto `{ nome, emoji, vida, toras, preco, ferramentaMin }`), `ORDEM_ESPECIES`, `MELHORIAS` (objeto; cada uma tem `nome` e ou `custos: number[]` ou `base` + `max`), `ORDEM_MELHORIAS`.
- Produces (`estado.js`): `novoEstado()`, `novoCaminhao()`, `nivelMaximo(id)`. Formato do estado: `{ versao, dinheiro, niveis:{ferramenta,ajudantes,caminhoes,capacidade,velocidade,patio}, especie, arvore:{vida}, patio:{toras,valor}, caminhoes:[{carga:{toras,valor}, viajando, tempo}], salvoEm }`.

- [ ] **Step 1: Escrever o teste que falha** (`test/estado.test.js`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado, novoCaminhao, nivelMaximo } from '../js/estado.js';
import { ESPECIES, ORDEM_ESPECIES, ORDEM_MELHORIAS, MELHORIAS } from '../js/config.js';

test('estado novo começa zerado, com um caminhão e árvore de tauari inteira', () => {
  const e = novoEstado();
  assert.equal(e.dinheiro, 0);
  assert.equal(e.especie, 'tauari');
  assert.equal(e.arvore.vida, ESPECIES.tauari.vida);
  assert.deepEqual(e.patio, { toras: 0, valor: 0 });
  assert.equal(e.caminhoes.length, 1);
  assert.deepEqual(e.caminhoes[0], { carga: { toras: 0, valor: 0 }, viajando: false, tempo: 0 });
  for (const id of ORDEM_MELHORIAS) assert.equal(e.niveis[id], 0);
});

test('cada chamada devolve objetos independentes', () => {
  const a = novoEstado();
  const b = novoEstado();
  a.niveis.ajudantes = 5;
  a.caminhoes[0].carga.toras = 3;
  assert.equal(b.niveis.ajudantes, 0);
  assert.equal(b.caminhoes[0].carga.toras, 0);
  assert.notEqual(novoCaminhao(), novoCaminhao());
});

test('nivelMaximo usa a tabela de custos quando existe, senão max', () => {
  assert.equal(nivelMaximo('ferramenta'), 2);
  assert.equal(nivelMaximo('caminhoes'), 2);
  assert.equal(nivelMaximo('ajudantes'), 20);
});

test('espécies: preço e ferramenta mínima crescem na ordem de progressão', () => {
  for (let i = 1; i < ORDEM_ESPECIES.length; i++) {
    const antes = ESPECIES[ORDEM_ESPECIES[i - 1]];
    const depois = ESPECIES[ORDEM_ESPECIES[i]];
    assert.ok(depois.preco > antes.preco);
    assert.ok(depois.vida > antes.vida);
    assert.ok(depois.ferramentaMin > antes.ferramentaMin);
  }
  assert.ok(MELHORIAS.ferramenta.custos.length >= ESPECIES.ipe.ferramentaMin);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/estado.test.js`
Expected: FAIL (`Cannot find module '../js/estado.js'`).

- [ ] **Step 3: Criar `js/config.js`**

```js
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
```

- [ ] **Step 4: Criar `js/estado.js`**

```js
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
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test test/estado.test.js`
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add js/config.js js/estado.js test/estado.test.js
git commit -m "feat: configuração de balanceamento e estado inicial"
```

---

### Task 3: Regras — efeitos, custos e formatação

**Files:**
- Create: `js/regras.js`
- Create: `js/formato.js`
- Test: `test/regras-efeitos.test.js`
- Test: `test/formato.test.js`

**Interfaces:**
- Consumes: `config.js` (constantes), `estado.js` (`nivelMaximo`, `novoCaminhao`).
- Produces (`regras.js`): `danoPorToque(e)`, `danoAjudantes(e)` (dano por segundo), `capacidadeCaminhao(e)`, `capacidadePatio(e)`, `tempoViagem(e)` (segundos), `quantidadeCaminhoes(e)`, `especieDesbloqueada(e, id)`, `custoProximo(e, id)` (número, ou `null` no nível máximo), `sincronizarCaminhoes(e)`.
- Produces (`formato.js`): `formatarReais(valor)` → texto como `R$ 1.234` ou `R$ 1,5 mi`.

- [ ] **Step 1: Escrever os testes que falham**

`test/regras-efeitos.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado } from '../js/estado.js';
import * as R from '../js/regras.js';

test('valores iniciais', () => {
  const e = novoEstado();
  assert.equal(R.danoPorToque(e), 1);
  assert.equal(R.danoAjudantes(e), 0);
  assert.equal(R.capacidadeCaminhao(e), 6);
  assert.equal(R.capacidadePatio(e), 10);
  assert.equal(R.quantidadeCaminhoes(e), 1);
  assert.equal(R.tempoViagem(e), 12);
});

test('os níveis aumentam os efeitos', () => {
  const e = novoEstado();
  e.niveis.ferramenta = 2;
  e.niveis.ajudantes = 4;
  e.niveis.capacidade = 3;
  e.niveis.patio = 2;
  e.niveis.caminhoes = 2;
  assert.equal(R.danoPorToque(e), 12);
  assert.equal(R.danoAjudantes(e), 2);
  assert.equal(R.capacidadeCaminhao(e), 12);
  assert.equal(R.capacidadePatio(e), 20);
  assert.equal(R.quantidadeCaminhoes(e), 3);
});

test('a viagem encurta com a velocidade, mas nunca abaixo do mínimo', () => {
  const e = novoEstado();
  e.niveis.velocidade = 1;
  assert.ok(R.tempoViagem(e) < 12);
  e.niveis.velocidade = 1000;
  assert.equal(R.tempoViagem(e), 2);
});

test('custoProximo: tabela explícita, crescimento de 15% e nível máximo', () => {
  const e = novoEstado();
  assert.equal(R.custoProximo(e, 'ferramenta'), 100);
  e.niveis.ferramenta = 1;
  assert.equal(R.custoProximo(e, 'ferramenta'), 1500);
  e.niveis.ferramenta = 2;
  assert.equal(R.custoProximo(e, 'ferramenta'), null);

  assert.equal(R.custoProximo(e, 'ajudantes'), 50);
  e.niveis.ajudantes = 1;
  assert.equal(R.custoProximo(e, 'ajudantes'), 58);
  e.niveis.ajudantes = 2;
  assert.equal(R.custoProximo(e, 'ajudantes'), 67);
  e.niveis.ajudantes = 20;
  assert.equal(R.custoProximo(e, 'ajudantes'), null);
});

test('a ferramenta libera as espécies melhores', () => {
  const e = novoEstado();
  assert.equal(R.especieDesbloqueada(e, 'tauari'), true);
  assert.equal(R.especieDesbloqueada(e, 'cumaru'), false);
  e.niveis.ferramenta = 1;
  assert.equal(R.especieDesbloqueada(e, 'cumaru'), true);
  assert.equal(R.especieDesbloqueada(e, 'ipe'), false);
  e.niveis.ferramenta = 2;
  assert.equal(R.especieDesbloqueada(e, 'ipe'), true);
});

test('sincronizarCaminhoes cria os caminhões que faltam e não mexe nos existentes', () => {
  const e = novoEstado();
  e.caminhoes[0].carga.toras = 4;
  e.niveis.caminhoes = 2;
  R.sincronizarCaminhoes(e);
  assert.equal(e.caminhoes.length, 3);
  assert.equal(e.caminhoes[0].carga.toras, 4);
  assert.equal(e.caminhoes[2].carga.toras, 0);
});
```

`test/formato.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarReais } from '../js/formato.js';

test('formata reais com ponto de milhar e sem centavos', () => {
  assert.equal(formatarReais(0), 'R$ 0');
  assert.equal(formatarReais(1234.9), 'R$ 1.234');
  assert.equal(formatarReais(999999), 'R$ 999.999');
});

test('abrevia milhões', () => {
  assert.equal(formatarReais(1500000), 'R$ 1,5 mi');
});

test('valores inválidos viram zero', () => {
  assert.equal(formatarReais(NaN), 'R$ 0');
  assert.equal(formatarReais(-5), 'R$ 0');
  assert.equal(formatarReais(undefined), 'R$ 0');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/regras-efeitos.test.js test/formato.test.js`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Criar `js/regras.js`**

```js
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
```

- [ ] **Step 4: Criar `js/formato.js`**

```js
export function formatarReais(valor) {
  const n = Math.floor(Number.isFinite(valor) ? Math.max(0, valor) : 0);
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toFixed(1).replace('.', ',') + ' mi';
  return 'R$ ' + n.toLocaleString('pt-BR');
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test test/regras-efeitos.test.js test/formato.test.js`
Expected: PASS (9 testes).

- [ ] **Step 6: Commit**

```bash
git add js/regras.js js/formato.js test/regras-efeitos.test.js test/formato.test.js
git commit -m "feat: efeitos das melhorias, custos e formatação de reais"
```

---

### Task 4: Regras — simulação (cortar, carregar, entregar, comprar)

**Files:**
- Modify: `js/regras.js` (acrescentar ao final)
- Test: `test/regras-simulacao.test.js`

**Interfaces:**
- Consumes: tudo da Task 3.
- Produces (`regras.js`): `patioCheio(e)`, `cortar(e, dano)` → `true` se a árvore caiu, `trocarEspecie(e, id)` → boolean, `carregarCaminhao(e, caminhao, qtd)`, `tocarCarga(e)` → boolean, `avancar(e, dt)` → dinheiro ganho nesse passo, `comprar(e, id)` → boolean.

- [ ] **Step 1: Escrever o teste que falha** (`test/regras-simulacao.test.js`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado } from '../js/estado.js';
import * as R from '../js/regras.js';

const perto = (a, b) => Math.abs(a - b) < 1e-9;

test('cortar: a árvore só cai quando a vida zera, e vira toras no pátio', () => {
  const e = novoEstado();
  assert.equal(R.cortar(e, 4), false);
  assert.equal(R.cortar(e, 4), false);
  assert.equal(e.patio.toras, 0);
  assert.equal(R.cortar(e, 4), true);
  assert.equal(e.patio.toras, 2);
  assert.equal(e.patio.valor, 16);
  assert.equal(e.arvore.vida, 10);
});

test('cortar com o pátio cheio não faz nada e não perde a árvore', () => {
  const e = novoEstado();
  e.patio.toras = 10;
  e.arvore.vida = 5;
  assert.equal(R.cortar(e, 3), false);
  assert.equal(e.arvore.vida, 5);
  assert.equal(e.patio.toras, 10);
});

test('cortar ignora dano zero, negativo ou inválido', () => {
  const e = novoEstado();
  for (const dano of [0, -2, NaN, undefined, Infinity * 0]) {
    assert.equal(R.cortar(e, dano), false);
    assert.equal(e.arvore.vida, 10);
  }
});

test('trocarEspecie: bloqueada não troca; liberada troca e renova a árvore', () => {
  const e = novoEstado();
  assert.equal(R.trocarEspecie(e, 'cumaru'), false);
  assert.equal(R.trocarEspecie(e, 'jatoba'), false);
  e.niveis.ferramenta = 1;
  e.arvore.vida = 3;
  assert.equal(R.trocarEspecie(e, 'cumaru'), true);
  assert.equal(e.especie, 'cumaru');
  assert.equal(e.arvore.vida, 40);
  assert.equal(R.trocarEspecie(e, 'cumaru'), false);
});

test('tocarCarga leva duas toras do pátio ao caminhão, com o valor proporcional', () => {
  const e = novoEstado();
  e.patio = { toras: 4, valor: 100 };
  assert.equal(R.tocarCarga(e), true);
  assert.equal(e.caminhoes[0].carga.toras, 2);
  assert.equal(e.caminhoes[0].carga.valor, 50);
  assert.deepEqual(e.patio, { toras: 2, valor: 50 });
});

test('tocarCarga com pátio vazio ou sem caminhão parado não muda nada', () => {
  const e = novoEstado();
  assert.equal(R.tocarCarga(e), true);
  assert.deepEqual(e.caminhoes[0].carga, { toras: 0, valor: 0 });
  e.caminhoes[0].viajando = true;
  e.patio = { toras: 4, valor: 100 };
  assert.equal(R.tocarCarga(e), false);
  assert.deepEqual(e.patio, { toras: 4, valor: 100 });
});

test('avancar: o caminhão enche, viaja e paga na chegada', () => {
  const e = novoEstado();
  e.patio = { toras: 6, valor: 48 };
  assert.equal(R.avancar(e, 2), 0);
  assert.equal(e.caminhoes[0].viajando, true);
  assert.equal(e.patio.toras, 0);
  assert.equal(R.avancar(e, 11), 0);
  assert.equal(e.dinheiro, 0);
  assert.equal(R.avancar(e, 1), 48);
  assert.equal(e.dinheiro, 48);
  assert.equal(e.caminhoes[0].viajando, false);
  assert.deepEqual(e.caminhoes[0].carga, { toras: 0, valor: 0 });
});

test('avancar: ajudantes cortam sozinhos e as toras seguem para o caminhão', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  R.avancar(e, 10);
  const total = e.patio.toras + e.caminhoes[0].carga.toras;
  assert.ok(perto(total, 2));
});

test('avancar ignora tempo inválido', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  for (const dt of [0, -1, NaN, undefined]) assert.equal(R.avancar(e, dt), 0);
  assert.equal(e.arvore.vida, 10);
  assert.equal(e.patio.toras, 0);
});

test('comprar: sem dinheiro ou no nível máximo nada muda', () => {
  const e = novoEstado();
  e.dinheiro = 49;
  assert.equal(R.comprar(e, 'ajudantes'), false);
  assert.equal(e.dinheiro, 49);
  assert.equal(e.niveis.ajudantes, 0);
  assert.equal(R.comprar(e, 'inexistente'), false);

  e.dinheiro = 1e9;
  e.niveis.ferramenta = 2;
  assert.equal(R.comprar(e, 'ferramenta'), false);
  assert.equal(e.dinheiro, 1e9);
  assert.equal(e.niveis.ferramenta, 2);
});

test('comprar desconta o custo e sobe o nível; comprar caminhão cria o caminhão', () => {
  const e = novoEstado();
  e.dinheiro = 500;
  assert.equal(R.comprar(e, 'ajudantes'), true);
  assert.equal(e.dinheiro, 450);
  assert.equal(e.niveis.ajudantes, 1);
  assert.equal(R.comprar(e, 'caminhoes'), true);
  assert.equal(e.dinheiro, 50);
  assert.equal(e.caminhoes.length, 2);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/regras-simulacao.test.js`
Expected: FAIL (`R.cortar is not a function`).

- [ ] **Step 3: Acrescentar ao final de `js/regras.js`**

```js
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test`
Expected: PASS (todos os testes até aqui).

- [ ] **Step 5: Commit**

```bash
git add js/regras.js test/regras-simulacao.test.js
git commit -m "feat: simulação de corte, carga, viagem, entrega e compras"
```

---

### Task 5: Regras — ganho offline

**Files:**
- Modify: `js/regras.js` (acrescentar ao final)
- Test: `test/regras-offline.test.js`

**Interfaces:**
- Consumes: Task 3 e 4.
- Produces: `ganhoOffline(e, segundos)` → `{ segundos, dinheiro }` (sem alterar `e`); `aplicarOffline(e, segundos)` → mesmo retorno, e soma `dinheiro` a `e.dinheiro`.

- [ ] **Step 1: Escrever o teste que falha** (`test/regras-offline.test.js`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado } from '../js/estado.js';
import { ganhoOffline, aplicarOffline } from '../js/regras.js';

test('sem ajudantes não rende nada offline', () => {
  const e = novoEstado();
  assert.deepEqual(ganhoOffline(e, 3600), { segundos: 3600, dinheiro: 0 });
});

test('o corte é o limite: 2 ajudantes em tauari rendem R$ 1,60 por segundo', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  assert.equal(ganhoOffline(e, 100).dinheiro, 160);
});

test('o caminhão é o limite quando o corte é rápido demais', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 20;
  assert.equal(ganhoOffline(e, 100).dinheiro, 342);
  e.niveis.caminhoes = 2;
  assert.ok(ganhoOffline(e, 100).dinheiro > 342);
});

test('o ganho offline é limitado a 8 horas', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  const limite = ganhoOffline(e, 8 * 3600);
  assert.equal(limite.segundos, 28800);
  assert.deepEqual(ganhoOffline(e, 8 * 3600 * 50), limite);
});

test('tempo negativo, inválido ou muito curto não rende nada', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 5;
  for (const s of [-1000, 0, 5, NaN, undefined, Infinity]) {
    assert.deepEqual(ganhoOffline(e, s), { segundos: 0, dinheiro: 0 });
  }
});

test('aplicarOffline soma ao dinheiro e devolve o resumo', () => {
  const e = novoEstado();
  e.niveis.ajudantes = 2;
  e.dinheiro = 10;
  const r = aplicarOffline(e, 100);
  assert.equal(r.dinheiro, 160);
  assert.equal(e.dinheiro, 170);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/regras-offline.test.js`
Expected: FAIL (`ganhoOffline is not a function`).

- [ ] **Step 3: Acrescentar ao final de `js/regras.js`**

```js
export function ganhoOffline(e, segundos) {
  if (!Number.isFinite(segundos) || segundos < C.OFFLINE_MINIMO_S) {
    return { segundos: 0, dinheiro: 0 };
  }
  const s = Math.min(segundos, C.LIMITE_OFFLINE_S);
  const esp = C.ESPECIES[e.especie];
  const torasPorSegundoCorte = (danoAjudantes(e) / esp.vida) * esp.toras;
  const cap = capacidadeCaminhao(e);
  const ciclo = tempoViagem(e) + cap / C.CARGA_POR_S;
  const torasPorSegundoCaminhao = (quantidadeCaminhoes(e) * cap) / ciclo;
  const taxa = Math.min(torasPorSegundoCorte, torasPorSegundoCaminhao);
  return { segundos: s, dinheiro: Math.floor(taxa * esp.preco * s + 1e-9) };
}

export function aplicarOffline(e, segundos) {
  const r = ganhoOffline(e, segundos);
  e.dinheiro += r.dinheiro;
  return r;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/regras.js test/regras-offline.test.js
git commit -m "feat: ganho offline limitado a 8 horas"
```

---

### Task 6: Salvamento, migração e proteção contra save quebrado

**Files:**
- Create: `js/salvar.js`
- Test: `test/salvar.test.js`

**Interfaces:**
- Consumes: `config.js`, `estado.js` (`novoEstado`, `nivelMaximo`), `regras.js` (`especieDesbloqueada`, `quantidadeCaminhoes`, `capacidadeCaminhao`, `sincronizarCaminhoes`), `test/auxiliar.js`.
- Produces (`salvar.js`):
  - `serializar(estado, agoraMs)` → texto JSON.
  - `desserializar(texto)` → `{ ok: true, estado }` ou `{ ok: false, motivo }`.
  - `migrar(obj, migracoes?, alvo?)` → objeto migrado ou `null`.
  - `sanear(obj)` → estado válido.
  - `salvarLocal(storage, estado, agoraMs)` → boolean.
  - `carregarLocal(storage)` → `{ origem: 'novo'|'save'|'corrompido', estado, motivo? }`.
  - `armazenamentoSeguro(obterStorage)` → objeto com `getItem/setItem/removeItem` (cai para memória se `localStorage` falhar).

- [ ] **Step 1: Escrever o teste que falha** (`test/salvar.test.js`)

```js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/salvar.test.js`
Expected: FAIL (`Cannot find module '../js/salvar.js'`).

- [ ] **Step 3: Criar `js/salvar.js`**

```js
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add js/salvar.js test/salvar.test.js
git commit -m "feat: salvamento com migração, saneamento e backup de save corrompido"
```

---

### Task 7: Núcleo do jogo (`jogo.js`)

**Files:**
- Create: `js/jogo.js`
- Test: `test/jogo.test.js`

**Interfaces:**
- Consumes: `salvar.js` (`carregarLocal`, `salvarLocal`, `serializar`, `desserializar`), `regras.js` (`*` como `R`), `estado.js` (`novoEstado`), `config.js` (`OFFLINE_MINIMO_S`, `CHAVE_BACKUP`), `test/auxiliar.js`.
- Produces: `criarJogo({ storage, agora })` → objeto com:
  - `estado` (referência estável; é alterado no lugar), `origem` (`'novo'|'save'|'corrompido'`), `motivo`, `offline` (`{segundos, dinheiro}` do carregamento).
  - `tocarArvore()` → boolean (a árvore caiu), `tocarCarga()` → boolean, `comprar(id)` → boolean (salva se comprou), `escolherEspecie(id)` → boolean.
  - `passo()` → `{ ganho, offline }` (`offline` é `null` ou `{segundos, dinheiro}`); usa o relógio `agora()` para calcular o tempo decorrido.
  - `salvar()` → boolean, `exportar()` → texto, `importar(texto)` → `{ok, motivo?}`, `recomecar()`.

- [ ] **Step 1: Escrever o teste que falha** (`test/jogo.test.js`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarJogo } from '../js/jogo.js';
import { novoEstado } from '../js/estado.js';
import { serializar } from '../js/salvar.js';
import { CHAVE_SAVE, CHAVE_BACKUP } from '../js/config.js';
import { armazenamentoFalso } from './auxiliar.js';

function relogio(inicio = 0) {
  let t = inicio;
  return { agora: () => t, avancar: (ms) => { t += ms; } };
}

test('jogo novo: sem offline e sem aviso', () => {
  const j = criarJogo({ storage: armazenamentoFalso(), agora: relogio(1000).agora });
  assert.equal(j.origem, 'novo');
  assert.deepEqual(j.offline, { segundos: 0, dinheiro: 0 });
});

test('tocarArvore corta; derrubar rende toras no pátio', () => {
  const j = criarJogo({ storage: armazenamentoFalso(), agora: relogio().agora });
  for (let i = 0; i < 9; i++) assert.equal(j.tocarArvore(), false);
  assert.equal(j.tocarArvore(), true);
  assert.equal(j.estado.patio.toras, 2);
});

test('comprar salva o jogo; sem dinheiro não muda nada', () => {
  const s = armazenamentoFalso();
  const j = criarJogo({ storage: s, agora: relogio().agora });
  assert.equal(j.comprar('ajudantes'), false);
  assert.equal(s.getItem(CHAVE_SAVE), null);
  j.estado.dinheiro = 100;
  assert.equal(j.comprar('ajudantes'), true);
  assert.ok(s.getItem(CHAVE_SAVE).includes('"ajudantes":1'));
});

test('passo avança o tempo pelo relógio', () => {
  const r = relogio(0);
  const j = criarJogo({ storage: armazenamentoFalso(), agora: r.agora });
  j.estado.niveis.ajudantes = 2;
  r.avancar(2000);
  const { ganho, offline } = j.passo();
  assert.equal(ganho, 0);
  assert.equal(offline, null);
  assert.equal(j.estado.arvore.vida, 8);
});

test('passo com muito tempo parado vira ganho offline', () => {
  const r = relogio(0);
  const j = criarJogo({ storage: armazenamentoFalso(), agora: r.agora });
  j.estado.niveis.ajudantes = 2;
  r.avancar(100_000);
  const { offline } = j.passo();
  assert.equal(offline.dinheiro, 160);
  assert.equal(j.estado.dinheiro, 160);
});

test('relógio andando para trás não rende nada e não trava o passo seguinte', () => {
  const r = relogio(10_000);
  const j = criarJogo({ storage: armazenamentoFalso(), agora: r.agora });
  j.estado.niveis.ajudantes = 2;
  r.avancar(-5000);
  assert.deepEqual(j.passo(), { ganho: 0, offline: null });
  assert.equal(j.estado.dinheiro, 0);
  assert.equal(j.estado.arvore.vida, 10);
  r.avancar(1000);
  j.passo();
  assert.equal(j.estado.arvore.vida, 9);
});

test('ao abrir um save antigo, o ganho offline é aplicado', () => {
  const s = armazenamentoFalso();
  const antigo = novoEstado();
  antigo.niveis.ajudantes = 2;
  s.setItem(CHAVE_SAVE, serializar(antigo, 1000));
  const j = criarJogo({ storage: s, agora: relogio(1000 + 100_000).agora });
  assert.equal(j.origem, 'save');
  assert.equal(j.offline.dinheiro, 160);
  assert.equal(j.estado.dinheiro, 160);
});

test('save com a data no futuro não rende nada', () => {
  const s = armazenamentoFalso();
  const antigo = novoEstado();
  antigo.niveis.ajudantes = 2;
  s.setItem(CHAVE_SAVE, serializar(antigo, 9_999_999));
  const j = criarJogo({ storage: s, agora: relogio(1000).agora });
  assert.equal(j.offline.dinheiro, 0);
});

test('save corrompido: começa do zero e avisa', () => {
  const s = armazenamentoFalso();
  s.setItem(CHAVE_SAVE, '{lixo');
  const j = criarJogo({ storage: s, agora: relogio().agora });
  assert.equal(j.origem, 'corrompido');
  assert.equal(typeof j.motivo, 'string');
  assert.equal(s.getItem(CHAVE_BACKUP), '{lixo');
});

test('importar inválido não mexe no estado; válido troca no lugar', () => {
  const j = criarJogo({ storage: armazenamentoFalso(), agora: relogio().agora });
  const referencia = j.estado;
  j.estado.dinheiro = 5;
  assert.equal(j.importar('').ok, false);
  assert.equal(j.importar('{lixo').ok, false);
  assert.equal(j.estado.dinheiro, 5);

  const outro = novoEstado();
  outro.dinheiro = 999;
  assert.equal(j.importar(serializar(outro, 1)).ok, true);
  assert.equal(j.estado, referencia);
  assert.equal(j.estado.dinheiro, 999);
});

test('exportar gera um texto que o importar entende', () => {
  const a = criarJogo({ storage: armazenamentoFalso(), agora: relogio().agora });
  a.estado.dinheiro = 321;
  const b = criarJogo({ storage: armazenamentoFalso(), agora: relogio().agora });
  assert.equal(b.importar(a.exportar()).ok, true);
  assert.equal(b.estado.dinheiro, 321);
});

test('recomecar zera o jogo e guarda o save anterior como backup', () => {
  const s = armazenamentoFalso();
  const j = criarJogo({ storage: s, agora: relogio().agora });
  j.estado.dinheiro = 50;
  j.salvar();
  j.recomecar();
  assert.equal(j.estado.dinheiro, 0);
  assert.ok(s.getItem(CHAVE_BACKUP).includes('"dinheiro":50'));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/jogo.test.js`
Expected: FAIL (`Cannot find module '../js/jogo.js'`).

- [ ] **Step 3: Criar `js/jogo.js`**

```js
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add js/jogo.js test/jogo.test.js
git commit -m "feat: núcleo do jogo com relógio, offline, exportar e importar"
```

---

### Task 8: Tela — página, cena SVG e menus

**Files:**
- Create: `index.html`
- Create: `estilo.css`
- Create: `js/desenhos.js`
- Create: `js/tela.js`

**Interfaces:**
- Consumes: `jogo` (Task 7), `config.js`, `regras.js` (`R`), `formato.js`.
- Produces: `desenhos.js` → `montarCena(svgEl)` (devolve `refs`) e `atualizarCena(refs, dados)` com `dados = { vidaFrac, especie, torasPatio, caminhoes: [{ viajando, progresso, cargaFrac }] }`; `tela.js` → `criarTela(jogo)` devolve `{ atualizar(), mostrarAviso(texto, ms?) }`.

Esta camada mexe em DOM e é conferida no navegador (Task 9), não por teste automático.

- [ ] **Step 1: Criar `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
  <meta name="theme-color" content="#2e7d32">
  <title>Jogo Madeireiro</title>
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="icone.svg" type="image/svg+xml">
  <link rel="stylesheet" href="estilo.css">
</head>
<body>
  <main id="jogo">
    <header class="hud">
      <div id="dinheiro" class="dinheiro">R$ 0</div>
      <div id="info-patio" class="info">Pátio 0/10</div>
    </header>
    <div id="aviso" class="aviso" hidden></div>
    <div id="especies" class="especies"></div>
    <svg id="cena" class="cena" role="img" aria-label="Floresta, estrada e serraria"></svg>
    <button id="btn-carga" class="botao-carga" type="button">Ajudar a carregar o caminhão</button>
    <section id="loja" class="loja" aria-label="Melhorias"></section>
    <footer class="rodape">
      <button id="btn-exportar" type="button">Exportar save</button>
      <button id="btn-importar" type="button">Importar save</button>
    </footer>
  </main>

  <dialog id="dialogo">
    <p id="dialogo-titulo"></p>
    <textarea id="dialogo-texto" rows="6" spellcheck="false"></textarea>
    <p id="dialogo-erro" class="erro" hidden></p>
    <div class="dialogo-botoes">
      <button id="dialogo-ok" type="button"></button>
      <button id="dialogo-fechar" type="button">Fechar</button>
    </div>
  </dialog>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `estilo.css`**

```css
:root {
  --verde: #2e7d32;
  --verde-claro: #e8f5e9;
  --amarelo: #ffc107;
  --texto: #1b2a1b;
  --fundo: #f4f1e8;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--fundo); color: var(--texto); font-family: system-ui, sans-serif; }
body { padding: env(safe-area-inset-top) 16px calc(24px + env(safe-area-inset-bottom)); -webkit-user-select: none; user-select: none; }
#jogo { max-width: 460px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; }
button { font: inherit; touch-action: manipulation; }

.hud { display: flex; justify-content: space-between; align-items: baseline; padding-top: 10px; }
.dinheiro { font-size: 1.9rem; font-weight: 800; color: var(--verde); }
.info { font-size: 0.95rem; }
.info.cheio { color: #b71c1c; font-weight: 700; }

.aviso { background: var(--amarelo); border-radius: 10px; padding: 10px 12px; font-weight: 600; }

.especies { display: flex; gap: 6px; }
.especies button { flex: 1; padding: 8px 4px; border: 2px solid #bcd7bd; border-radius: 10px; background: #fff; font-size: 0.8rem; line-height: 1.25; }
.especies button.ativa { border-color: var(--verde); background: var(--verde-claro); font-weight: 700; }
.especies button:disabled { opacity: 0.55; }

.cena { width: 100%; height: auto; border-radius: 12px; display: block; touch-action: manipulation; }
.arvore { transform-box: fill-box; transform-origin: 50% 100%; cursor: pointer; }
.arvore.bate { animation: bate 0.14s ease-out; }
@keyframes bate { 0% { transform: rotate(0); } 40% { transform: rotate(-4deg); } 100% { transform: rotate(0); } }

.botao-carga { padding: 14px; border: 0; border-radius: 12px; background: var(--verde); color: #fff; font-size: 1.05rem; font-weight: 700; }
.botao-carga:active { filter: brightness(0.9); }

.loja { display: flex; flex-direction: column; gap: 8px; }
.item { display: flex; justify-content: space-between; align-items: center; gap: 10px; background: #fff; border-radius: 12px; padding: 10px 12px; }
.item .texto { display: flex; flex-direction: column; font-size: 0.85rem; }
.item .texto strong { font-size: 0.95rem; }
.item button { flex: none; min-width: 112px; padding: 10px 8px; border: 0; border-radius: 10px; background: var(--amarelo); font-weight: 700; }
.item button:disabled { background: #ddd; color: #777; }

.rodape { display: flex; gap: 8px; }
.rodape button { flex: 1; padding: 10px; border: 1px solid #bbb; border-radius: 10px; background: transparent; }

dialog { border: 0; border-radius: 14px; padding: 16px; width: min(92vw, 420px); }
dialog textarea { width: 100%; font-family: monospace; font-size: 0.75rem; user-select: text; -webkit-user-select: text; }
.dialogo-botoes { display: flex; gap: 8px; margin-top: 10px; }
.dialogo-botoes button { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid #bbb; background: #fff; }
.erro { color: #b71c1c; font-weight: 600; }
```

- [ ] **Step 3: Criar `js/desenhos.js`**

```js
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

  const caminhoes = FAIXAS_Y.map(() => desenharCaminhao(svg));
  return { arvore, copa, toras, caminhoes };
}

export function atualizarCena(refs, d) {
  const escala = 0.55 + 0.45 * d.vidaFrac;
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
```

- [ ] **Step 4: Criar `js/tela.js`**

```js
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
      navigator.clipboard?.writeText(texto).catch(() => {});
      return null;
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
```

- [ ] **Step 5: Commit**

```bash
git add index.html estilo.css js/desenhos.js js/tela.js
git commit -m "feat: página, cena SVG e menus do jogo"
```

---

### Task 9: Entrada do jogo, modo offline e conferência no navegador

**Files:**
- Create: `js/main.js`
- Create: `sw.js`
- Create: `manifest.webmanifest`
- Create: `icone.svg`

**Interfaces:**
- Consumes: `jogo.js` (`criarJogo`), `tela.js` (`criarTela`), `salvar.js` (`armazenamentoSeguro`), `formato.js`.
- Produces: a página `index.html` funcional; service worker com cache `jogo-madeireiro-v1` (mude o número a cada publicação nova).

- [ ] **Step 1: Criar `js/main.js`**

```js
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
```

- [ ] **Step 2: Criar `sw.js`**

```js
const VERSAO = 'jogo-madeireiro-v1';
const ARQUIVOS = [
  './',
  'index.html',
  'estilo.css',
  'manifest.webmanifest',
  'icone.svg',
  'js/main.js',
  'js/jogo.js',
  'js/tela.js',
  'js/desenhos.js',
  'js/regras.js',
  'js/estado.js',
  'js/config.js',
  'js/salvar.js',
  'js/formato.js',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(caches.match(ev.request).then((achado) => achado || fetch(ev.request)));
});
```

- [ ] **Step 3: Criar `manifest.webmanifest`**

```json
{
  "name": "Jogo Madeireiro",
  "short_name": "Madeireiro",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#f4f1e8",
  "theme_color": "#2e7d32",
  "icons": [{ "src": "icone.svg", "sizes": "any", "type": "image/svg+xml" }]
}
```

- [ ] **Step 4: Criar `icone.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#2e7d32"/>
  <rect x="44" y="52" width="12" height="30" fill="#6d4c41"/>
  <circle cx="50" cy="40" r="24" fill="#7bc96f"/>
  <circle cx="50" cy="86" r="0" fill="none"/>
</svg>
```

- [ ] **Step 5: Rodar todos os testes**

Run: `npm test`
Expected: PASS (todos, sem falhas).

- [ ] **Step 6: Conferir no navegador em tamanho de celular**

Suba o servidor (`preview_start` com a configuração `jogo`, ou `node servir.js`), abra `http://localhost:8080` e redimensione para 375×812. Verifique, e corrija o que falhar antes de seguir:

1. Sem erros no console (`read_console_messages` com `onlyErrors`).
2. A página mostra dinheiro `R$ 0`, "Pátio 0/10", três botões de espécie (Cumaru e Ipê com 🔒), a cena com a árvore, o botão "Ajudar a carregar o caminhão" e as 6 melhorias, todas com o botão de compra desabilitado.
3. Execute no console da página (`javascript_tool`):
   ```js
   const arv = document.querySelector('.arvore');
   for (let i = 0; i < 10; i++) arv.dispatchEvent(new PointerEvent('pointerdown'));
   document.getElementById('info-patio').textContent
   ```
   Esperado: `Pátio 2/10`.
4. Clique em "Ajudar a carregar o caminhão" e confirme que o pátio cai para `0/10` e a caçamba do caminhão mostra carga.
5. Compras: cole um save com dinheiro e recarregue:
   ```js
   localStorage.setItem('jogo-madeireiro-save', JSON.stringify({versao:1,dinheiro:200,salvoEm:Date.now(),niveis:{ajudantes:2}}));
   location.reload();
   ```
   Esperado: o dinheiro começa em `R$ 200` e o botão de Ajudantes mostra `Comprar R$ 67` (nível 2). Compre a Ferramenta (`Comprar R$ 100`): o dinheiro vai a `R$ 100`, a descrição vira "Serra manual · 4 de dano por toque" e o botão de Cumaru deixa de estar bloqueado. Clique em Cumaru e confirme que ele fica destacado.
6. Save corrompido: `localStorage.setItem('jogo-madeireiro-save','{lixo'); location.reload();` → aparece o aviso amarelo "Não consegui ler o save..." e `localStorage.getItem('jogo-madeireiro-save-backup')` vale `{lixo`.
7. Ganho offline: salve com `salvoEm` 100 s no passado e 2 ajudantes, recarregue →
   ```js
   localStorage.setItem('jogo-madeireiro-save', JSON.stringify({versao:1,dinheiro:0,salvoEm:Date.now()-100000,niveis:{ajudantes:2}}));
   location.reload();
   ```
   Esperado: aviso "Enquanto você estava fora, ganhou R$ 160!".
8. Offline de verdade: recarregue uma vez, rode `await navigator.serviceWorker.ready; (await caches.keys())` (esperado: `["jogo-madeireiro-v1"]`), pare o servidor (`preview_stop`), recarregue a página e confirme que o jogo ainda abre.

- [ ] **Step 7: Commit**

```bash
git add js/main.js sw.js manifest.webmanifest icone.svg
git commit -m "feat: entrada do jogo, service worker offline e manifesto"
```

---

### Task 10: Documentação e publicação no GitHub Pages

**Files:**
- Create: `README.md`
- Create: `PENDENCIAS.md`

**Interfaces:**
- Consumes: o jogo completo.
- Produces: repositório no GitHub com Pages ativo e o link para abrir no celular.

- [ ] **Step 1: Criar `README.md`**

```markdown
# Jogo Madeireiro

Jogo de celular de madeireiro: corte as árvores, carregue o caminhão, entregue na serraria e melhore o seu negócio. Funciona no navegador, salva sozinho e continua rendendo com o jogo fechado (até 8 horas). Também funciona em modo avião.

## Rodar no computador

    node servir.js      # abre em http://localhost:8080
    npm test            # testes da lógica

## Estrutura

- `js/config.js`: todos os números de balanceamento.
- `js/regras.js`: contas do jogo (puras, testadas).
- `js/salvar.js`: salvar, carregar, migrar versões e proteger de save quebrado.
- `js/jogo.js`: relógio, ganho offline, exportar e importar.
- `js/tela.js`, `js/desenhos.js`: tela em SVG.

## Publicar uma versão nova

Mude o número de `VERSAO` em `sw.js` (por exemplo `jogo-madeireiro-v2`), faça o commit e envie para o GitHub. No celular, abra o jogo uma ou duas vezes para pegar a versão nova.

Spec e plano: `docs/superpowers/`.
```

- [ ] **Step 2: Criar `PENDENCIAS.md`**

```markdown
# Pendências

- [ ] Testar a v1 no celular real (incluindo modo avião) e anotar o que ficou estranho.
- [ ] Ajustar o balanceamento em `js/config.js` depois de jogar algumas partidas.

## Ideias para depois (fora da v1)

- Serraria: tora vira tábua, forro e deck.
- Minijogo de cubagem com o cálculo real.
- Ação: dirigir o caminhão.
- Mais espécies e mapas.
- Publicar na Play Store.
```

- [ ] **Step 3: Rodar os testes uma última vez e commitar**

Run: `npm test`
Expected: PASS (todos).

```bash
git add README.md PENDENCIAS.md
git commit -m "docs: README e pendências"
```

- [ ] **Step 4: Publicar (peça autorização ao Richard antes — isto publica na internet)**

Peça ao Richard para criar, no GitHub, um repositório público vazio chamado `jogo-madeireiro` na conta `richardmadeiras-tech` (sem README). Com a confirmação dele:

```bash
git branch -M main
git remote add origin https://github.com/richardmadeiras-tech/jogo-madeireiro.git
git push -u origin main
```

Depois, no GitHub: Settings → Pages → Source: "Deploy from a branch", branch `main`, pasta `/ (root)`. O link ficará `https://richardmadeiras-tech.github.io/jogo-madeireiro/`.

- [ ] **Step 5: Conferir o endereço publicado**

Aguarde o Pages publicar (1–3 minutos) e abra o link no navegador. Confirme que o jogo carrega sem erros no console, que `await navigator.serviceWorker.ready` resolve e que `caches.keys()` mostra `jogo-madeireiro-v1`. Entregue o link ao Richard e peça o teste no celular, incluindo o modo avião.

---

## Autoconferência do plano

- **Cobertura do spec:** ciclo (Tasks 4 e 8), espécies e liberação (2, 3, 4), melhorias e custos (2, 3, 4), ganho offline e limite de 8 h (5, 7), salvamento, migração, backup e exportar/importar (6, 7, 8), estrutura de arquivos (todas; `js/` é o único ajuste, registrado em Global Constraints), erros de save e de relógio (6, 7), testes e conferência no celular (1–9), publicação (10). Critério de pronto da v1 coberto pela Task 9, passos 3–8.
- **Placeholders:** nenhum; todo passo de código tem o código.
- **Consistência de nomes:** `cortar`, `tocarCarga`, `carregarCaminhao`, `avancar`, `comprar`, `trocarEspecie`, `patioCheio`, `ganhoOffline`, `aplicarOffline`, `custoProximo`, `tempoViagem` etc. têm a mesma assinatura em todas as tasks; `jogo.passo()` devolve `{ ganho, offline }` e `main.js` usa exatamente isso; `atualizarCena` recebe os mesmos campos que `tela.js` envia.
- **Review Focus:** os 5 itens têm teste: save corrompido e valores absurdos (Task 6 e 7), relógio e 8 h (Tasks 5 e 7), pátio cheio e sem caminhão (Task 4), compra inválida (Task 4).
