import { describe, expect, it } from "vitest";
import { chooseArduinoSerialPort, parseRelayStateLine, SerialHardwareAdapter } from "./serialHardwareAdapter";

describe("parseRelayStateLine", () => {
  it("carrega o driver serial usado pela ponte local", async () => {
    const { SerialPort } = await import("serialport");
    expect(typeof SerialPort).toBe("function");
  });

  it("interpreta os estados enviados pelo firmware dos dois relés", () => {
    expect(parseRelayStateLine("STATE|LED|ON")).toEqual({ relay: "led", state: "ON" });
    expect(parseRelayStateLine("STATE|SIREN|OFF")).toEqual({ relay: "siren", state: "OFF" });
  });

  it("mantém o último estado confirmado pelo Arduino", () => {
    const adapter = new SerialHardwareAdapter({ path: "/dev/ttyACM0", baudRate: 115200 });
    (adapter as unknown as { handleData: (data: string) => void }).handleData("STATE|LED|ON\nSTATE|SIREN|OFF\n");
    expect(adapter.getRelayStates()).toEqual({ led: "ON", siren: "OFF" });
  });

  it("descarta mensagens que não representam estado de relé", () => {
    expect(parseRelayStateLine("ACK|comando-1")).toBeUndefined();
    expect(parseRelayStateLine("STATE|FAN|ON")).toBeUndefined();
  });

  it("encontra automaticamente uma porta Arduino compatível", () => {
    expect(chooseArduinoSerialPort([{ path: "/dev/ttyS0" }, { path: "/dev/ttyACM0", manufacturer: "Arduino LLC" }])).toBe("/dev/ttyACM0");
    expect(chooseArduinoSerialPort([{ path: "COM4" }])).toBe("COM4");
  });
});
