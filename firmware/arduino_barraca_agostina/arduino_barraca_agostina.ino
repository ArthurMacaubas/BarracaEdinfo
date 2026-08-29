/*
 * Placa-alvo: Arduino Uno (ATmega328P)
 * Barraca Agostina — controlador de fita LED e sirene por dois relés
 *
 * Relé 1: D8 -> fita LED
 * Relé 2: D9 -> sirene
 * Comunicação: USB/Serial, 115200 bps, fim de linha \n
 *
 * Protocolo serial:
 *   chave|LED_ON|duracaoEmMs
 *   chave|LED_OFF|0
 *   chave|SIREN_ON|duracaoEmMs
 *   chave|SIREN_OFF|0
 *   chave|ALERT|duracaoEmMs
 *   chave|STATUS|0
 *   chave|TEST|duracaoEmMs
 *
 * Resposta de sucesso: ACK|chave
 * Resposta de erro:    NACK|chave|motivo
 *
 * Instalação elétrica:
 *   - Use um módulo de relé compatível com sinal de 5 V.
 *   - Alimente o módulo conforme sua especificação e una os GNDs.
 *   - Nunca alimente a fita LED ou a sirene pelos pinos digitais.
 *   - Nunca conecte cargas de rede diretamente à placa.
 */

#include <Arduino.h>

constexpr uint8_t LED_RELAY_PIN = 8;
constexpr uint8_t SIREN_RELAY_PIN = 9;
// A maioria dos módulos de relé é acionada em nível baixo (LOW).
// Altere para false somente se o seu módulo for acionado em nível alto.
constexpr bool RELAY_ACTIVE_LOW = true;
constexpr unsigned long DEFAULT_ALERT_MS = 900;
constexpr unsigned long MAX_DURATION_MS = 5000;

char buffer[96];
uint8_t bufferLength = 0;
unsigned long ledRelayUntil = 0;
unsigned long sirenRelayUntil = 0;

bool timeReached(unsigned long deadline) {
  return deadline != 0 && static_cast<long>(millis() - deadline) >= 0;
}

void setRelay(uint8_t pin, bool enabled) {
  const bool outputHigh = RELAY_ACTIVE_LOW ? !enabled : enabled;
  digitalWrite(pin, outputHigh ? HIGH : LOW);
}

bool isRelayEnabled(uint8_t pin) {
  return RELAY_ACTIVE_LOW ? digitalRead(pin) == LOW : digitalRead(pin) == HIGH;
}

void reportRelayState(const char* relay, uint8_t pin) {
  Serial.print(F("STATE|"));
  Serial.print(relay);
  Serial.print('|');
  Serial.println(isRelayEnabled(pin) ? F("ON") : F("OFF"));
}

void updateOutputs() {
  if (timeReached(sirenRelayUntil)) {
    setRelay(SIREN_RELAY_PIN, false);
    sirenRelayUntil = 0;
  }
  if (timeReached(ledRelayUntil)) {
    setRelay(LED_RELAY_PIN, false);
    ledRelayUntil = 0;
  }
}

unsigned long readDuration(const char* value, unsigned long fallback) {
  if (value == nullptr) return fallback;
  const unsigned long parsed = strtoul(value, nullptr, 10);
  if (parsed == 0) return fallback;
  return min(parsed, MAX_DURATION_MS);
}

void acknowledge(const char* key) {
  Serial.print(F("ACK|"));
  Serial.println(key);
}

void reject(const char* key, const char* reason) {
  Serial.print(F("NACK|"));
  Serial.print(key == nullptr ? "sem-chave" : key);
  Serial.print('|');
  Serial.println(reason);
}

void processCommand(char* raw) {
  char* key = strtok(raw, "|");
  char* type = strtok(nullptr, "|");
  char* durationValue = strtok(nullptr, "|");
  if (key == nullptr || type == nullptr) {
    reject(key, "formato-invalido");
    return;
  }

  if (strcmp(type, "LED_ON") == 0) {
    const unsigned long duration = durationValue == nullptr ? 0 : strtoul(durationValue, nullptr, 10);
    setRelay(LED_RELAY_PIN, true);
    ledRelayUntil = duration > 0 ? millis() + min(duration, MAX_DURATION_MS) : 0;
    acknowledge(key);
    return;
  }

  if (strcmp(type, "LED_OFF") == 0) {
    setRelay(LED_RELAY_PIN, false);
    ledRelayUntil = 0;
    acknowledge(key);
    return;
  }

  if (strcmp(type, "SIREN_ON") == 0) {
    const unsigned long duration = readDuration(durationValue, DEFAULT_ALERT_MS);
    setRelay(SIREN_RELAY_PIN, true);
    sirenRelayUntil = millis() + duration;
    acknowledge(key);
    return;
  }

  if (strcmp(type, "SIREN_OFF") == 0) {
    setRelay(SIREN_RELAY_PIN, false);
    sirenRelayUntil = 0;
    acknowledge(key);
    return;
  }

  if (strcmp(type, "STATUS") == 0) {
    reportRelayState("LED", LED_RELAY_PIN);
    reportRelayState("SIREN", SIREN_RELAY_PIN);
    acknowledge(key);
    return;
  }

  if (strcmp(type, "ALERT") == 0 || strcmp(type, "TEST") == 0) {
    const unsigned long duration = readDuration(durationValue, DEFAULT_ALERT_MS);
    setRelay(LED_RELAY_PIN, true);
    ledRelayUntil = millis() + duration;
    setRelay(SIREN_RELAY_PIN, true);
    sirenRelayUntil = millis() + duration;
    acknowledge(key);
    return;
  }

  reject(key, "comando-desconhecido");
}

void readSerial() {
  while (Serial.available() > 0) {
    const char current = static_cast<char>(Serial.read());
    if (current == '\r') continue;
    if (current == '\n') {
      buffer[bufferLength] = '\0';
      if (bufferLength > 0) processCommand(buffer);
      bufferLength = 0;
      continue;
    }
    if (bufferLength >= sizeof(buffer) - 1) {
      bufferLength = 0;
      reject("sem-chave", "comando-longo");
      continue;
    }
    buffer[bufferLength++] = current;
  }
}

void setup() {
  pinMode(LED_RELAY_PIN, OUTPUT);
  pinMode(SIREN_RELAY_PIN, OUTPUT);
  setRelay(LED_RELAY_PIN, false);
  setRelay(SIREN_RELAY_PIN, false);
  Serial.begin(115200);
  Serial.println(F("READY|barraca-agostina-arduino-uno"));
}

void loop() {
  readSerial();
  updateOutputs();
}
