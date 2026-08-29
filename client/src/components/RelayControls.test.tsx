// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RelayControls from "./RelayControls";

const mocks = vi.hoisted(() => ({
  status: { hardware: { state: "OFFLINE", relays: { led: "UNKNOWN", siren: "UNKNOWN" } } },
  invalidate: vi.fn(),
  ledMutate: vi.fn(),
  sirenMutate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    connectivity: {
      status: { useQuery: () => ({ data: mocks.status }) },
      setLedRelay: { useMutation: (options: { onSuccess: (value: unknown) => void }) => ({ isPending: false, mutate: (input: unknown) => { mocks.ledMutate(input); options.onSuccess({ accepted: { accepted: true } }); } }) },
      setSirenRelay: { useMutation: (options: { onSuccess: (value: unknown) => void }) => ({ isPending: false, mutate: (input: unknown) => { mocks.sirenMutate(input); options.onSuccess({ accepted: { accepted: true } }); } }) },
    },
    useUtils: () => ({ connectivity: { status: { invalidate: mocks.invalidate } } }),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("RelayControls", () => {
  beforeEach(() => { mocks.status = { hardware: { state: "OFFLINE", relays: { led: "UNKNOWN", siren: "UNKNOWN" } } }; mocks.invalidate.mockReset(); mocks.ledMutate.mockReset(); mocks.sirenMutate.mockReset(); });
  afterEach(cleanup);

  it("mostra os dois relés e bloqueia comandos enquanto o controlador está offline", () => {
    render(<RelayControls />);
    expect(screen.getByText("Controle dos relés")).toBeTruthy();
    expect(screen.getByText("Relé da fita LED")).toBeTruthy();
    expect(screen.getByText("Relé da sirene")).toBeTruthy();
    expect(screen.getByText("CONTROLADOR OFFLINE")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ligar fita" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Tocar duração configurada" }).hasAttribute("disabled")).toBe(true);
  });

  it("envia comandos manuais e reflete o estado atualizado retornado pela ponte", () => {
    mocks.status = { hardware: { state: "ONLINE", relays: { led: "OFF", siren: "OFF" } } };
    const view = render(<RelayControls />);
    fireEvent.click(screen.getByRole("button", { name: "Ligar fita" }));
    fireEvent.click(screen.getByRole("button", { name: "Tocar duração configurada" }));
    expect(mocks.ledMutate).toHaveBeenCalledWith({ enabled: true });
    expect(mocks.sirenMutate).toHaveBeenCalledWith({ enabled: true });
    expect(mocks.invalidate).toHaveBeenCalledTimes(2);

    mocks.status = { hardware: { state: "ONLINE", relays: { led: "ON", siren: "ON" } } };
    view.rerender(<RelayControls />);
    expect(screen.getByRole("button", { name: "Desligar fita" })).toBeTruthy();
    expect(screen.getAllByText("LIGADO")).toHaveLength(2);
  });
});
