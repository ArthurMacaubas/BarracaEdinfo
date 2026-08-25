/*
 * Barraca Agostina — controlador de fita LED e sirene por relés
 *
 * Protocolo serial (115200 bps, fim de linha \n):
 *   chave|LED_ON|duracaoEmMs
 *   chave|LED_OFF|0
 *   chave|ALERT|duracaoEmMs
 *   chave|TEST|duracaoEmMs
 *
 * Resposta de sucesso: ACK|chave
 * Resposta de erro:    NACK|chave|motivo
 */

constexpr byte LED_RELAY_PIN = 8;
constexpr byte SIREN_RELAY_PIN = 9;
// A maioria dos módulos de relé de 5 V é acionada em nível baixo (LOW).
// Altere para false somente se os seus relés forem acionados em nível alto.
constexpr bool RELAY_ACTIVE_LOW = true;
constexpr unsigned long DEFAULT_ALERT_MS = 900;
constexpr unsigned long MAX_DURATION_MS = 5000;

char buffer[96];
byte bufferLength = 0;
unsigned long ledRelayUntil = 0;
unsigned long sirenRelayUntil = 0;

bool timeReached(unsigned long deadline) {
  return deadline != 0 && static_cast<long>(millis() - deadline) >= 0;
}

void setRelay(byte pin, bool enabled) {
  const bool outputHigh = RELAY_ACTIVE_LOW ? !enabled : enabled;
  digitalWrite(pin, outputHigh ? HIGH : LOW);
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
    const unsigned long duration = readDuration(durationValue, DEFAULT_ALERT_MS);
    setRelay(LED_RELAY_PIN, true);
    ledRelayUntil = millis() + duration;
    acknowledge(key);
    return;
  }

  if (strcmp(type, "LED_OFF") == 0) {
    setRelay(LED_RELAY_PIN, false);
    ledRelayUntil = 0;
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
  Serial.println(F("READY|barraca-agostina"));
}

void loop() {
  readSerial();
  updateOutputs();
}
