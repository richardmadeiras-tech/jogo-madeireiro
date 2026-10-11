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
