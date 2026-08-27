import { hardwareController, type HardwareAdapter, type HardwareCommand, type RelayName, type RelayState } from "./hardware";

type PendingCommand = { resolve: () => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> };
type SerialPortInstance = import("serialport").SerialPort;
const relayByWireName: Record<string, RelayName | undefined> = { LED: "led", SIREN: "siren" };

export function parseRelayStateLine(line: string): { relay: RelayName; state: RelayState } | undefined {
  const [kind, wireName, wireState] = line.trim().split("|");
  const relay = relayByWireName[wireName ?? ""];
  if (kind !== "STATE" || !relay || (wireState !== "ON" && wireState !== "OFF")) return undefined;
  return { relay, state: wireState };
}

export class SerialHardwareAdapter implements HardwareAdapter {
  private port: SerialPortInstance | undefined;
  private buffer = "";
  private pending = new Map<string, PendingCommand>();
  private relays: Record<RelayName, RelayState> = { led: "UNKNOWN", siren: "UNKNOWN" };

  constructor(private readonly config: { path: string; baudRate: number }) {}
  getRelayStates() { return { ...this.relays }; }

  async connect() {
    if (this.port?.isOpen) return;
    const { SerialPort } = await import("serialport");
    const port = new SerialPort({ path: this.config.path, baudRate: this.config.baudRate, autoOpen: false });
    port.on("data", chunk => this.handleData(chunk.toString()));
    port.on("error", error => this.rejectAll(error));
    await new Promise<void>((resolve, reject) => port.open(error => error ? reject(error) : resolve()));
    this.port = port;
  }

  async disconnect() {
    const port = this.port;
    this.port = undefined;
    this.relays = { led: "UNKNOWN", siren: "UNKNOWN" };
    this.rejectAll(new Error("Ponte serial desconectada."));
    if (port?.isOpen) await new Promise<void>((resolve, reject) => port.close(error => error ? reject(error) : resolve()));
  }

  async send(command: HardwareCommand) {
    if (!this.port?.isOpen) throw new Error("Porta serial não está aberta.");
    const duration = typeof command.payload?.durationMs === "number" ? Math.max(0, Math.round(command.payload.durationMs)) : 0;
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => this.settle(command.key, new Error("Arduino não confirmou o comando.")), 2_200);
      this.pending.set(command.key, { resolve, reject, timeout });
      this.port!.write(`${command.key}|${command.type}|${duration}\n`, error => { if (error) this.settle(command.key, error); });
    });
  }

  private handleData(chunk: string) {
    this.buffer += chunk;
    let separator = this.buffer.indexOf("\n");
    while (separator >= 0) {
      const line = this.buffer.slice(0, separator).trim();
      this.buffer = this.buffer.slice(separator + 1);
      const state = parseRelayStateLine(line);
      if (state) this.relays[state.relay] = state.state;
      else if (line.startsWith("ACK|")) this.settle(line.slice(4));
      else if (line.startsWith("NACK|")) { const [, key, reason = "comando recusado"] = line.split("|"); this.settle(key, new Error(reason)); }
      separator = this.buffer.indexOf("\n");
    }
  }

  private settle(key: string, error?: Error) { const pending = this.pending.get(key); if (!pending) return; clearTimeout(pending.timeout); this.pending.delete(key); if (error) pending.reject(error); else pending.resolve(); }
  private rejectAll(error: Error) { for (const key of Array.from(this.pending.keys())) this.settle(key, error); }
}

export function configureLocalSerialHardware() {
  const path = process.env.HARDWARE_SERIAL_PORT?.trim();
  if (!path) return false;
  const baudRate = Number(process.env.HARDWARE_SERIAL_BAUD_RATE ?? "115200");
  hardwareController.configure(new SerialHardwareAdapter({ path, baudRate: Number.isFinite(baudRate) && baudRate > 0 ? baudRate : 115200 }));
  return true;
}
