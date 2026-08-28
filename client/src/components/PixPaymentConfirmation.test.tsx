// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PixPaymentConfirmation from "./PixPaymentConfirmation";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  invalidate: vi.fn(),
  deferConfirmation: false,
}));

vi.mock("@/lib/trpc", async () => {
  const { useState } = await vi.importActual<typeof import("react")>("react");
  return {
    trpc: {
      operations: {
        pendingPixPayments: {
          useQuery: () => ({
            isLoading: false,
            data: [{
              id: 91,
              ticket: 24,
              total: "35.00",
              createdAt: new Date("2026-08-27T15:40:00Z"),
              items: [
                { id: 1, orderId: 91, productName: "Cachorro-quente completo", quantity: 2, unitPrice: "15.00", subtotal: "30.00" },
                { id: 2, orderId: 91, productName: "Suco", quantity: 1, unitPrice: "5.00", subtotal: "5.00" },
              ],
            }],
          }),
        },
        confirmPixPayment: {
          useMutation: () => {
            const [isPending, setIsPending] = useState(false);
            return {
              isPending,
              mutate: (input: unknown, options?: { onSuccess?: (value: { alreadyConfirmed: boolean; order: { ticket: number; pixConfirmedAt: Date } }) => void; onSettled?: () => void }) => {
                mocks.confirm(input);
                setIsPending(true);
                if (mocks.deferConfirmation) return;
                options?.onSuccess?.({ alreadyConfirmed: false, order: { ticket: 24, pixConfirmedAt: new Date("2026-08-27T15:45:00Z") } });
                setIsPending(false);
                options?.onSettled?.();
              },
            };
          },
        },
      },
      useUtils: () => ({ operations: { pendingPixPayments: { invalidate: mocks.invalidate }, snapshot: { invalidate: mocks.invalidate } } }),
    },
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function openPendingPixModal() {
  fireEvent.click(screen.getByRole("button", { name: "Confirmar PIX (1)" }));
}

function confirmOrder() {
  fireEvent.click(screen.getByRole("button", { name: /Confirmar\s+R\$\s*35,00/ }));
}

describe("PixPaymentConfirmation", () => {
  beforeEach(() => {
    mocks.confirm.mockReset();
    mocks.invalidate.mockReset();
    mocks.deferConfirmation = false;
  });
  afterEach(cleanup);

  it("mostra produtos, quantidades, subtotais e ações de comprovante após confirmar", () => {
    render(<PixPaymentConfirmation />);
    openPendingPixModal();
    expect(screen.getByText("Pedido #24")).toBeTruthy();
    expect(screen.getByText("Cachorro-quente completo")).toBeTruthy();
    expect(screen.getByText("Suco")).toBeTruthy();
    expect(screen.getByText("2×")).toBeTruthy();
    expect(screen.getByText("1×")).toBeTruthy();
    expect(screen.getAllByText(/R\$\s*35,00/).length).toBeGreaterThan(0);

    confirmOrder();
    expect(mocks.confirm).toHaveBeenCalledWith({ orderId: 91 });
    expect(mocks.invalidate).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Pagamento confirmado")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Imprimir comprovante" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Baixar comprovante" })).toBeTruthy();
  });

  it("exibe a animação e bloqueia o botão enquanto a transação está pendente", () => {
    mocks.deferConfirmation = true;
    render(<PixPaymentConfirmation />);
    openPendingPixModal();
    confirmOrder();
    const button = screen.getByRole("button", { name: "Confirmando pagamento…" });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("aciona impressão e download após criar o comprovante", () => {
    const print = vi.fn();
    const write = vi.fn();
    const popup = { document: { write, close: vi.fn() }, focus: vi.fn(), print };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    const createObjectUrl = vi.fn().mockReturnValue("blob:receipt");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<PixPaymentConfirmation />);
    openPendingPixModal();
    confirmOrder();
    fireEvent.click(screen.getByRole("button", { name: "Imprimir comprovante" }));
    fireEvent.click(screen.getByRole("button", { name: "Baixar comprovante" }));

    expect(open).toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining("Comprovante de pagamento PIX"));
    expect(print).toHaveBeenCalled();
    expect(createObjectUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});
