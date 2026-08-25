# Validação da tela pública fixa

Esta validação verifica a composição da rota pública em um viewport de **1280 × 720 pixels**, a resolução usada como referência para o segundo monitor. Ela foi executada pelo comando `pnpm test:public-layout`, que abre cada prévia em um navegador automatizado e mede a altura do documento, do `body` e do palco público.

| Estado validado | Rota de prévia | Alturas medidas | Overflow vertical | Resultado |
|---|---|---:|---|---|
| Meta batida | `/chamadas?preview=goal&sponsors=1` | documento, `body` e palco: 720 px | `hidden` no `body` e no palco | Aprovado |
| PIX | `/chamadas?preview=pix&sponsors=1` | documento, `body` e palco: 720 px | `hidden` no `body` e no palco | Aprovado |
| Promoção | `/chamadas?sponsors=1` | documento, `body` e palco: 720 px | `hidden` no `body` e no palco | Aprovado |

No novo design, o verificador também compara os limites dos elementos principais com os limites do palco público. Em 1280 × 720 pixels, o palco ocupa de 80,3 px a 599,3 px verticalmente. Todos os elementos críticos permaneceram dentro desse intervalo.

| Estado | Elementos conferidos | Limites verticais medidos | Resultado |
|---|---|---:|---|
| Meta batida | título, valor e mensagem de retirada | 243,7 px a 480,8 px | Dentro do palco |
| PIX | título, texto de orientação e moldura do QR Code | 202,7 px a 476,9 px | Dentro do palco |
| Promoção | anúncio, cartão de recompensa e texto do cartão | 81,3 px a 598,3 px | Dentro do palco |

Além da medição, foram inspecionadas capturas de viewport dos três estados. A hierarquia de anúncio, QR Code ou promoção, estado de conexão e carrossel de patrocinadores permanece dentro de uma única tela e sem barra de rolagem vertical.

> As evidências reproduzíveis são geradas em `/home/ubuntu/webdev-static-assets/barraca-agostina-ifro-layout/`: três capturas PNG de 1280 × 720 pixels e o arquivo `validacao-tela-publica-1280x720.json` com as medições. O comando pode ser reexecutado a qualquer momento no ambiente local com `pnpm test:public-layout`.
