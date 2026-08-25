# Conexão do Arduino — Barraca Agostina

## Situação atual

O painel já possui uma fila de comandos de hardware para `LED_ON`, `LED_OFF` e `ALERT`, mas o adaptador físico ainda está como **indisponível**. Portanto, conectar o cabo USB ao computador, por si só, ainda não permite que o site acione o Arduino.

Para a integração funcionar, o processo que executa o servidor precisa ficar no mesmo computador/Raspberry Pi que enxerga a porta USB do Arduino. A versão publicada na nuvem não acessa uma porta USB local. É necessário executar o sistema localmente e acrescentar uma ponte serial ao backend, ou criar uma ponte de rede com ESP32.

## Ligação recomendada

| Componente | Ligação no Arduino Uno/Nano | Observação |
| --- | --- | --- |
| Relé 1 — fita LED | `IN1` → D8 | Aciona a alimentação da fita LED. |
| Relé 2 — sirene | `IN2` → D9 | Aciona a alimentação da sirene. |
| Alimentação dos relés | `VCC` → fonte 5 V regulada; `GND` conforme o manual do módulo | Não alimente a fita ou a sirene pelo 5 V do Arduino. |
| USB | Arduino → USB do Raspberry Pi/PC que executa o backend | Use cabo USB de dados, não apenas de carga. |

Para uma fita de 12 V ou sirene DC, o relé deve interromper a alimentação **própria** da carga: positivo da fonte → `COM`; `NO` → positivo da carga; negativo da carga → negativo da fonte. A escolha de `NO` faz a carga permanecer desligada quando o relé não está acionado.

> Não conecte 127/220 V diretamente ao Arduino. Se a sirene ou a fonte da fita usar rede elétrica, use relé certificado e dimensionado, fusível, caixa isolante e instalação feita por profissional habilitado. Nunca alimente a fita LED ou a sirene pelo pino de 5 V do Arduino.

## Firmware

Abra `arduino_barraca_agostina.ino` na Arduino IDE. Selecione a placa e a porta correta, grave o código e mantenha a comunicação serial em **115200 bps**.

O firmware recebe uma linha por comando e responde com confirmação:

```text
teste-001|TEST|700
ACK|teste-001
```

| Comando enviado pela ponte local | Efeito no Arduino |
| --- | --- |
| `chave|LED_ON|1000` | Aciona o relé da fita LED por até 1 segundo. |
| `chave|LED_OFF|0` | Desliga o relé da fita LED. |
| `chave|ALERT|900` | Aciona os dois relés — fita LED e sirene — por 900 ms. |
| `chave|TEST|700` | Comando opcional aceito pelo firmware para testes manuais; não é emitido pelo site atual. |

## O que falta integrar ao site

No backend, é preciso adicionar um `HardwareAdapter` serial que abra a porta do Arduino — normalmente `/dev/ttyACM0` ou `/dev/ttyUSB0` no Raspberry Pi/Linux e `COM3` no Windows —, envie as linhas acima e espere `ACK|chave` antes de marcar o comando como confirmado.

Depois, a aplicação deve chamar `hardwareController.configure(adaptadorSerial)` na inicialização. Com isso, o botão **Testar sirene** em Cadastro e Hardware — que atualmente dispara `ALERT` — e os alertas de meta passam a mandar `ALERT` ao Arduino.

## Limitação registrada

O firmware foi revisado pelo protocolo, mas não foi compilado neste ambiente porque o `arduino-cli` não está instalado. Antes de usar no evento, abra o arquivo na Arduino IDE, selecione a placa e compile/grave o sketch. A ponte serial ou de rede também ainda precisa ser implementada no backend para a conexão física operar.

O firmware considera, por padrão, módulos de relé **ativos em nível baixo** (`RELAY_ACTIVE_LOW = true`), que são os mais comuns. Teste primeiro sem nenhuma carga ligada: se o relé ficar acionado quando deveria estar desligado, altere essa constante para `false`, grave novamente e repita o teste.

## Teste antes do evento

Primeiro abra o Monitor Serial em 115200 bps para confirmar que o Arduino mostra `READY|barraca-agostina`. Em seguida, com a ponte serial implementada e o backend local em execução, use o botão **Testar sirene** e confirme que a fita LED e a sirene ligam pelo tempo esperado. O painel deve mostrar o hardware como `ONLINE` e registrar a confirmação do comando.
