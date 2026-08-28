# Conexão do Arduino Uno — Barraca Agostina

## Visão geral

A integração física usa um **Arduino Uno conectado por USB ao mesmo computador que executa o backend Node.js**. O navegador acessa a aplicação pela rede local, mas somente o processo do backend precisa enxergar a porta serial USB. A versão hospedada na nuvem não acessa o USB do computador local.

O Arduino Uno controla dois relés independentes: um para a fita LED e outro para a sirene. O site envia comandos pela ponte serial do backend, recebe `ACK` ou `NACK` e consulta o estado físico com `STATUS`.

## Ligações

| Componente | Ligação no Arduino Uno | Observação |
| --- | --- | --- |
| Relé 1 — fita LED | `IN1` → D8 | Aciona a alimentação da fita LED. |
| Relé 2 — sirene | `IN2` → D9 | Aciona a alimentação da sirene. |
| Módulo de relé | `VCC` → fonte regulada de 5 V; `GND` comum | Confirme a tensão indicada pelo módulo. |
| USB | Arduino Uno → computador que executa o backend | Use cabo USB de dados. |

Para uma fita de 12 V ou uma sirene DC, o relé deve interromper a alimentação própria da carga: positivo da fonte → `COM`; `NO` → positivo da carga; negativo da carga → negativo da fonte. Usar `NO` mantém a carga desligada quando o relé não está acionado.

> Nunca conecte 127/220 V diretamente ao Arduino Uno. Para cargas ligadas à rede elétrica, use relé certificado, fusível, caixa isolante e instalação realizada por profissional habilitado. Não alimente a fita LED ou a sirene pelo pino de 5 V do Arduino.

## Gravação do firmware

Abra `firmware/arduino_barraca_agostina/arduino_barraca_agostina.ino` na Arduino IDE. Selecione **Arduino Uno**, escolha a porta USB correta e grave o sketch. O Monitor Serial deve usar **115200 bps**.

O firmware envia `READY|barraca-agostina` ao iniciar e recebe uma linha por comando:

```text
pedido-001|TEST|700
ACK|pedido-001
```

| Comando | Efeito |
| --- | --- |
| `chave|LED_ON|1000` | Liga o relé da fita LED por até 1 segundo. |
| `chave|LED_OFF|0` | Desliga o relé da fita LED. |
| `chave|SIREN_ON|1000` | Liga somente o relé da sirene por até 1 segundo. |
| `chave|SIREN_OFF|0` | Desliga somente o relé da sirene. |
| `chave|ALERT|900` | Liga os dois relés por 900 ms. |
| `chave|STATUS|0` | Retorna `STATE|LED|ON/OFF` e `STATE|SIREN|ON/OFF`. |
| `chave|TEST|700` | Executa um teste dos dois relés. |

## Configuração do backend

No `.env` do computador que executa o site, use a descoberta automática ou informe a porta diretamente:

```dotenv
HARDWARE_SERIAL_PORT="auto"
HARDWARE_SERIAL_BAUD_RATE="115200"
```

No Linux, a porta costuma ser `/dev/ttyACM0` ou `/dev/ttyUSB0`. No Windows, costuma ser `COM3`. No macOS, costuma ser `/dev/cu.usbmodem...`. Se a porta automática não for encontrada, informe o caminho exato em `HARDWARE_SERIAL_PORT`.

O usuário do sistema precisa ter permissão para acessar a porta serial. No Ubuntu, instale `udev` e inclua o usuário no grupo `dialout`:

```bash
sudo apt update
sudo apt install -y udev
sudo usermod -aG dialout "$USER"
```

Saia e entre novamente na sessão depois de alterar o grupo. Se o Arduino não estiver conectado, deixe `HARDWARE_SERIAL_PORT=""`; o site continuará funcionando com o hardware offline.

## Teste antes do evento

Primeiro grave o firmware, abra o Monitor Serial a 115200 bps e confirme a mensagem `READY|barraca-agostina`. Depois feche o Monitor Serial, conecte o Arduino Uno ao computador e inicie o backend com `npm run dev`. Em **Cadastro & hardware**, use o teste dos relés e confirme que o painel mostra `ONLINE` e registra a resposta da placa.

Teste inicialmente sem nenhuma carga ligada. Se o módulo de relé operar invertido, altere `RELAY_ACTIVE_LOW` no firmware, grave novamente e repita o teste. Nunca teste a sirene ou a fita ligada enquanto ainda estiver validando a lógica elétrica.
