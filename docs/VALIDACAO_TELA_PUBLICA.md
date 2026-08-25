# Validação da tela pública fixa

Esta validação verifica a composição da rota pública temática de **barraca de cachorro-quente** em um viewport de **1280 × 720 pixels**, a resolução usada como referência para o segundo monitor. Ela foi executada pelo comando `pnpm test:public-layout`, que abre cada prévia em um navegador automatizado e mede a altura do documento, do `body`, do palco público e dos elementos críticos de cada estado.

| Estado validado | Rota de prévia | Alturas medidas | Overflow vertical | Resultado |
|---|---|---:|---|---|
| Meta batida | `/chamadas?preview=goal&sponsors=1` | documento, `body` e palco: 720 px | `hidden` no `body` e no palco | Aprovado |
| PIX | `/chamadas?preview=pix&sponsors=1` | documento, `body` e palco: 720 px | `hidden` no `body` e no palco | Aprovado |
| Promoção | `/chamadas?preview=promotion&sponsors=1` | documento, `body` e palco: 720 px | `hidden` no `body` e no palco | Aprovado |
| Boas-vindas | `/chamadas?preview=promotion&sponsors=1&welcome=1` | documento, `body` e palco: 720 px | `hidden` no `body` e no palco | Aprovado |

No novo tema, o verificador também compara os limites dos elementos principais com os limites do palco público. Em 1280 × 720 pixels, o palco ocupa de 80,6 px a 560,2 px verticalmente. Todos os elementos críticos permaneceram dentro desse intervalo.

| Estado | Elementos conferidos | Limites verticais medidos | Resultado |
|---|---|---:|---|
| Meta batida | título, valor e mensagem de retirada | 224,4 px a 430,3 px | Dentro do palco |
| PIX | título, texto de orientação e moldura do QR Code dinâmico | 184,0 px a 456,7 px | Dentro do palco |
| Promoção | anúncio, cartão de recompensa e texto do cartão | 81,6 px a 559,2 px | Dentro do palco |
| Boas-vindas | cartão de abertura animado | 149,3 px a 491,5 px | Dentro do palco |

Além da medição, foram inspecionadas capturas de viewport dos quatro estados. A hierarquia de anúncio, QR Code PIX atualizado, promoção, boas-vindas e carrossel ampliado de patrocinadores permanece dentro de uma única tela e sem barra de rolagem vertical.

> As evidências reproduzíveis são geradas em `/home/ubuntu/webdev-static-assets/barraca-agostina-ifro-layout/`: quatro capturas PNG de 1280 × 720 pixels e o arquivo `validacao-tela-publica-1280x720.json` com as medições. O comando pode ser reexecutado a qualquer momento no ambiente local com `pnpm test:public-layout`.
