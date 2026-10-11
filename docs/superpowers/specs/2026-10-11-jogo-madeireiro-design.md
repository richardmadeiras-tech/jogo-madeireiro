# Jogo Madeireiro — Design (v1)

Data: 2026-10-11

## Objetivo

Jogo de celular de madeireiro, para diversão (Richard e amigos). Projeto separado do app Romaneador (cubagem). Começa como web app aberto por link, funcionando offline no celular; a publicação em loja (Play Store) é decidida depois.

## Decisões já tomadas

| Tema | Decisão |
|---|---|
| Gênero | Mistura: começa idle/tycoon; ação e gestão com cubagem real entram em versões futuras |
| Destino | Web app (GitHub Pages), offline; loja depois, se valer a pena |
| Primeira jogada | Cortar → carregar no caminhão → entregar na serraria → melhorar |
| Tema/visual | Cartoon colorido, com espécies, preços e termos reais (tora, romaneio) |
| Arte | Desenhos simples em código (SVG e emojis); trocáveis depois sem mexer na lógica |
| Tecnologia | JavaScript puro + HTML + SVG, sem framework, sem servidor |

## Ciclo do jogo

Tela principal: floresta à esquerda, estrada para a serraria à direita; embaixo dinheiro, loja e melhorias.

1. **Cortar:** cada toque tira vida da árvore; ao cair vira toras.
2. **Carregar:** toras vão ao pátio e ao caminhão (capacidade em toras); o toque ajuda a carregar.
3. **Entregar:** caminhão cheio vai à serraria (viagem animada, leva segundos); na chegada paga o dinheiro.
4. **Melhorar:** o dinheiro compra ferramenta, ajudantes, caminhão e pátio. Ajudantes e caminhões trabalham sozinhos (parte idle).

**Espécies na v1:** tauari (barata, rápida), cumaru (média), ipê (cara, demorada). Cada uma tem preço e vida diferentes; as melhores são liberadas por melhorias.

## Progressão e números

- Uma só moeda: dinheiro (R$).
- **Melhorias** (cada uma com níveis): ferramenta (machado → serra manual → motosserra, aumenta dano por toque); ajudantes (cortam sozinhos); caminhão (capacidade, velocidade, 2º e 3º caminhão); pátio (guarda mais toras enquanto o caminhão viaja).
- Custo do próximo nível cresce cerca de 15% por compra.
- Todos os valores de balanceamento ficam em `config.js`, sem números soltos no código.
- **Ganho offline:** ajudantes e caminhões continuam trabalhando com o jogo fechado; ao voltar mostra "Enquanto você estava fora, ganhou R$ X". Limite de 8 horas; tempo negativo é ignorado.
- **Salvamento:** automático em localStorage (a cada poucos segundos e ao fechar), com versão do formato. Botão de exportar/importar save. Sem login.

## Estrutura do código

Cada arquivo tem uma função só:

- `config.js` — espécies, melhorias, custos e limites (único lugar com números de balanceamento).
- `estado.js` — estado do jogo (dinheiro, níveis, toras no pátio, caminhões); sem nada de tela.
- `regras.js` — contas puras: dano por toque, custo do próximo nível, ganho por viagem, ganho offline. Coberto por testes.
- `jogo.js` — relógio do jogo (ciclo de atualização) que aplica as regras ao estado.
- `salvar.js` — salvar, carregar, exportar, importar, migração de versão.
- `tela.js` e `desenhos.js` — SVG da floresta, caminhão e menus; tratamento de toques.
- `index.html`, `estilo.css`, service worker (offline).

## Tratamento de erros

- Save corrompido ou de versão antiga: tenta migrar; se não der, avisa, guarda cópia do save antigo e oferece começar do zero. O jogo não quebra.
- Relógio do celular alterado: ganho offline limitado a 8 h e tempo negativo ignorado.

## Testes e entrega

- Testes automáticos das regras (custos, dano, ganho por viagem, ganho offline, migração de save).
- Conferência no navegador em tamanho de celular antes de publicar.
- Repositório git próprio, publicado no GitHub Pages com link para abrir no celular.

## Critério de pronto da v1

Dá para jogar o ciclo completo (cortar, carregar, entregar, melhorar) com as 3 espécies; salva sozinho; ganha offline; funciona em modo avião.

## Fora da v1 (YAGNI)

Serraria que processa tábuas, cubagem, anúncios, loja de compras reais, ranking, vários mapas, moedas extras.

## Ideias para depois

Serraria (tora → tábua, forro, deck), minijogo de cubagem com o cálculo real, ação (dirigir o caminhão), mais espécies, publicação na Play Store.
