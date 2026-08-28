# Operação local — Barraca Agostina IFRO

## Objetivo

Durante o evento, um computador com Node.js hospeda a aplicação e o banco SQLite na rede local da barraca. O caixa, o dashboard e o segundo monitor acessam o endereço IP desse computador pelo navegador. O ESP-WROOM-32 fica conectado por USB ao mesmo computador que executa o backend.

| Elemento | Responsabilidade | Internet necessária |
| --- | --- | --- |
| Computador local | Aplicação web, API, SQLite e ponte serial | Não, para a operação básica |
| Tela do caixa | Cadastro, hardware e pedidos | Apenas rede local |
| Segundo monitor | Tela pública `/chamadas` ou rota pública configurada | Apenas rede local |
| ESP-WROOM-32 | Relé da fita LED e relé da sirene | Não |

A aplicação não exige login e não deve ser exposta diretamente à Internet. Use uma rede local confiável e mantenha o firewall ativo.

## Topologia

```text
Computador local (IP da rede)
├── Aplicação web + API Node.js
├── Banco data/barraca-agostina.sqlite
├── Ponte serial USB
└── ESP-WROOM-32
    ├── GPIO18 → relé da fita LED
    └── GPIO19 → relé da sirene

Computador do caixa  → http://IP-DO-COMPUTADOR:3000/
Segundo monitor     → http://IP-DO-COMPUTADOR:3000/chamadas
```

## Instalação

Instale Node.js 22 LTS, Git e a Arduino IDE no computador que ficará junto ao ESP-WROOM-32. No diretório do projeto, instale as dependências com npm:

```bash
npm install
```

Crie o `.env` na raiz:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_FILE="./data/barraca-agostina.sqlite"
HARDWARE_SERIAL_PORT="auto"
HARDWARE_SERIAL_BAUD_RATE="115200"
```

Confira o banco e a configuração antes de abrir o sistema:

```bash
npm run db:verify
npm run check
npm test
```

Para desenvolvimento, execute:

```bash
npm run dev
```

Para produção local:

```bash
npm run build
NODE_ENV=production npm start
```

Abra `http://localhost:3000` no computador do caixa. Para os demais dispositivos, substitua `localhost` pelo endereço IP local do computador, por exemplo `http://192.168.0.50:3000`.

## Banco SQLite e backup

O banco é criado automaticamente em `data/barraca-agostina.sqlite`. Não compartilhe esse arquivo por pasta de rede: os clientes devem acessar somente a API Node. Para fazer backup, pare o servidor e copie o arquivo para um local seguro:

```bash
mkdir -p backups
cp data/barraca-agostina.sqlite "backups/barraca-$(date +%Y%m%d-%H%M%S).sqlite"
```

Para restaurar, pare o servidor, preserve o arquivo atual e copie uma cópia válida para o caminho definido em `DATABASE_FILE`. Em seguida, execute `npm run db:verify`.

## ESP-WROOM-32

Abra o sketch em `firmware/arduino_barraca_agostina/arduino_barraca_agostina.ino`, selecione a placa **ESP32 Dev Module** (ou o perfil correspondente ao seu ESP-WROOM-32), escolha a porta USB, grave o firmware e use 115200 bps no Monitor Serial. Conecte `IN1` do relé da fita LED ao GPIO18 e `IN2` do relé da sirene ao GPIO19. Use módulo de relé compatível com lógica de 3,3 V e não aplique 5 V aos GPIOs. Não alimente cargas de potência pelo Arduino e não conecte tensão de rede diretamente à placa.

No Linux, instale `udev` e dê permissão serial ao usuário:

```bash
sudo apt update
sudo apt install -y udev
sudo usermod -aG dialout "$USER"
```

Saia e entre novamente na sessão. Se a descoberta automática não encontrar o ESP-WROOM-32, informe a porta diretamente, como `/dev/ttyACM0`, `/dev/ttyUSB0`, `/dev/cu.usbmodem...` ou `COM3` no Windows.

## Rotina de abertura

Antes do evento, ligue o computador, conecte o ESP-WROOM-32, confirme o `READY|barraca-agostina-esp32` no Monitor Serial, feche o Monitor Serial, inicie a aplicação com `npm run dev`, cadastre os produtos e teste os relés sem carga ligada. Depois faça um pedido de teste e confirme a atualização do dashboard.

Se o ESP-WROOM-32 estiver desligado, os pedidos continuam funcionando; apenas os comandos físicos ficam offline. A ponte serial deve permanecer no mesmo computador do backend. A hospedagem na nuvem não consegue acessar o USB local.
