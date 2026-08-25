# Operação local — Barraca Agostina IFRO

## Objetivo de implantação

Durante a Festa Agostina, o **Raspberry Pi** deve hospedar a aplicação e o banco de dados na rede local da barraca. Os computadores ligados aos monitores acessam o sistema pelo navegador, usando o endereço IP local do Raspberry Pi. Dessa forma, o fluxo de caixa, produção e chamadas não depende da conexão com a internet.

| Elemento | Responsabilidade | Dependência de internet |
| --- | --- | --- |
| Raspberry Pi | Aplicação web, API, banco de dados e ponte de hardware | Não |
| Monitor 1 | Caixa, produção, dashboard e configurações | Apenas rede local |
| Monitor 2 | Rota pública `/chamadas` em tela cheia | Apenas rede local |
| Arduino | LEDs e sirene, conectado à ponte física | Não |

> A aplicação não deve bloquear pedidos caso o Arduino esteja desconectado. O estado físico é monitorado separadamente e os comandos são tratados por uma fila idempotente.

## Topologia sugerida

```text
Raspberry Pi (IP local fixo)
├── Aplicação web + API
├── Banco de dados local
└── Adaptador de hardware
    └── Arduino → LEDs e sirene

Computador do caixa       → http://IP-DO-PI:PORTA/
Monitor público/produção  → http://IP-DO-PI:PORTA/chamadas
```

## Preparação antes do evento

O Raspberry Pi deve receber um IP estável na rede da barraca. Instale a versão LTS atual do Node.js e um banco MySQL ou MariaDB compatível. Copie o projeto para o dispositivo, instale as dependências e configure `DATABASE_URL` para apontar para o banco local. Depois aplique as migrations existentes no diretório `drizzle/`.

O processo da aplicação deve ser iniciado em modo de produção, usando a porta definida pelo ambiente. O acesso dos operadores deverá usar o endereço local do Raspberry Pi, nunca uma URL externa. Para a tela pública, abra diretamente `/chamadas` no segundo monitor e ative o modo de tela cheia do navegador.

## Ponte com Arduino

A implementação atual oferece um `HardwareController` desacoplado. Para operar o hardware real, crie um adaptador que implemente `HardwareAdapter` e converta os comandos `LED_ON`, `LED_OFF` e `ALERT` para o protocolo serial ou de rede escolhido.

| Garantia da camada | Comportamento |
| --- | --- |
| Idempotência | A mesma chave de comando é ignorada se estiver na fila, em andamento ou concluída. |
| Timeout | Um comando sem resposta é marcado como falho sem interromper os pedidos. |
| Reconexão | Falhas disparam novas tentativas progressivas de conexão. |
| Diagnóstico | Logs e estados ficam visíveis em Configurações. |
| Persistência | Mudanças de estado e comandos são registrados para auditoria. |

## Checklist operacional

Antes de abrir a barraca, valide o banco local, cadastre os produtos e os preços vigentes, teste um pedido completo, abra a tela de chamadas no segundo monitor e confira o indicador de rede. Caso o Arduino esteja instalado, faça um teste de alerta e confirme que uma falha física não interrompe caixa ou produção.

Após o evento, exporte ou faça backup do banco local antes de desligar o Raspberry Pi.
