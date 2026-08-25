export type HardwareConnectionState = "ONLINE" | "OFFLINE" | "RECONNECTING";
export type HardwareCommandType = "LED_ON" | "LED_OFF" | "ALERT" | "TEST";

export type HardwareCommand = {
  key: string;
  type: HardwareCommandType;
  payload?: Record<string, unknown>;
  timeoutMs?: number;
};

export type HardwareLog = {
  at: Date;
  level: "info" | "warn" | "error";
  message: string;
};

export interface HardwareAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(command: HardwareCommand): Promise<void>;
}

class UnavailableHardwareAdapter implements HardwareAdapter {
  async connect() {
    throw new Error("Nenhum adaptador físico configurado.");
  }
  async disconnect() {}
  async send() {
    throw new Error("Arduino indisponível.");
  }
}

/**
 * Fila em memória para a ponte com Arduino. A aplicação opera normalmente
 * sem dispositivo físico: os comandos são registrados e falham de forma
 * controlada até que um adaptador serial/rede seja configurado no Raspberry Pi.
 */
export class HardwareController {
  private adapter: HardwareAdapter = new UnavailableHardwareAdapter();
  private state: HardwareConnectionState = "OFFLINE";
  private queue: HardwareCommand[] = [];
  private inFlight = new Set<string>();
  private completed = new Set<string>();
  private logs: HardwareLog[] = [];
  private processing = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectDelayMs = 1000;
  private shouldReconnect = false;

  configure(adapter: HardwareAdapter) {
    this.adapter = adapter;
  }

  getSnapshot() {
    return {
      state: this.state,
      queued: this.queue.length,
      processing: this.processing,
      logs: this.logs.slice(0, 12),
    };
  }

  private log(level: HardwareLog["level"], message: string) {
    this.logs.unshift({ at: new Date(), level, message });
    this.logs = this.logs.slice(0, 60);
    void this.persistEvent(level, message);
  }

  private async persistEvent(level: HardwareLog["level"], message: string) {
    try {
      const db = await getDb();
      if (!db) return;
      await db.insert(operationEvents).values({ type: "HARDWARE_LOG", entityType: "HARDWARE", payload: JSON.stringify({ level, message }) });
    } catch {
      // Diagnóstico não pode bloquear a operação física.
    }
  }

  private async persistCommand(command: HardwareCommand, status: "QUEUED" | "SENT" | "ACK" | "FAILED") {
    try {
      const db = await getDb();
      if (!db) return;
      if (status === "QUEUED") {
        await db.insert(hardwareCommands).values({ commandKey: command.key, type: command.type, payload: JSON.stringify(command.payload ?? {}), status });
        return;
      }
      await db.update(hardwareCommands).set({ status, attempts: sql`${hardwareCommands.attempts} + 1` }).where(eq(hardwareCommands.commandKey, command.key));
    } catch {
      // O comando já foi encaminhado ao adaptador; somente a trilha persistida falhou.
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.reconnectTimer) return;
    const delay = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 15000);
    this.log("info", `Nova tentativa de conexão em ${Math.round(delay / 1000)} segundo(s).`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, delay);
  }

  async connect() {
    if (this.state === "ONLINE") return;
    this.shouldReconnect = true;
    this.state = "RECONNECTING";
    this.log("info", "Tentando conectar ao controlador físico.");
    try {
      await this.adapter.connect();
      this.state = "ONLINE";
      this.reconnectDelayMs = 1000;
      this.log("info", "Controlador físico conectado.");
      void this.processQueue();
    } catch (error) {
      this.state = "OFFLINE";
      this.log("warn", `Controlador indisponível: ${error instanceof Error ? error.message : "erro desconhecido"}`);
      this.scheduleReconnect();
    }
  }

  async disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    await this.adapter.disconnect();
    this.state = "OFFLINE";
    this.log("info", "Controlador físico desconectado.");
  }

  enqueue(command: HardwareCommand) {
    if (this.inFlight.has(command.key) || this.completed.has(command.key) || this.queue.some(item => item.key === command.key)) {
      this.log("info", `Comando duplicado ignorado: ${command.key}`);
      return { accepted: false, reason: "DUPLICATE" as const };
    }

    this.queue.push(command);
    this.log("info", `Comando enfileirado: ${command.type}.`);
    void this.persistCommand(command, "QUEUED");
    void this.processQueue();
    return { accepted: true, reason: "QUEUED" as const };
  }

  turnLedOn(key: string, durationMs?: number) {
    return this.enqueue({ key, type: "LED_ON", payload: { durationMs } });
  }

  turnLedOff(key: string) {
    return this.enqueue({ key, type: "LED_OFF" });
  }

  triggerAlert(key: string, durationMs = 900) {
    return this.enqueue({ key, type: "ALERT", payload: { durationMs }, timeoutMs: 2500 });
  }

  private async processQueue() {
    if (this.processing || this.state !== "ONLINE") return;
    this.processing = true;

    while (this.queue.length > 0 && this.state === "ONLINE") {
      const command = this.queue.shift();
      if (!command) break;
      this.inFlight.add(command.key);
      void this.persistCommand(command, "SENT");
      try {
        const timeoutMs = command.timeoutMs ?? 2000;
        await Promise.race([
          this.adapter.send(command),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de comunicação")), timeoutMs)),
        ]);
        this.completed.add(command.key);
        void this.persistCommand(command, "ACK");
        this.log("info", `Comando confirmado: ${command.type}.`);
      } catch (error) {
        this.state = "OFFLINE";
        void this.persistCommand(command, "FAILED");
        this.log("error", `Falha no comando ${command.type}: ${error instanceof Error ? error.message : "erro desconhecido"}`);
        this.scheduleReconnect();
      } finally {
        this.inFlight.delete(command.key);
      }
    }
    this.processing = false;
  }
}

export const hardwareController = new HardwareController();
import { eq, sql } from "drizzle-orm";
import { hardwareCommands, operationEvents } from "../drizzle/schema";
import { getDb } from "./db";
