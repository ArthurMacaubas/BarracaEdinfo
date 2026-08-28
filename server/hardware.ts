import { eq, sql } from "drizzle-orm";
import { hardwareCommands, operationEvents } from "../drizzle/schema";
import { getDb } from "./db";

export type HardwareCommandType = "LED_ON" | "LED_OFF" | "SIREN_ON" | "SIREN_OFF" | "ALERT" | "TEST" | "STATUS";
export type HardwareConnectionState = "OFFLINE" | "RECONNECTING" | "ONLINE";
export type RelayState = "ON" | "OFF" | "PENDING" | "UNKNOWN";
export type RelayName = "led" | "siren";
export type HardwareCommand = { key: string; type: HardwareCommandType; payload?: Record<string, unknown>; timeoutMs?: number };
export type HardwareLog = { at: Date; level: "info" | "warn" | "error"; message: string };

export interface HardwareAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(command: HardwareCommand): Promise<void>;
  getRelayStates?(): Partial<Record<RelayName, RelayState>>;
}

class UnavailableHardwareAdapter implements HardwareAdapter {
  async connect() { throw new Error("Nenhum adaptador físico configurado."); }
  async disconnect() {}
  async send() { throw new Error("Arduino indisponível."); }
}

/** Fila resiliente entre as ações do sistema e a ponte física do Arduino. */
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
  private relays: Record<RelayName, RelayState> = { led: "UNKNOWN", siren: "UNKNOWN" };
  private relayTimers: Partial<Record<RelayName, ReturnType<typeof setTimeout>>> = {};
  private relayStatusTimer: ReturnType<typeof setInterval> | undefined;

  configure(adapter: HardwareAdapter) { this.adapter = adapter; this.resetRelayState(); this.stopRelayStatePolling(); }
  getSnapshot() { this.syncAdapterRelayStates(); return { state: this.state, queued: this.queue.length, processing: this.processing, relays: { ...this.relays }, logs: this.logs.slice(0, 12) }; }

  private log(level: HardwareLog["level"], message: string) { this.logs.unshift({ at: new Date(), level, message }); this.logs = this.logs.slice(0, 60); void this.persistEvent(level, message); }
  private resetRelayState() { this.relays = { led: "UNKNOWN", siren: "UNKNOWN" }; for (const timer of Object.values(this.relayTimers)) if (timer) clearTimeout(timer); this.relayTimers = {}; }
  private setRelay(name: RelayName, state: RelayState) { this.relays[name] = state; }
  private syncAdapterRelayStates() { const states = this.adapter.getRelayStates?.(); if (!states) return; for (const name of ["led", "siren"] as const) if (this.relays[name] !== "PENDING" && states[name]) this.relays[name] = states[name]!; }
  private startRelayStatePolling() { if (!this.adapter.getRelayStates || this.relayStatusTimer) return; this.relayStatusTimer = setInterval(() => { if (this.state === "ONLINE") this.enqueue({ key: `relay-status-${Date.now()}`, type: "STATUS", timeoutMs: 2500 }); }, 4_000); this.relayStatusTimer.unref?.(); }
  private stopRelayStatePolling() { if (this.relayStatusTimer) clearInterval(this.relayStatusTimer); this.relayStatusTimer = undefined; }
  private scheduleRelayOff(name: RelayName, durationMs?: number) { if (this.relayTimers[name]) clearTimeout(this.relayTimers[name]); if (!durationMs || durationMs <= 0) return; const timer = setTimeout(() => { this.setRelay(name, "OFF"); delete this.relayTimers[name]; }, durationMs); timer.unref?.(); this.relayTimers[name] = timer; }
  private commandDuration(command: HardwareCommand) { const value = command.payload?.durationMs; return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined; }
  private markPending(command: HardwareCommand) { if (command.type === "LED_ON" || command.type === "LED_OFF") this.setRelay("led", "PENDING"); if (command.type === "SIREN_ON" || command.type === "SIREN_OFF") this.setRelay("siren", "PENDING"); if (command.type === "ALERT" || command.type === "TEST") { this.setRelay("led", "PENDING"); this.setRelay("siren", "PENDING"); } }
  private markCommandSucceeded(command: HardwareCommand) { const duration = this.commandDuration(command); if (command.type === "LED_ON") { this.setRelay("led", "ON"); this.scheduleRelayOff("led", duration); } if (command.type === "LED_OFF") { this.setRelay("led", "OFF"); this.scheduleRelayOff("led"); } if (command.type === "SIREN_ON") { this.setRelay("siren", "ON"); this.scheduleRelayOff("siren", duration); } if (command.type === "SIREN_OFF") { this.setRelay("siren", "OFF"); this.scheduleRelayOff("siren"); } if (command.type === "ALERT" || command.type === "TEST") { this.setRelay("led", "ON"); this.setRelay("siren", "ON"); this.scheduleRelayOff("led", duration); this.scheduleRelayOff("siren", duration); } }

  private async persistEvent(level: HardwareLog["level"], message: string) { try { const db = await getDb(); if (db) await db.insert(operationEvents).values({ type: "HARDWARE_LOG", entityType: "HARDWARE", payload: JSON.stringify({ level, message }) }); } catch {} }
  private async persistCommand(command: HardwareCommand, status: "QUEUED" | "SENT" | "ACK" | "FAILED") { try { const db = await getDb(); if (!db) return; if (status === "QUEUED") { await db.insert(hardwareCommands).values({ commandKey: command.key, type: command.type, payload: JSON.stringify(command.payload ?? {}), status }).run(); return; } await db.update(hardwareCommands).set({ status, attempts: sql`${hardwareCommands.attempts} + 1`, updatedAt: new Date() }).where(eq(hardwareCommands.commandKey, command.key)).run(); } catch {} }

  private scheduleReconnect() { if (!this.shouldReconnect || this.reconnectTimer) return; const delay = this.reconnectDelayMs; this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 15000); this.log("info", `Nova tentativa de conexão em ${Math.round(delay / 1000)} segundo(s).`); this.reconnectTimer = setTimeout(() => { this.reconnectTimer = undefined; void this.connect(); }, delay); }
  async connect() { if (this.state === "ONLINE") return; this.shouldReconnect = true; this.state = "RECONNECTING"; this.log("info", "Tentando conectar ao controlador físico."); try { await this.adapter.connect(); this.state = "ONLINE"; this.reconnectDelayMs = 1000; this.log("info", "Controlador físico conectado."); if (this.adapter.getRelayStates) { this.enqueue({ key: `relay-status-${Date.now()}`, type: "STATUS", timeoutMs: 2500 }); this.startRelayStatePolling(); } void this.processQueue(); } catch (error) { this.state = "OFFLINE"; this.resetRelayState(); this.stopRelayStatePolling(); this.log("warn", `Controlador indisponível: ${error instanceof Error ? error.message : "erro desconhecido"}`); this.scheduleReconnect(); } }
  async disconnect() { this.shouldReconnect = false; if (this.reconnectTimer) clearTimeout(this.reconnectTimer); this.reconnectTimer = undefined; this.stopRelayStatePolling(); await this.adapter.disconnect(); this.state = "OFFLINE"; this.resetRelayState(); this.log("info", "Controlador físico desconectado."); }

  enqueue(command: HardwareCommand) { if (this.inFlight.has(command.key) || this.completed.has(command.key) || this.queue.some(item => item.key === command.key)) { this.log("info", `Comando duplicado ignorado: ${command.key}`); return { accepted: false, reason: "DUPLICATE" as const }; } this.queue.push(command); this.markPending(command); this.log("info", `Comando enfileirado: ${command.type}.`); void this.persistCommand(command, "QUEUED"); void this.processQueue(); return { accepted: true, reason: "QUEUED" as const }; }
  turnLedOn(key: string, durationMs?: number) { return this.enqueue({ key, type: "LED_ON", payload: { durationMs } }); }
  turnLedOff(key: string) { return this.enqueue({ key, type: "LED_OFF" }); }
  turnSirenOn(key: string, durationMs = 900) { return this.enqueue({ key, type: "SIREN_ON", payload: { durationMs }, timeoutMs: 2500 }); }
  turnSirenOff(key: string) { return this.enqueue({ key, type: "SIREN_OFF" }); }
  triggerAlert(key: string, durationMs = 900) { return this.enqueue({ key, type: "ALERT", payload: { durationMs }, timeoutMs: 2500 }); }

  private async processQueue() { if (this.processing || this.state !== "ONLINE") return; this.processing = true; while (this.queue.length > 0 && this.state === "ONLINE") { const command = this.queue.shift(); if (!command) break; this.inFlight.add(command.key); void this.persistCommand(command, "SENT"); try { const timeoutMs = command.timeoutMs ?? 2000; await Promise.race([this.adapter.send(command), new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de comunicação")), timeoutMs))]); this.completed.add(command.key); this.markCommandSucceeded(command); this.syncAdapterRelayStates(); void this.persistCommand(command, "ACK"); this.log("info", `Comando confirmado: ${command.type}.`); } catch (error) { this.state = "OFFLINE"; this.resetRelayState(); this.stopRelayStatePolling(); void this.persistCommand(command, "FAILED"); this.log("error", `Falha no comando ${command.type}: ${error instanceof Error ? error.message : "erro desconhecido"}`); this.scheduleReconnect(); } finally { this.inFlight.delete(command.key); } } this.processing = false; }
}

export const hardwareController = new HardwareController();
