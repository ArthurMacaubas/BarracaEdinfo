# Validação da tela pública fixa

Esta validação verifica a composição da rota pública em um viewport de **1280 × 720 pixels**, a resolução usada como referência para o segundo monitor. Ela foi executada pelo comando `pnpm test:public-layout`, que abre cada prévia em um navegador automatizado e mede a altura do documento, do `body` e do palco público.

| Estado validado | Rota de prévia | Alturas medidas | Overflow vertical | Resultado |
|---|---|---:|---|---|
| Meta batida | `/chamadas?preview=goal&sponsors=1` | documento, `body` e palco: 720 px | `hidden` no `body` e no palco | Aprovado |
| PIX | `/chamadas?preview=pix&sponsors=1` | documento, `body` e palco: 720 px | `hidden` no `body` e no palco | Aprovado |
| Promoção | `/chamadas?sponsors=1` | documento, `body` e palco: 720 px | `hidden` no `body` e no palco | Aprovado |

Além da medição, foram inspecionadas capturas de viewport dos três estados. A hierarquia de anúncio, QR Code ou promoção, estado de conexão e carrossel de patrocinadores permanece dentro de uma única tela e sem barra de rolagem vertical.

> As evidências reproduzíveis são geradas em `/home/ubuntu/webdev-static-assets/barraca-agostina-ifro-layout/`: três capturas PNG de 1280 × 720 pixels e o arquivo `validacao-tela-publica-1280x720.json` com as medições. O comando pode ser reexecutado a qualquer momento no ambiente local com `pnpm test:public-layout`.
