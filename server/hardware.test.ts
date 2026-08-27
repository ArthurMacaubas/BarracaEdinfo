import { describe, expect, it } from "vitest";
import { HardwareController, type HardwareAdapter } from "./hardware";

describe("HardwareController", () => {
  it("bloqueia comandos idempotentes repetidos", () => {
    const controller = new HardwareController();
    const first = controller.triggerAlert("pedido-22", 900);
    const duplicate = controller.triggerAlert("pedido-22", 900);
    expect(first.accepted).toBe(true);
    expect(duplicate).toEqual({ accepted: false, reason: "DUPLICATE" });
  });

  it("envia comandos quando um adaptador conectado está disponível", async () => {
    const sent: string[] = [];
    const adapter: HardwareAdapter = {
      connect: async () => undefined,
      disconnect: async () => undefined,
      send: async command => { sent.push(command.type); },
    };
    const controller = new HardwareController();
    controller.configure(adapter);
    await controller.connect();
    controller.turnLedOn("led-1", 500);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(sent).toEqual(["LED_ON"]);
    expect(controller.getSnapshot().state).toBe("ONLINE");
    expect(controller.getSnapshot().relays.led).toBe("ON");
  });

  it("expõe os estados separados de fita LED e sirene após confirmações", async () => {
    const sent: string[] = [];
    const adapter: HardwareAdapter = { connect: async () => undefined, disconnect: async () => undefined, send: async command => { sent.push(command.type); } };
    const controller = new HardwareController();
    controller.configure(adapter);
    await controller.connect();
    controller.turnLedOn("led-manual");
    controller.turnSirenOn("sirene-manual", 1_000);
    await new Promise(resolve => setTimeout(resolve, 25));

    expect(sent).toEqual(["LED_ON", "SIREN_ON"]);
    expect(controller.getSnapshot().relays).toEqual({ led: "ON", siren: "ON" });
    controller.turnLedOff("led-manual-off");
    controller.turnSirenOff("sirene-manual-off");
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(controller.getSnapshot().relays).toEqual({ led: "OFF", siren: "OFF" });
  });
});
